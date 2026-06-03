"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Clock, Star, TrendingUp, Loader2, CheckCircle } from "lucide-react";
import dynamic from "next/dynamic";

const CallCharts = dynamic(() => import("./call-charts"), { ssr: false });

function formatDuration(seconds: number): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTotalDuration(seconds: number): string {
  if (!seconds) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "text-green-600 bg-green-50",
  FAILED: "text-red-600 bg-red-50",
  NO_ANSWER: "text-amber-600 bg-amber-50",
  BUSY: "text-purple-600 bg-purple-50",
  CANCELLED: "text-gray-600 bg-gray-100",
  QUEUED: "text-blue-600 bg-blue-50",
  RINGING: "text-blue-600 bg-blue-50",
  IN_PROGRESS: "text-blue-600 bg-blue-50",
};

export function CallAnalyticsClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    try {
      const res = await fetch(`/api/call-analytics?${params}`);
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground py-8">Failed to load analytics data.</p>;

  const { stats, statusDistribution, dailyTrend, scoreDistribution, recentLog } = data;

  return (
    <div className="space-y-6 mt-6">
      {/* Date Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">From Date</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">To Date</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-[160px]" />
            </div>
            <Button size="sm" onClick={fetchData}>Apply</Button>
            {(fromDate || toDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setFromDate(""); setToDate(""); setTimeout(fetchData, 50); }}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox icon={Phone} label="Total Calls" value={stats.totalCalls} color="blue" />
        <StatBox icon={CheckCircle} label="Completed" value={stats.completedCalls} color="green" />
        <StatBox icon={PhoneOff} label="Failed / Missed" value={stats.failedCalls} color="red" />
        <StatBox icon={TrendingUp} label="Success Rate" value={`${stats.successRate}%`} color="emerald" />
        <StatBox icon={Clock} label="Avg Duration" value={formatDuration(stats.avgDuration)} color="purple" />
        <StatBox icon={Clock} label="Total Duration" value={formatTotalDuration(stats.totalDuration)} color="indigo" />
        <StatBox icon={Star} label="Avg AI Score" value={stats.avgScore || "-"} color="amber" />
        <StatBox icon={Phone} label="In Progress" value={stats.inProgressCalls} color="sky" />
      </div>

      {/* Charts */}
      <CallCharts
        statusDistribution={statusDistribution}
        dailyTrend={dailyTrend}
        scoreDistribution={scoreDistribution}
      />

      {/* Recent Call Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLog.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No calls recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-3 font-medium">Candidate</th>
                    <th className="py-2 px-3 font-medium">Job</th>
                    <th className="py-2 px-3 font-medium">Client</th>
                    <th className="py-2 px-3 font-medium text-center">Status</th>
                    <th className="py-2 px-3 font-medium text-center">Duration</th>
                    <th className="py-2 px-3 font-medium text-center">AI Score</th>
                    <th className="py-2 px-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLog.map((call: any) => (
                    <tr key={call.id} className="border-b border-border/40 hover:bg-muted/30">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium">{call.candidateName}</div>
                        <div className="text-xs text-muted-foreground">{call.candidatePhone}</div>
                      </td>
                      <td className="py-2.5 px-3 max-w-[160px] truncate">{call.jobTitle}</td>
                      <td className="py-2.5 px-3">{call.clientName}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[call.status] ?? "bg-muted"}`}>
                          {call.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">{call.duration ? formatDuration(call.duration) : "-"}</td>
                      <td className="py-2.5 px-3 text-center">
                        {call.aiScore != null ? (
                          <span className={`font-semibold ${call.aiScore >= 70 ? "text-green-600" : call.aiScore >= 40 ? "text-amber-600" : "text-red-600"}`}>
                            {Math.round(call.aiScore)}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        {new Date(call.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    emerald: "bg-emerald-50 text-emerald-700",
    purple: "bg-purple-50 text-purple-700",
    indigo: "bg-indigo-50 text-indigo-700",
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
  };
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${colorMap[color] ?? "bg-muted"}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
