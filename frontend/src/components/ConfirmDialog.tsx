"use client";

type Props = {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
};

export default function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = 'Remover' }: Props) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal"
        style={{ width: 'min(100%, 360px)', padding: '28px 28px 24px' }}
        onClick={e => e.stopPropagation()}
      >
        <p style={{ margin: '0 0 24px', fontSize: 15, color: 'var(--text)', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
