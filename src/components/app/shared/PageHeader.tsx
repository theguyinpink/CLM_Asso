import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

function PageHeader({ icon: Icon, title, description, actionLabel, onAction }: PageHeaderProps) {
  return (
    <header className="data-page-header">
      <div className="data-page-header__identity">
        <span className="data-page-header__icon"><Icon size={28} /></span>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      {actionLabel && onAction && (
        <button type="button" className="data-button" onClick={onAction}>
          <Plus size={18} />
          {actionLabel}
        </button>
      )}
    </header>
  );
}

export default PageHeader;
