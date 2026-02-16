'use client';

import { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  children: ReactNode;
}

export function Modal({ open, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-wood-900 border border-wood-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
