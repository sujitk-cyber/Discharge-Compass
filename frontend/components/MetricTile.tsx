import { ReactNode } from "react";

export default function MetricTile({ label, value, footnote }: { label: string; value: ReactNode; footnote?: string }) {
  return (
    <div className="metric-tile">
      <span className="metric-label">{label}</span>
      <div className="metric-value">{value}</div>
      {footnote ? <span className="metric-footnote">{footnote}</span> : null}
    </div>
  );
}
