import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = '削除',
  cancelLabel = 'キャンセル',
  danger = true,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content glass-overlay" style={{ width: 400, padding: 0 }}>
          <div className="dialog-header">
            <Dialog.Title
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-md)',
                  background: danger ? 'rgba(255, 71, 87, 0.12)' : 'var(--accent-subtle)',
                }}
              >
                <AlertTriangle
                  size={14}
                  style={{ color: danger ? 'var(--accent-danger)' : 'var(--accent-primary)' }}
                />
              </div>
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="dialog-close-btn">
                <X size={15} />
              </button>
            </Dialog.Close>
          </div>

          <div className="dialog-body">
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                whiteSpace: 'pre-line',
              }}
            >
              {message}
            </p>
          </div>

          <div className="dialog-footer">
            <Dialog.Close asChild>
              <button type="button" className="btn btn-ghost">
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              type="button"
              className="btn"
              style={{
                background: danger ? 'var(--accent-danger)' : 'var(--accent-primary)',
                color: 'var(--text-on-accent)',
              }}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
