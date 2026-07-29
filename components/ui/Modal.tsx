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
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
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
        className="card relative max-h-[min(90vh,44rem)] w-full max-w-md overflow-y-auto rounded-b-none p-5 motion-safe:animate-[modal-card-in_.22s_cubic-bezier(.2,.8,.2,1)] sm:rounded-2xl sm:p-6"
      >
        {dismissible && (
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            className="absolute right-3 top-3 rounded-lg p-2 text-xl leading-none text-muted hover:bg-bg hover:text-brand-900"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
        {title && (
          <h2 id={titleId} className={`mb-3 text-lg font-semibold text-brand-900 ${dismissible ? 'pr-8' : ''}`}>
            {title}
          </h2>
        )}
        <div className="text-sm text-brand-900">{children}</div>
        {footer && <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">{footer}</div>}
      </div>
    </div>
  );
}
