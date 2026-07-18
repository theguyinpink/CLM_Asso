import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

import { useToast } from "../../../hooks/useToast";

const icons = {
  success: CheckCircle2,
  error: CircleAlert,
  info: Info,
};

function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="clm-toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const Icon = icons[toast.tone];
        return (
          <article className={`clm-toast clm-toast--${toast.tone}`} key={toast.id}>
            <Icon size={19} />
            <p>{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Fermer la notification"
            >
              <X size={16} />
            </button>
          </article>
        );
      })}
    </div>
  );
}

export default ToastViewport;
