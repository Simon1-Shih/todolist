import { CheckCircle2, Info, X } from 'lucide-react';

export interface GlobalDialogState {
  kind: 'confirm' | 'notice';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface GlobalDialogProps {
  dialog: GlobalDialogState | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function GlobalDialog({ dialog, onConfirm, onCancel }: GlobalDialogProps) {
  if (!dialog) return null;

  const isConfirm = dialog.kind === 'confirm';

  return (
    <div className="fixed left-1/2 top-6 z-[80] w-[min(520px,calc(100vw-32px))] -translate-x-1/2">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start gap-3 px-5 py-4">
          <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700">
            {isConfirm ? <Info className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-slate-950">{dialog.title}</h3>
            <p className="mt-1 text-[14px] leading-5 text-slate-600">{dialog.message}</p>
          </div>
          {!isConfirm && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {isConfirm && (
          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-4 py-2 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-100"
            >
              {dialog.cancelText || 'Cancel'}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-xl bg-slate-950 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-slate-700"
            >
              {dialog.confirmText || 'Confirm'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
