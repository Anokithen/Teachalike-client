'use client';

import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, useState } from 'react';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
}

export function Input({ label, error, id, type = 'text', className = '', ...props }: InputProps) {
  const inputId = id || props.name;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const controlClass = type === 'date' ? 'input-date' : type === 'file' ? 'input-file' : '';

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={isPassword && showPassword ? 'text' : type}
          className={`input ${controlClass} ${isPassword ? 'pr-16' : ''} ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''} ${className}`}
          aria-invalid={!!error}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute inset-y-0 right-2 my-auto inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-muted transition hover:bg-brand-400/10 hover:text-brand-600 focus-visible:text-brand-600"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-controls={inputId}
            aria-pressed={showPassword}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <Eye className="h-4 w-4" aria-hidden="true" />
            ) : (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{showPassword ? 'Hide' : 'Show'}</span>
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string | null;
  children?: ReactNode;
}

export function Select({ label, error, id, className = '', children, ...props }: SelectProps) {
  const inputId = id || props.name;
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={inputId}
          className={`input select-input ${error ? 'border-danger' : ''} ${className}`}
          aria-invalid={!!error}
          {...props}
        >
          {children}
        </select>
        <span className="select-chevron" aria-hidden="true">
          <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
        </span>
      </div>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
}

export function Textarea({ label, error, id, className = '', ...props }: TextareaProps) {
  const inputId = id || props.name;
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`input min-h-[100px] ${error ? 'border-danger' : ''} ${className}`}
        aria-invalid={!!error}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
