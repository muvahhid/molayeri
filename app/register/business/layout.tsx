export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#eef0f4] text-slate-600 font-sans selection:bg-blue-200">
      {children}
    </div>
  )
}
