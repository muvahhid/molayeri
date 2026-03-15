import {
  HISTORAI_PRIVACY_POLICY_EN,
  HISTORAI_PRIVACY_POLICY_TR,
} from '@/lib/historai-legal-documents'
import { HistoraiLegalArticle, HistoraiLegalShell } from '../_components/HistoraiLegalShell'

export default function HistoraiPrivacyPolicyPage() {
  return (
    <HistoraiLegalShell
      eyebrow="Privacy Policy"
      title="HistorAI privacy policy"
      subtitle="Turkish and English are published together so store reviewers and end users can access the authoritative text without ambiguity."
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <HistoraiLegalArticle doc={HISTORAI_PRIVACY_POLICY_TR} />
        <HistoraiLegalArticle doc={HISTORAI_PRIVACY_POLICY_EN} />
      </div>
    </HistoraiLegalShell>
  )
}
