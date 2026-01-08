export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0B1220] text-white flex items-center justify-center">
      <div className="text-center px-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs text-white/70 ring-1 ring-white/10">
          <span className="h-2 w-2 rounded-full bg-[#9BE15D]" />
          Yakında
        </div>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight">
          MolaYeri
        </h1>

        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">
          Yeni nesil yol üstü keşif ve kampanya platformu.
          <br />
          Şu anda hazırlanıyor.
        </p>

        <div className="mt-6 text-xs text-white/40">
          © {new Date().getFullYear()} MolaYeri
        </div>
      </div>
    </main>
  );
}
