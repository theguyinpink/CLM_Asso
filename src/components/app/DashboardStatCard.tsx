import type { LucideIcon } from "lucide-react";

import type { DashboardTone } from "../../types/database";

interface DashboardStatCardProps {
  label: string;
  value: string | number;
  detail: string;
  tone: DashboardTone;
  icon: LucideIcon;
}

function DashboardStatCard({
  label,
  value,
  detail,
  tone,
  icon: Icon,
}: DashboardStatCardProps) {
  return (
    <article className={`dashboard-stat dashboard-tone-${tone}`}>
      <div className="dashboard-stat__icon">
        <Icon size={25} strokeWidth={2.1} />
      </div>

      <div className="dashboard-stat__content">
        <strong>{value}</strong>
        <span>{label}</span>
        <small>{detail}</small>
      </div>
    </article>
  );
}

export default DashboardStatCard;