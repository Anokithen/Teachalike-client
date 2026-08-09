'use client';

import { useEffect, useState } from 'react';
import { Check, Settings, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

const NOTICE_VERSION_KEY = 'teachalike_android_pinning_notice_v1';

function isInstalledAndroidPwa() {
  if (!/Android/i.test(window.navigator.userAgent)) return false;
  return (
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

export function AndroidAppPinningNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(
      isInstalledAndroidPwa() &&
      window.localStorage.getItem(NOTICE_VERSION_KEY) !== 'acknowledged',
    );
  }, []);

  function acknowledge() {
    window.localStorage.setItem(NOTICE_VERSION_KEY, 'acknowledged');
    setOpen(false);
  }

  return (
    <Modal
      open={open}
      onClose={() => undefined}
      dismissible={false}
      title="Protect child mode with App Pinning"
      footer={
        <Button onClick={acknowledge} className="w-full sm:w-auto">
          <Check className="h-4 w-4" aria-hidden="true" />
          OK, continue to TeachAlike
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl bg-brand-400/10 p-3">
          <ShieldCheck
            className="mt-0.5 h-5 w-5 shrink-0 text-brand-600"
            aria-hidden="true"
          />
          <p className="text-muted">
            Android App Pinning keeps TeachAlike visible until a parent unpins
            it with the device PIN, pattern, or password.
          </p>
        </div>

        <ol className="space-y-3">
          <li className="flex gap-3">
            <span className="icon-bubble h-8 w-8 shrink-0 text-sm font-bold text-brand-600">
              1
            </span>
            <div>
              <p className="font-semibold text-brand-900">
                Enable App Pinning once
              </p>
              <p className="mt-1 text-muted">
                Open Android Settings, then Security or Security &amp; privacy,
                More security settings, and App pinning. Turn it on.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="icon-bubble h-8 w-8 shrink-0 text-sm font-bold text-brand-600">
              2
            </span>
            <div>
              <p className="font-semibold text-brand-900">
                Require the device password
              </p>
              <p className="mt-1 text-muted">
                Enable the option that asks for the device PIN, pattern, or
                password before unpinning.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="icon-bubble h-8 w-8 shrink-0 text-sm font-bold text-brand-600">
              3
            </span>
            <div>
              <p className="font-semibold text-brand-900">Pin TeachAlike</p>
              <p className="mt-1 text-muted">
                Return to TeachAlike, open Recent Apps, tap the TeachAlike icon
                above its preview, then choose Pin or Pin this app.
              </p>
            </div>
          </li>
        </ol>

        <div className="flex items-start gap-2 border-t border-border/70 pt-4 text-xs leading-5 text-muted">
          <Settings className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Settings names can differ by phone manufacturer. TeachAlike can
            show these instructions, but only Android can activate App Pinning.
          </p>
        </div>
      </div>
    </Modal>
  );
}
