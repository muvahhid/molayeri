type ModuleTitleProps = {
  title: string
  className?: string
  titleClassName?: string
}

export function ModuleTitle({ title, className = '', titleClassName = '' }: ModuleTitleProps) {
  return (
    <div
      className={`inline-flex max-w-full rounded-2xl p-1.5 bg-[#e8edf6] shadow-[inset_6px_6px_12px_rgba(148,163,184,0.24),inset_-6px_-6px_12px_rgba(255,255,255,0.92)] ${className}`}
    >
      <h1
        className={`px-5 py-2.5 rounded-xl text-[24px] md:text-[30px] leading-none font-bold text-slate-800 bg-[linear-gradient(145deg,#ffffff_0%,#f7faff_100%)] shadow-[0_12px_16px_-14px_rgba(15,23,42,0.62)] ${titleClassName}`}
      >
        {title}
      </h1>
    </div>
  )
}
