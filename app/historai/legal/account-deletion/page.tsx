import {
  HISTORAI_ACCOUNT_DELETION_EN,
  HISTORAI_ACCOUNT_DELETION_TR,
} from '@/lib/historai-legal-documents'
import { HistoraiLegalArticle, HistoraiLegalShell } from '../_components/HistoraiLegalShell'

export default function HistoraiAccountDeletionPage() {
  return (
    <HistoraiLegalShell
      eyebrow="Account Deletion"
      title="HistorAI account deletion"
      subtitle="This page is the public deletion support surface for app-store compliance and mirrors the in-app deletion flow."
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <HistoraiLegalArticle doc={HISTORAI_ACCOUNT_DELETION_TR} />
        <HistoraiLegalArticle doc={HISTORAI_ACCOUNT_DELETION_EN} />
      </div>
    </HistoraiLegalShell>
  )
}
