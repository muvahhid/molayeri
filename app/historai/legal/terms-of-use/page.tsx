import {
  HISTORAI_TERMS_EN,
  HISTORAI_TERMS_TR,
} from '@/lib/historai-legal-documents'
import { HistoraiLegalArticle, HistoraiLegalShell } from '../_components/HistoraiLegalShell'

export default function HistoraiTermsPage() {
  return (
    <HistoraiLegalShell
      eyebrow="Terms of Use"
      title="HistorAI terms of use"
      subtitle="These terms define account use, AI-content disclaimers, acceptable use, subscriptions, and the core liability framework for the app."
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <HistoraiLegalArticle doc={HISTORAI_TERMS_TR} />
        <HistoraiLegalArticle doc={HISTORAI_TERMS_EN} />
      </div>
    </HistoraiLegalShell>
  )
}
