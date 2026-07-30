import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div className={`card p-4 sm:p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}
