import { LucideIcon } from 'lucide-react';
import '../styles/stat-card.css';

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
}

export default function StatCard({
  icon: Icon,
  title,
  value,
  unit,
  subtitle,
}: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon size={32} />
      </div>
      <div className="stat-content">
        <p className="stat-title">{title}</p>
        <div className="stat-value">
          <span className="value">{value}</span>
          {unit && <span className="unit">{unit}</span>}
        </div>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}
