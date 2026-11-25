import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1D0816]/60"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-white border border-[#EAE1E6] rounded-xl p-6 shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-red-50 text-red-700 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#1C1F1E]">{title}</h3>
            <p className="text-sm text-[#646B67] mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[#3D4340] bg-[#FAF8F9] hover:bg-[#EAE1E6] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              destructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#9B0B5E] hover:bg-[#7A084A]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
