"use client";

import { Fragment, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, children, className }: ModalProps) {
  if (!isOpen) return null;

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={cn(
            "relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl",
            "max-w-lg w-full max-h-[90vh] overflow-auto",
            "animate-in fade-in zoom-in-95 duration-200",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </Fragment>
  );
}

export function ModalHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("p-6 pb-4 border-b border-slate-800", className)}>
      {children}
    </div>
  );
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-6", className)}>{children}</div>;
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "p-6 pt-4 border-t border-slate-800 flex items-center justify-end gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}
