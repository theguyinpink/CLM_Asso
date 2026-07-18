import type { LucideIcon } from "lucide-react";
import { AlertTriangle, LoaderCircle } from "lucide-react";

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Chargement des données…" }: LoadingStateProps) {
  return (
    <div className="data-state">
      <LoaderCircle className="data-state__spinner" size={30} />
      <strong>{label}</strong>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="data-state data-state--error">
      <AlertTriangle size={30} />
      <strong>Une erreur est survenue</strong>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="data-button data-button--secondary" onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="data-state">
      <span className="data-state__icon"><Icon size={30} /></span>
      <strong>{title}</strong>
      <p>{description}</p>
      {actionLabel && onAction && (
        <button type="button" className="data-button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
