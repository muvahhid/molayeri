import Link from 'next/link'
import { Lock, MapPin } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="landing-shell">
      <section className="landing-card">
        <div className="landing-badge">
          <MapPin size={30} />
        </div>

        <h1 className="landing-title">MolaYeri</h1>
        <p className="landing-subtitle">
          Modern yönetim deneyimi: işletme, içerik, kampanya ve iletişim akışlarını tek merkezde kontrol et.
        </p>

        <div className="landing-actions">
          <Link href="/login" className="landing-btn">
            <Lock size={16} />
            Sisteme Giriş
          </Link>
        </div>
      </section>
    </div>
  )
}
