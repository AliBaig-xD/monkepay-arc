type Props = { eyebrow: string; title: React.ReactNode; lead?: React.ReactNode; center?: boolean; className?: string };

export function SectionHead({ eyebrow, title, lead, center, className = "" }: Props) {
  return (
    <div className={`${center ? "text-center mx-auto" : ""} max-w-[720px] mb-[28px] ${className}`}>
      <p className="eyebrow m-0 mb-[10px]">{eyebrow}</p>
      <h2 className="h-section m-0">{title}</h2>
      {lead && <p className="lead m-0 mt-[12px]">{lead}</p>}
    </div>
  );
}
