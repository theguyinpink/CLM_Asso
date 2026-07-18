import type { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="data-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="data-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="data-modal__header">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export default Modal;
