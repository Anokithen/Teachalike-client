'use client';

import { ReactNode, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

let bodyScrollLockCount = 0;
let bodyOverflowBeforeFirstModal = '';
const openModalStack: symbol[] = [];

function isTopModal(modalId: symbol) {
  return openModalStack[openModalStack.length - 1] === modalId;
}

function lockBodyScroll() {
  if (bodyScrollLockCount === 0) {
    bodyOverflowBeforeFirstModal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  bodyScrollLockCount += 1;
}

function unlockBodyScroll() {
  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
  if (bodyScrollLockCount === 0) {
    document.body.style.overflow = bodyOverflowBeforeFirstModal;
  }
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  footer?: ReactNode;
  dismissible?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  dismissible = true,
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const modalInstanceId = useRef(Symbol('modal')).current;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    openModalStack.push(modalInstanceId);
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const onKey = (e: KeyboardEvent) => {
      if (!isTopModal(modalInstanceId)) return;
      if (e.key === 'Escape' && dismissible) {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    lockBodyScroll();
    window.addEventListener('keydown', onKey);
    const focusFrame = requestAnimationFrame(() => {
      if (!isTopModal(modalInstanceId)) return;
      const initialFocus =
        closeButtonRef.current ||
        dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
      initialFocus?.focus();
    });
    return () => {
      cancelAnimationFrame(focusFrame);
      unlockBodyScroll();
      window.removeEventListener('keydown', onKey);
      const stackIndex = openModalStack.lastIndexOf(modalInstanceId);
      if (stackIndex >= 0) openModalStack.splice(stackIndex, 1);
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    };
  }, [dismissible, modalInstanceId, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div
        className="absolute inset-0 bg-brand-900/40 backdrop-blur-sm motion-safe:animate-[modal-backdrop-in_.18s_ease-out]"
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        ref={dialogRef}
        className="modal-panel card relative flex max-h-[min(92dvh,44rem)] w-full max-w-md flex-col overflow-hidden rounded-b-none p-0 motion-safe:animate-[modal-card-in_.22s_cubic-bezier(.2,.8,.2,1)] sm:rounded-2xl"
      >
        {dismissible && (
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            className="absolute right-3 top-3 z-10 min-h-11 min-w-11 rounded-lg p-2 text-xl leading-none text-muted hover:bg-bg hover:text-brand-900"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
        {title && (
          <h2 id={titleId} className={`shrink-0 border-b border-border px-5 py-4 text-lg font-semibold text-brand-900 sm:px-6 ${dismissible ? 'pr-16' : ''}`}>
            {title}
          </h2>
        )}
        <div className="min-h-0 overflow-y-auto px-5 py-5 text-sm text-brand-900 sm:px-6">{children}</div>
        {footer && <div className="shrink-0 border-t border-border px-5 py-4 sm:px-6"><div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">{footer}</div></div>}
      </div>
    </div>
  );
}
