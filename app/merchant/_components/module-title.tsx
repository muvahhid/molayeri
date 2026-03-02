type ModuleTitleProps = {
  title: string
  className?: string
  titleClassName?: string
}

export function ModuleTitle({ title, className = '', titleClassName = '' }: ModuleTitleProps) {
  return (
    <div
      className={`inline-flex max-w-full items-center gap-2 rounded border border-[#2d313a] bg-[#0a0c10] px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${className}`}
    >
      <span className="h-2 w-2 rounded-full bg-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.6)]" aria-hidden />
      <h1
        className={`text-[24px] md:text-[30px] leading-none font-medium uppercase tracking-wide text-[#e2e8f0] ${titleClassName}`}
      >
        {title}
      </h1>
    </div>
  )
}
