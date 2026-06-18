import type { SubmissionEmailDraft, SubmissionPackage } from "@/lib/submission/types";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function generateSubmissionEmailDraft(pkg: SubmissionPackage, recruiterName = "Recruiter", recruiterNote?: string | null): SubmissionEmailDraft {
  const subject = `Candidate Submission: ${pkg.candidate.name} - ${pkg.job.title}`;
  const risks = pkg.riskDisclosure.hasRisks
    ? `<h3>Risk disclosure</h3><ul>${pkg.riskDisclosure.items.map((risk) => `<li><strong>${escapeHtml(risk.label)}</strong>: ${escapeHtml(risk.disclosure)} Mitigation: ${escapeHtml(risk.mitigation)}</li>`).join("")}</ul>`
    : "<p>No material submission risks were identified from available screening signals.</p>";
  const note = recruiterNote ?? pkg.recruiterNote;
  const htmlBody = `
<p>Hi ${escapeHtml(pkg.job.clientContactName ?? "Team")},</p>
<p>Please find the profile of <strong>${escapeHtml(pkg.candidate.name)}</strong> for <strong>${escapeHtml(pkg.job.title)}</strong>.</p>
<p>${escapeHtml(pkg.summary.oneLiner)}</p>
<h3>Why this candidate</h3>
<p>${escapeHtml(pkg.summary.whyThisCandidate)}</p>
<h3>Highlights</h3>
<ul>${pkg.summary.keyHighlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
<h3>Fit summary</h3>
<p>${escapeHtml(pkg.fitGapExplanation.summary)}</p>
${risks}
${note ? `<h3>Recruiter note</h3><p>${escapeHtml(note)}</p>` : ""}
<p>Regards,<br/>${escapeHtml(recruiterName)}<br/>${escapeHtml(pkg.companyProfile.brandName || pkg.companyProfile.name)}<br/>${escapeHtml(pkg.companyProfile.email)} | ${escapeHtml(pkg.companyProfile.phone)}</p>`.trim();

  return {
    subject,
    htmlBody,
    textBody: htmlBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    generatedAt: new Date().toISOString(),
    model: "deterministic-template-v1",
    metadata: { applicationId: pkg.applicationId, candidateId: pkg.candidateId, jobId: pkg.jobId },
  };
}

