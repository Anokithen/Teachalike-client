'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Download,
  MonitorDown,
  RefreshCw,
  Share2,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { usePwaInstall } from '@/components/pwa/PwaProvider';

export function PwaInstallCard() {
  const {
    isStandalone,
    canInstall,
    isInstalling,
    updateAvailable,
    install,
    applyUpdate,
  } = usePwaInstall();
  const [message, setMessage] = useState<string | null>(null);

  async function installApp() {
    setMessage(null);
    const outcome = await install();
    if (outcome === 'dismissed') {
      setMessage(
        'Installation was cancelled. You can try again here after a few days or use your browser menu.',
      );
    } else if (outcome === 'unavailable') {
      setMessage(
        'Automatic installation is not available in this browser. Follow the device instructions below.',
      );
    }
  }

  return (
    <Card className="mt-6 border-brand-400/30 bg-gradient-to-br from-cyan-50/70 to-violet-50/70">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white shadow-sm">
          <Download className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-brand-900">
            Install TeachAlike
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Open TeachAlike from your home screen or desktop in its own
            standalone app window.
          </p>
        </div>
      </div>

      {isStandalone && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          TeachAlike is running as an installed app.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {canInstall && !isStandalone && (
          <Button type="button" onClick={installApp} loading={isInstalling}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Install app
          </Button>
        )}
        {updateAvailable && (
          <Button type="button" variant="secondary" onClick={applyUpdate}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Update app
          </Button>
        )}
      </div>

      {message && (
        <p className="mt-3 text-sm text-muted" role="status">
          {message}
        </p>
      )}

      {!isStandalone && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <InstallInstruction
            icon={Smartphone}
            title="Android"
            text="In Chrome, open the menu and choose Install app or Add to Home screen."
          />
          <InstallInstruction
            icon={Share2}
            title="iPhone or iPad"
            text="In Safari, tap Share, choose Add to Home Screen, then tap Add."
          />
          <InstallInstruction
            icon={MonitorDown}
            title="Windows"
            text="In Chrome or Edge, select the install icon in the address bar or choose Install TeachAlike from the menu."
          />
          <InstallInstruction
            icon={MonitorDown}
            title="macOS"
            text="In Safari 17 or later, choose File then Add to Dock. Chrome also offers an install icon in the address bar."
          />
        </div>
      )}

      {/*
        A PWA cannot prevent the device Home button, app switching, closing,
        or force-stopping. Strong child-device locking requires Android App
        Pinning, iOS Guided Access, or managed kiosk mode.
      */}
      <p className="mt-5 border-t border-border/70 pt-4 text-xs leading-5 text-muted">
        For supervised child mode, use Android App Pinning, iOS Guided Access,
        or managed kiosk mode. A normal PWA cannot lock the device or block
        switching to another app.
      </p>
    </Card>
  );
}

function InstallInstruction({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Smartphone;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white/70 p-4">
      <div className="flex items-center gap-2 font-semibold text-brand-900">
        <Icon className="h-4 w-4 text-brand-600" aria-hidden="true" />
        {title}
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">{text}</p>
    </div>
  );
}
