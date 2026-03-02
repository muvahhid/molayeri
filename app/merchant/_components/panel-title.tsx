type PanelTitleProps = {
  title: string
  eyebrow?: string
  className?: string
  titleClassName?: string
  eyebrowClassName?: string
}

export function PanelTitle({
  title,
  eyebrow = 'Sistem',
  className = '',
  titleClassName = '',
  eyebrowClassName = '',
}: PanelTitleProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
      <div className="flex min-w-0 flex-col">
        <span className={`text-[9px] uppercase tracking-[0.2em] text-[#64748b] ${eyebrowClassName}`}>
          {eyebrow}
        </span>
        <h1 className={`text-sm font-mono uppercase tracking-widest text-[#e2e8f0] truncate ${titleClassName}`}>
          {title}
        </h1>
      </div>
    </div>
  )
}
