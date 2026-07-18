import type { ReactNode } from "react";
import { Link } from "react-router";

interface DashboardPanelProps {
  title: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
}

function DashboardPanel({
  title,
  actionLabel = "Voir tout",
  actionTo,
  onAction,
  children,
  className = "",
}: DashboardPanelProps) {
  return (
    <section className={`dashboard-panel ${className}`.trim()}>
      <header className="dashboard-panel__header">
        <h2>{title}</h2>

        {actionTo ? (
          <Link
            className="dashboard-panel__action"
            to={actionTo}
          >
            {actionLabel}
          </Link>
        ) : onAction ? (
          <button
            type="button"
            className="dashboard-panel__action"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        ) : null}
      </header>

      <div className="dashboard-panel__content">
        {children}
      </div>
    </section>
  );
}

export default DashboardPanel;