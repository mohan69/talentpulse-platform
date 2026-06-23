import { notFound } from "next/navigation";
import { tenantPrisma } from "@/lib/repositories";
import { computeApplicationIntelligence, formatCurrency, type RevenueApplication } from "@/lib/phase4/recruiter-revenue";
import { buildSubmissionCopilot } from "@/lib/talent-intelligence";
import { SubmissionPackageActions } from "./submission-package-actions";

export const dynamic = "force-dynamic";

async function loadApplication(searchParams: { applicationId?: string; candidateId?: string }) {
  const where = searchParams.applicationId
    ? { id: searchParams.applicationId }
    : searchParams.candidateId
      ? { candidateId: searchParams.candidateId }
      : null;
  if (!where) return null;
  return tenantPrisma.application.findFirst({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      candidate: { include: { projects: true } },
      job: { include: { client: true, recruiter: { select: { id: true, name: true, email: true } } } },
      interviews: { select: { id: true, status: true, outcome: true, rating: true } },
      offers: { select: { id: true, status: true, offeredCtc: true, feeAmount: true, feePercent: true } },
    },
  });
}

export default async function SubmissionPackagePage({ searchParams }: { searchParams: { applicationId?: string; candidateId?: string } }) {
  const application = await loadApplication(searchParams);
  if (!application) notFound();
  const app = application as unknown as RevenueApplication & { candidate: RevenueApplication["candidate"] & { projects?: any[] } };
  const intel = computeApplicationIntelligence(app);
  const copilot = buildSubmissionCopilot(
    {
      name: app.candidate.name,
      email: app.candidate.email,
      phone: app.candidate.phone,
      currentCity: app.candidate.currentCity,
      currentCompany: app.candidate.currentCompany,
      currentDesignation: app.candidate.currentDesignation,
      totalExperience: app.candidate.totalExperience,
      relevantExperience: app.candidate.relevantExperience,
      skills: app.candidate.skills,
      currentCtc: app.candidate.currentCtc,
      expectedCtc: app.candidate.expectedCtc,
      noticePeriod: app.candidate.noticePeriod,
      aiSummary: app.candidate.aiSummary,
      source: app.candidate.source,
    },
    {
      title: app.job.title,
      location: app.job.location,
      skills: app.job.skills,
      salaryMin: app.job.salaryMin,
      salaryMax: app.job.salaryMax,
      client: app.job.client ? { name: app.job.client.name } : null,
    },
  );

  const strengths = [
    app.matchScore != null && app.matchScore >= 75 ? `Strong match score of ${Math.round(app.matchScore)}` : null,
    app.candidate.skills.length ? `Relevant skills: ${app.candidate.skills.slice(0, 8).join(", ")}` : null,
    app.candidate.totalExperience ? `${app.candidate.totalExperience}+ years total experience` : null,
    app.candidate.noticePeriod != null && app.candidate.noticePeriod <= 30 ? "Available within 30 days" : null,
  ].filter(Boolean) as string[];

  return (
    <main className="mx-auto max-w-5xl bg-background p-6 print:p-0">
      <style>{`
        @page { size: A4; margin: 1.5cm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold">Client Submission Package</h1>
          <p className="text-sm text-muted-foreground">Printable, PDF-ready candidate summary.</p>
        </div>
        <SubmissionPackageActions candidateName={app.candidate.name} />
      </div>

      <article id="submission-package" className="rounded-xl border bg-card p-8 shadow-sm print:border-0 print:shadow-none print:p-0">
        {/* Branding */}
        <div className="mb-6 flex items-center justify-between border-b pb-4 print:mb-4">
          <div>
            <div className="text-sm font-bold uppercase tracking-widest text-primary">TalentPulse</div>
            <div className="text-xs text-muted-foreground">Talent Intelligence Platform</div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            Confidential
          </div>
        </div>

        {/* Header */}
        <header className="border-b pb-6 print:pb-4">
          <div className="text-sm font-medium uppercase tracking-wide text-primary">Executive Candidate Summary</div>
          <h2 className="mt-2 font-display text-4xl font-bold">{app.candidate.name}</h2>
          <p className="mt-2 text-lg text-muted-foreground">
            {app.candidate.currentDesignation ?? "Candidate"} at {app.candidate.currentCompany ?? "current company not specified"}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Info label="Experience" value={`${app.candidate.totalExperience} years`} />
            <Info label="Notice Period" value={app.candidate.noticePeriod != null ? `${app.candidate.noticePeriod} days` : "Not verified"} />
            <Info label="Current CTC" value={app.candidate.currentCtc != null ? formatCurrency(app.candidate.currentCtc) : "Not verified"} />
            <Info label="Expected CTC" value={app.candidate.expectedCtc != null ? formatCurrency(app.candidate.expectedCtc) : "Not verified"} />
          </div>
        </header>

        <section className="mt-6 grid gap-6 md:grid-cols-[1fr_280px] print:grid-cols-1">
          <div className="space-y-6">
            {/* Candidate Summary */}
            <Block title="Candidate Summary">
              <p>{copilot.candidateSummary}</p>
            </Block>

            {/* Why Fit */}
            <Block title="Why This Candidate Fits">
              <p>{copilot.whyFit}</p>
            </Block>

            {/* Skills Match */}
            <Block title="Skills Alignment">
              <p>{copilot.skillsMatch}</p>
              <div className="mt-2 flex flex-wrap gap-2">{app.candidate.skills.map((skill) => <span key={skill} className="rounded-full border px-3 py-1 text-sm">{skill}</span>)}</div>
            </Block>

            {/* Relevant Experience */}
            <Block title="Relevant Experience">
              <p>{copilot.relevantExperience}</p>
            </Block>

            {/* Compensation & Notice */}
            <Block title="Compensation Summary">
              <p>{copilot.compensationSummary}</p>
            </Block>

            <Block title="Notice Period">
              <p>{copilot.noticeSummary}</p>
            </Block>

            {/* Recruiter Recommendation */}
            <Block title="Recruiter Recommendation">
              <p>{copilot.recruiterRecommendation}</p>
            </Block>

            {/* Strengths */}
            {strengths.length > 0 && (
              <Block title="Key Strengths">
                <ul className="list-disc space-y-1 pl-5">{strengths.map((item) => <li key={item}>{item}</li>)}</ul>
              </Block>
            )}

            {/* Risks */}
            {intel.risks.filter((r) => r !== "No major risk detected").length > 0 && (
              <Block title="Considerations">
                <ul className="list-disc space-y-1 pl-5">{intel.risks.map((risk) => <li key={risk}>{risk}</li>)}</ul>
              </Block>
            )}

            {/* Confidentiality */}
            <div className="border-t pt-4 text-xs text-muted-foreground print:pt-2">
              <p className="font-medium text-foreground">Confidential</p>
              <p>This document is intended solely for the named client and TalentPulse recruitment services. It contains confidential candidate information and should not be distributed without authorization.</p>
              <p className="mt-1">Generated by TalentPulse Talent Intelligence Platform.</p>
            </div>
          </div>

          {/* Sidebar scores */}
          <aside className="space-y-3 print:hidden">
            <Score label="Match Score" value={Math.round(app.matchScore ?? intel.readiness)} />
            <Score label="Readiness" value={intel.readiness} />
            <Score label="Interview Probability" value={intel.interviewProbability} />
            <Score label="Joining Probability" value={intel.joiningProbability} />
            <Info label="Revenue Potential" value={formatCurrency(intel.revenuePotential)} />
          </aside>
        </section>
      </article>
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="print:break-inside-avoid">
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl font-bold">{value}%</div>
    </div>
  );
}
