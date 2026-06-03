import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guards";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "RECRUITER"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const fromDate = url.searchParams.get("from");
  const toDate = url.searchParams.get("to");

  const dateFilter: any = {};
  if (fromDate) dateFilter.gte = new Date(fromDate);
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  const where: any = {};
  if (hasDateFilter) where.createdAt = dateFilter;
  if (user.role === "RECRUITER") where.initiatedById = user.id;

  try {
    const screenings = await prisma.voiceScreening.findMany({
      where,
      include: {
        candidate: { select: { name: true, phone: true } },
        application: { select: { job: { select: { title: true, client: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Summary stats
    const totalCalls = screenings.length;
    const completedCalls = screenings.filter((s) => s.callStatus === "COMPLETED").length;
    const failedCalls = screenings.filter((s) => ["FAILED", "NO_ANSWER", "BUSY", "CANCELLED"].includes(s.callStatus)).length;
    const inProgressCalls = screenings.filter((s) => ["QUEUED", "RINGING", "IN_PROGRESS"].includes(s.callStatus)).length;
    const totalDuration = screenings.reduce((sum, s) => sum + (s.callDuration ?? 0), 0);
    const avgDuration = completedCalls > 0 ? Math.round(totalDuration / completedCalls) : 0;
    const avgScore = completedCalls > 0
      ? Math.round(screenings.filter((s) => s.aiScore != null).reduce((sum, s) => sum + (s.aiScore ?? 0), 0) / screenings.filter((s) => s.aiScore != null).length)
      : 0;
    const successRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

    // Status distribution
    const statusDistribution = [
      { status: "Completed", count: completedCalls, color: "#22c55e" },
      { status: "Failed", count: screenings.filter((s) => s.callStatus === "FAILED").length, color: "#ef4444" },
      { status: "No Answer", count: screenings.filter((s) => s.callStatus === "NO_ANSWER").length, color: "#f59e0b" },
      { status: "Busy", count: screenings.filter((s) => s.callStatus === "BUSY").length, color: "#8b5cf6" },
      { status: "Cancelled", count: screenings.filter((s) => s.callStatus === "CANCELLED").length, color: "#6b7280" },
      { status: "In Progress", count: inProgressCalls, color: "#3b82f6" },
    ].filter((s) => s.count > 0);

    // Daily call volume (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCalls = screenings.filter((s) => s.createdAt >= thirtyDaysAgo);
    const dailyMap = new Map<string, { total: number; completed: number; totalDuration: number }>();
    for (const s of recentCalls) {
      const day = s.createdAt.toISOString().split("T")[0];
      const cur = dailyMap.get(day) ?? { total: 0, completed: 0, totalDuration: 0 };
      cur.total++;
      if (s.callStatus === "COMPLETED") {
        cur.completed++;
        cur.totalDuration += s.callDuration ?? 0;
      }
      dailyMap.set(day, cur);
    }
    const dailyTrend = Array.from(dailyMap.entries())
      .sort()
      .map(([date, v]) => ({ date, ...v, avgDuration: v.completed > 0 ? Math.round(v.totalDuration / v.completed) : 0 }));

    // Score distribution
    const scoreRanges = [
      { range: "0-20", min: 0, max: 20, count: 0 },
      { range: "21-40", min: 21, max: 40, count: 0 },
      { range: "41-60", min: 41, max: 60, count: 0 },
      { range: "61-80", min: 61, max: 80, count: 0 },
      { range: "81-100", min: 81, max: 100, count: 0 },
    ];
    for (const s of screenings) {
      if (s.aiScore != null) {
        const bucket = scoreRanges.find((r) => s.aiScore! >= r.min && s.aiScore! <= r.max);
        if (bucket) bucket.count++;
      }
    }

    // Recent call log
    const recentLog = screenings.slice(0, 50).map((s) => ({
      id: s.id,
      candidateName: s.candidate.name,
      candidatePhone: s.phoneNumber,
      jobTitle: s.application?.job?.title ?? "-",
      clientName: s.application?.job?.client?.name ?? "-",
      status: s.callStatus,
      duration: s.callDuration,
      aiScore: s.aiScore,
      date: s.createdAt.toISOString(),
    }));

    return NextResponse.json({
      stats: { totalCalls, completedCalls, failedCalls, inProgressCalls, totalDuration, avgDuration, avgScore, successRate },
      statusDistribution,
      dailyTrend,
      scoreDistribution: scoreRanges,
      recentLog,
    });
  } catch (err: any) {
    console.error("Call Analytics API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
