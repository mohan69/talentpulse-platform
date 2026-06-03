"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Percent, ArrowRightLeft, CheckCircle2, UserCheck, Briefcase } from "lucide-react";

const COLORS = ["#60B5FF", "#FF9149", "#FF9898", "#80D8C3", "#A19AD3", "#72BF78", "#FF90BB", "#FF6363"];

const PROSPECT_COLORS: Record<string, string> = {
  NEW: "#60B5FF",
  CONTACTED: "#FF9149",
  INTERESTED: "#80D8C3",
  QUALIFIED: "#A19AD3",
  CONVERTED: "#72BF78",
  NOT_INTERESTED: "#FF9898",
  NOT_REACHABLE: "#FFB84C",
  REJECTED: "#FF6363",
};

function KpiCard({ label, value, suffix, icon: Icon, color }: { label: string; value: number | string; suffix?: string; icon: any; color: string }) {
  return (
    <div className="rounded-xl bg-card shadow-sm p-5 border border-border/30">
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-9 w-9 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="h-4.5 w-4.5 text-white" />
        </div>
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      </div>
      <div className="font-display font-bold text-3xl tracking-tight">
        {value}{suffix && <span className="text-lg text-muted-foreground ml-0.5">{suffix}</span>}
      </div>
    </div>
  );
}

export function ChartPanel({ data }: { data: any }) {
  const funnelData = (data.funnel ?? []).map((f: any) => ({ stage: f.stage, count: f._count }));
  const sourceData = (data.sourceStats ?? []).map((s: any) => ({ name: s.source || "Unknown", value: s._count }));
  const recruiterData = (data.recruiterStats ?? []).map((r: any) => ({ ...r, applications: r.submissions ?? 0, joined: r.closures ?? 0 }));
  const trendData = (data.trend ?? []).map((t: any) => ({ ...t, applications: t.submissions ?? t.applications ?? 0 }));
  const prospectData = (data.prospectFunnel ?? []).map((p: any) => ({ name: p.status, value: p.count }));
  const kpis = data.kpis ?? {};

  return (
    <div className="space-y-6">
      {/* KPI Metrics Section */}
      <div>
        <h3 className="font-display font-semibold text-lg mb-4">Key Performance Indicators</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Screen → Interview" value={kpis.screenToInterview ?? 0} suffix="%" icon={ArrowRightLeft} color="bg-blue-500" />
          <KpiCard label="Interview → Offer" value={kpis.interviewToOffer ?? 0} suffix="%" icon={TrendingUp} color="bg-orange-500" />
          <KpiCard label="Offer → Joining" value={kpis.offerToJoin ?? 0} suffix="%" icon={CheckCircle2} color="bg-emerald-500" />
          <KpiCard label="Overall Conversion" value={kpis.overallConversion ?? 0} suffix="%" icon={Percent} color="bg-violet-500" />
          <KpiCard label="Prospect → Candidate" value={kpis.prospectConversion ?? 0} suffix="%" icon={UserCheck} color="bg-cyan-500" />
          <KpiCard label="Job Fill Rate" value={kpis.fillRate ?? 0} suffix="%" icon={Briefcase} color="bg-rose-500" />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl bg-card shadow-sm p-5 border border-border/30">
          <h3 className="font-display font-semibold mb-4">Pipeline Funnel</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                <XAxis dataKey="stage" tickLine={false} tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#60B5FF" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-card shadow-sm p-5 border border-border/30">
          <h3 className="font-display font-semibold mb-4">Prospect Status Distribution</h3>
          <div className="h-72">
            {prospectData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={prospectData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {prospectData.map((p: any, i: number) => (
                      <Cell key={i} fill={PROSPECT_COLORS[p.name] || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No prospect data yet.</div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-card shadow-sm p-5 border border-border/30">
          <h3 className="font-display font-semibold mb-4">Source Breakdown</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {sourceData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-card shadow-sm p-5 border border-border/30">
          <h3 className="font-display font-semibold mb-4">6-Month Application Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="applications" stroke="#60B5FF" strokeWidth={2} />
                <Line type="monotone" dataKey="interviews" stroke="#FF9149" strokeWidth={2} />
                <Line type="monotone" dataKey="offers" stroke="#80D8C3" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-card shadow-sm p-5 border border-border/30 lg:col-span-2">
          <h3 className="font-display font-semibold mb-4">Recruiter Leaderboard</h3>
          {recruiterData.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-2">
              {recruiterData.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-3">
                    <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-medium">{r.name}</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-muted-foreground">Apps: <b className="text-foreground">{r.applications}</b></span>
                    <span className="text-muted-foreground">Offers: <b className="text-amber-600">{r.offers}</b></span>
                    <span className="text-muted-foreground">Joined: <b className="text-emerald-600">{r.joined}</b></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No data.</div>
          )}
        </div>
      </div>
    </div>
  );
}
