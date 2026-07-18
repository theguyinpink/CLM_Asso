import type { LucideIcon } from "lucide-react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  error?: string;
  icon?: LucideIcon;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  loading = false,
  error = "",
  icon: Icon = AlertTriangle,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="confirm-dialog-backdrop"
      role="presentation"
      onMouseDown={() => {
        if (!loading) {
          onCancel();
        }
      }}
    >
      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <button
          type="button"
          className="confirm-dialog__close"
          onClick={onCancel}
          disabled={loading}
          aria-label="Fermer"
        >
          <X size={19} />
        </button>

        <div className="confirm-dialog__icon">
          <Icon size={27} />
        </div>

        <div className="confirm-dialog__content">
          <h2 id="confirm-dialog-title">
            {title}
          </h2>

          <p id="confirm-dialog-description">
            {description}
          </p>
        </div>

        {error && (
          <div className="confirm-dialog__error">
            {error}
          </div>
        )}

        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="data-button data-button--secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className="data-button data-button--danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? "Suppression…"
              : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export default ConfirmDialog;