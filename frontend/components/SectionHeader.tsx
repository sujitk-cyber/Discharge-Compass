import { ReactNode } from "react";

export default function SectionHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}
