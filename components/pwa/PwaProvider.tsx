'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

interface PwaContextValue {
  isStandalone: boolean;
  canInstall: boolean;
  isInstalling: boolean;
  updateAvailable: boolean;
  install: () => Promise<InstallOutcome>;
  applyUpdate: () => void;
}

const INSTALL_DISMISSED_UNTIL_KEY = 'teachalike_pwa_install_dismissed_until';
const INSTALL_DISMISSAL_MS = 7 * 24 * 60 * 60 * 1000;
const PwaContext = createContext<PwaContextValue | null>(null);

function getStandaloneMode() {
  if (typeof window === 'undefined') return false;
  const iosNavigator = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    iosNavigator.standalone === true
  );
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const reloadForUpdate = useRef(false);

  useEffect(() => {
    const standaloneMode = window.matchMedia('(display-mode: standalone)');
    const fullscreenMode = window.matchMedia('(display-mode: fullscreen)');
    const updateStandaloneMode = () => setIsStandalone(getStandaloneMode());
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const dismissedUntil = Number(
        window.localStorage.getItem(INSTALL_DISMISSED_UNTIL_KEY) || 0,
      );
      if (dismissedUntil > Date.now() || getStandaloneMode()) return;
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      window.localStorage.removeItem(INSTALL_DISMISSED_UNTIL_KEY);
      setInstallPrompt(null);
      // Installation completes in the current browser tab. It becomes
      // standalone only after the user launches the installed app.
      setIsStandalone(getStandaloneMode());
    };

    updateStandaloneMode();
    standaloneMode.addEventListener('change', updateStandaloneMode);
    fullscreenMode.addEventListener('change', updateStandaloneMode);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      standaloneMode.removeEventListener('change', updateStandaloneMode);
      fullscreenMode.removeEventListener('change', updateStandaloneMode);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    let disposed = false;
    const onControllerChange = () => {
      if (reloadForUpdate.current) {
        window.location.reload();
      }
    };
    const watchRegistration = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(registration.waiting);
      }

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (
            worker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            setWaitingWorker(worker);
          }
        });
      });
    };
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
        if (disposed) return;
        watchRegistration(registration);
        await registration.update();
      } catch (error) {
        console.error('TeachAlike service worker registration failed.', error);
      }
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      onControllerChange,
    );
    if (document.readyState === 'complete') {
      void register();
    } else {
      window.addEventListener('load', register, { once: true });
    }

    return () => {
      disposed = true;
      window.removeEventListener('load', register);
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        onControllerChange,
      );
    };
  }, []);

  const install = useCallback(async (): Promise<InstallOutcome> => {
    if (!installPrompt || getStandaloneMode()) return 'unavailable';
    setIsInstalling(true);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (choice.outcome === 'dismissed') {
        window.localStorage.setItem(
          INSTALL_DISMISSED_UNTIL_KEY,
          String(Date.now() + INSTALL_DISMISSAL_MS),
        );
      } else {
        window.localStorage.removeItem(INSTALL_DISMISSED_UNTIL_KEY);
      }
      return choice.outcome;
    } catch (error) {
      console.error('TeachAlike installation prompt failed.', error);
      setInstallPrompt(null);
      return 'unavailable';
    } finally {
      setIsInstalling(false);
    }
  }, [installPrompt]);

  const applyUpdate = useCallback(() => {
    if (!waitingWorker) return;
    reloadForUpdate.current = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }, [waitingWorker]);

  const value = useMemo<PwaContextValue>(
    () => ({
      isStandalone,
      canInstall: Boolean(installPrompt) && !isStandalone,
      isInstalling,
      updateAvailable: Boolean(waitingWorker),
      install,
      applyUpdate,
    }),
    [
      applyUpdate,
      install,
      installPrompt,
      isInstalling,
      isStandalone,
      waitingWorker,
    ],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwaInstall() {
  const context = useContext(PwaContext);
  if (!context) {
    throw new Error('usePwaInstall must be used inside PwaProvider.');
  }
  return context;
}

export function useStandaloneMode() {
  return usePwaInstall().isStandalone;
}
