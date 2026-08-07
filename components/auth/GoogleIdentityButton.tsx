'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { GOOGLE_AUTH_CLIENT_ID } from '@/lib/config';
import { Alert } from '@/components/ui/Alert';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            ux_mode?: 'popup' | 'redirect';
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string | boolean | number>) => void;
        };
      };
    };
  }
}

export function GoogleIdentityButton({
  onCredential,
  disabled,
}: {
  onCredential: (credential: string) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || disabled) return;
    if (!GOOGLE_AUTH_CLIENT_ID) {
      setError('Google sign-in is not configured for this environment.');
      return;
    }
    const gis = window.google?.accounts?.id;
    if (!gis) return;
    containerRef.current.innerHTML = '';
    gis.initialize({
      client_id: GOOGLE_AUTH_CLIENT_ID,
      ux_mode: 'popup',
      callback: (response) => {
        if (response.credential) onCredential(response.credential);
        else setError('Google did not return a usable sign-in credential.');
      },
    });
    gis.renderButton(containerRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      logo_alignment: 'left',
      width: 320,
    });
  }, [disabled, onCredential, scriptReady]);

  return (
    <div className="space-y-3">
      <Script src="https://accounts.google.com/gsi/client" async defer onLoad={() => setScriptReady(true)} />
      <div className={disabled ? 'pointer-events-none opacity-60' : ''} ref={containerRef} aria-label="Continue with Google" />
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
