'use client';

import { useCallback, useEffect, useRef } from 'react';
import { API_BASE_URL } from '@/lib/config';
import type { LiveReadingConnectionState, LiveReadingProgress } from '@/lib/types';

interface LiveReadingCallbacks {
  onProgress: (progress: LiveReadingProgress) => void;
  onStateChange: (state: LiveReadingConnectionState, language?: 'en' | 'ta') => void;
  onError: (message: string, recoverable: boolean) => void;
}

interface LiveReadingStart {
  stream: MediaStream;
  ticket: string;
  sessionId: string;
  paragraphIndex: number;
}

function pcm16(input: Float32Array, sourceRate: number): ArrayBuffer {
  const ratio = sourceRate / 16000;
  const length = Math.max(1, Math.floor(input.length / ratio));
  const output = new Int16Array(length);
  for (let index = 0; index < length; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.max(start + 1, Math.floor((index + 1) * ratio));
    let total = 0;
    for (let source = start; source < end && source < input.length; source += 1) total += input[source];
    const sample = Math.max(-1, Math.min(1, total / Math.max(1, end - start)));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output.buffer;
}

export function useLiveReadingTransport(callbacks: LiveReadingCallbacks) {
  const callbacksRef = useRef(callbacks);
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const attemptRef = useRef(0);
  const sequenceRef = useRef(0);
  callbacksRef.current = callbacks;

  const stop = useCallback(() => {
    attemptRef.current += 1;
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'stop' }));
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    gainRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current = null;
    gainRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    if (socket) window.setTimeout(() => socket.close(), 200);
    socketRef.current = null;
  }, []);

  const start = useCallback(async ({ stream, ticket, sessionId, paragraphIndex }: LiveReadingStart) => {
    stop();
    const attempt = attemptRef.current;
    sequenceRef.current = 0;
    callbacksRef.current.onStateChange('connecting');
    const socketUrl = new URL(`/api/reading-sessions/${sessionId}/live-reading`, API_BASE_URL);
    socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(socketUrl);
    socket.binaryType = 'arraybuffer';
    socketRef.current = socket;

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Live speech connection timed out.')), 10000);
      socket.onopen = () => {
        window.clearTimeout(timeout);
        socket.send(JSON.stringify({ type: 'start', ticket, paragraphIndex }));
        resolve();
      };
      socket.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('Live speech connection is unavailable.'));
      };
    });
    if (attempt !== attemptRef.current) return;

    socket.onmessage = (event) => {
      if (attempt !== attemptRef.current || typeof event.data !== 'string') return;
      try {
        const message = JSON.parse(event.data) as Record<string, unknown>;
        if (message.type === 'asr_connected') {
          callbacksRef.current.onStateChange('connected', message.language as 'en' | 'ta');
        } else if (message.type === 'reading_progress') {
          const progress = message as unknown as LiveReadingProgress;
          if (progress.sequence <= sequenceRef.current) return;
          sequenceRef.current = progress.sequence;
          callbacksRef.current.onProgress(progress);
        } else if (message.type === 'asr_error') {
          callbacksRef.current.onStateChange('delayed');
          callbacksRef.current.onError(String(message.message || 'Speech recognition is temporarily delayed.'), Boolean(message.recoverable));
        }
      } catch {
        // Ignore malformed socket messages; final batch recognition remains available.
      }
    };
    socket.onclose = () => {
      if (attempt === attemptRef.current) callbacksRef.current.onStateChange('closed');
    };

    const AudioContextClass = window.AudioContext;
    const audioContext = new AudioContextClass();
    if (audioContext.state === 'suspended') await audioContext.resume();
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const gain = audioContext.createGain();
    gain.gain.value = 0;
    processor.onaudioprocess = (event) => {
      if (attempt !== attemptRef.current || socket.readyState !== WebSocket.OPEN) return;
      socket.send(pcm16(event.inputBuffer.getChannelData(0), audioContext.sampleRate));
    };
    source.connect(processor);
    processor.connect(gain);
    gain.connect(audioContext.destination);
    audioContextRef.current = audioContext;
    sourceRef.current = source;
    processorRef.current = processor;
    gainRef.current = gain;
  }, [stop]);

  useEffect(() => stop, [stop]);
  return { start, stop };
}
