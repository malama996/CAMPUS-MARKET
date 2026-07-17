"use client";

import { useEffect, useRef } from 'react';

/**
 * Reusable confirmation modal — replaces window.confirm() with something
 * styled to match the app instead of the browser's native popup.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={confirmOpen}
 *     title="Delete this listing?"
 *     description="This removes it from the market. You can restore it later."
 *     confirmLabel="Remove"
 *     onConfirm={handleRemove}
 *     onCancel={() => setConfirmOpen(false)}
 *   />
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}) {
  const confirmBtnRef = useRef(null);

  // Focus the confirm button when the dialog opens, and let Escape cancel.
  useEffect(() => {
    if (!open) return;
    confirmBtnRef.current?.focus();

    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-lg p-6 animate-in fade-in zoom-in-95 duration-150">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 inline-flex items-center justify-center rounded-md text-sm font-medium border border-input hover:bg-muted transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={
              destructive
                ? "h-9 px-4 inline-flex items-center justify-center rounded-md text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                : "h-9 px-4 inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}