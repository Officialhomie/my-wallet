// Shared Modal Component

import { ReactNode } from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          {title && (
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4 sm:mb-6">{title}</h3>
          )}

          <div className="mb-4 sm:mb-6">{children}</div>

          {footer || (
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-0 pt-4 border-t border-border">
              <Button onClick={onClose} variant="secondary" className="w-full sm:w-auto">Close</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
