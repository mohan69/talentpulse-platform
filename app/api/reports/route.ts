import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";
import { PipelineStage } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "RECRUITER"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const reportType = url.searchParams.get("type") ?? "summary";
  const fromDate = url.searchParams.get("from");
  const toDate = url.searchParams.get("to");
  const clientId = url.searchParams.get("clientId");

  const dateFilter: any = {};
  if (fromDate) dateFilter.gte = new Date(fromDate);
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  try {
    if (reportType === "summary") {
      const jobWhere: any = {};
      const appWhere: any = {};
      if (clientId) { jobWhere.clientId = clientId; appWhere.job = { clientId }; }
      if (hasDateFilter) { jobWhere.createdAt = dateFilter; appWhere.createdAt = dateFilter; }
      if (user.role === "RECRUITER") { jobWhere.recruiterId = user.id; appWhere.job = { ...appWhere.job, recruiterId: user.id }; }

      const [totalJobs, openJobs, totalCandidates, totalApplications, interviewsScheduled, offersExtended, joined] = await Promise.all([
        prisma.job.count({ where: jobWhere }),
        prisma.job.count({ where: { ...jobWhere, status: "OPEN" } }),
        prisma.candidate.count({ where: hasDateFilter ? { createdAt: dateFilter } : {} }),
        prisma.application.count({ where: appWhere }),
        prisma.interview.count({ where: { ...(appWhere.job ? { application: appWhere } : {}), ...(hasDateFilter ? { scheduledAt: dateFilter } : {}) } }),
        prisma.application.count({ where: { ...appWhere, stage: PipelineStage.OFFER_EXTENDED } }),
        prisma.application.count({ where: { ...appWhere, stage: PipelineStage.JOINED } }),
      ]);

      return NextResponse.json({
        type: "summary",
        data: { totalJobs, openJobs, totalCandidates, totalApplications, interviewsScheduled, offersExtended, joined },
      });
    }

    if (reportType === "client-wise") {
      const clientWhere: any = {};
      if (clientId) clientWhere.id = clientId;

      const clients = await prisma.client.findMany({
        where: clientWhere,
        include: {
          jobs: {
            where: hasDateFilter ? { createdAt: dateFilter } : {},
            include: {
              applications: {
                select: { stage: true },
              },
              _count: { select: { applications: true } },
            },
          },
        },
        orderBy: { name: "asc" },
      });

      const data = clients.map((c) => {
        const allApps = c.jobs.flatMap((j) => j.applications);
        return {
          clientId: c.id,
          clientName: c.name,
          industry: c.industry,
          totalJobs: c.jobs.length,
          openJobs: c.jobs.filter((j) => j.status === "OPEN").length,
          totalApplications: allApps.length,
          submitted: allApps.filter((a) => ["SUBMITTED", "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETE", "OFFER_EXTENDED", "OFFER_ACCEPTED", "JOINED"].includes(a.stage)).length,
          interviews: allApps.filter((a) => ["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETE"].includes(a.stage)).length,
          offers: allApps.filter((a) => ["OFFER_EXTENDED", "OFFER_ACCEPTED"].includes(a.stage)).length,
          joined: allApps.filter((a) => a.stage === "JOINED").length,
        };
      });

      return NextResponse.json({ type: "client-wise", data });
    }

    if (reportType === "recruiter-performance") {
      if (user.role !== "ADMIN")
        return NextResponse.json({ error: "Admin only" }, { status: 403 });

      const recruiters = await prisma.user.findMany({
        where: {
          role: "RECRUITER",
          NOT: { email: { startsWith: "testuser" } },
          email: { not: "john@doe.com" },
        },
        include: {
          assignedJobs: {
            where: hasDateFilter ? { createdAt: dateFilter } : {},
            include: {
              applications: { select: { stage: true, createdAt: true } },
            },
          },
        },
      });

      const data = recruiters.map((r) => {
        const allApps = r.assignedJobs.flatMap((j) => j.applications);
        const filtered = hasDateFilter ? allApps.filter((a) => {
          const t = a.createdAt.getTime();
          return (!dateFilter.gte || t >= dateFilter.gte.getTime()) && (!dateFilter.lte || t <= dateFilter.lte.getTime());
        }) : allApps;
        return {
          recruiterId: r.id,
          recruiterName: r.name,
          email: r.email,
          totalJobs: r.assignedJobs.length,
          totalApplications: filtered.length,
          submitted: filtered.filter((a) => ["SUBMITTED", "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETE", "OFFER_EXTENDED", "OFFER_ACCEPTED", "JOINED"].includes(a.stage)).length,
          interviews: filtered.filter((a) => ["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETE"].includes(a.stage)).length,
          offers: filtered.filter((a) => ["OFFER_EXTENDED", "OFFER_ACCEPTED"].includes(a.stage)).length,
          joined: filtered.filter((a) => a.stage === "JOINED").length,
        };
      });

      return NextResponse.json({ type: "recruiter-performance", data });
    }

    if (reportType === "pipeline-aging") {
      const appWhere: any = {
        stage: { notIn: [PipelineStage.JOINED, PipelineStage.REJECTED] },
      };
      if (clientId) appWhere.job = { clientId };
      if (user.role === "RECRUITER") appWhere.job = { ...appWhere.job, recruiterId: user.id };

      const apps = await prisma.application.findMany({
        where: appWhere,
        include: {
          candidate: { select: { name: true, email: true } },
          job: { select: { title: true, client: { select: { name: true } } } },
        },
        orderBy: { createdAt: "asc" },
      });

      const now = Date.now();
      const data = apps.map((a) => ({
        candidateName: a.candidate.name,
        candidateEmail: a.candidate.email,
        jobTitle: a.job.title,
        clientName: a.job.client?.name ?? "-",
        stage: a.stage,
        daysInPipeline: Math.floor((now - a.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        appliedDate: a.createdAt.toISOString().split("T")[0],
      }));

      return NextResponse.json({ type: "pipeline-aging", data });
    }

    return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  } catch (err: any) {
    console.error("Reports API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
