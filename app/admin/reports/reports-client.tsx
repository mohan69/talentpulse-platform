"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, FileText, Users, Building2, Clock, Loader2, BarChart3 } from "lucide-react";

interface ReportsClientProps {
  clients: { id: string; name: string }[];
}

type ReportType = "summary" | "client-wise" | "recruiter-performance" | "pipeline-aging";

const REPORT_CONFIGS: { type: ReportType; title: string; description: string; icon: any; adminOnly?: boolean }[] = [
  { type: "summary", title: "Summary Report", description: "Overall recruitment metrics including jobs, candidates, interviews, and placements", icon: BarChart3 },
  { type: "client-wise", title: "Client-Wise Report", description: "Breakdown by client — positions, submissions, interviews, and closures", icon: Building2 },
  { type: "recruiter-performance", title: "Recruiter Performance", description: "Recruiter-level metrics — jobs handled, submissions, and closures", icon: Users, adminOnly: true },
  { type: "pipeline-aging", title: "Pipeline Aging Report", description: "Candidates stuck in pipeline with days-in-stage analysis", icon: Clock },
];

export function ReportsClient({ clients }: ReportsClientProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [clientId, setClientId] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const fetchReport = async (type: ReportType) => {
    setLoading(true);
    setReportData(null);
    const params = new URLSearchParams({ type });
    if (clientId !== "all") params.set("clientId", clientId);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);

    try {
      const res = await fetch(`/api/reports?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
        setSelectedReport(type);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const downloadCSV = () => {
    if (!reportData) return;
    let csv = "";
    const { type, data } = reportData;

    if (type === "summary") {
      csv = "Metric,Value\n";
      csv += `Total Jobs,${data.totalJobs}\n`;
      csv += `Open Jobs,${data.openJobs}\n`;
      csv += `Total Candidates,${data.totalCandidates}\n`;
      csv += `Total Applications,${data.totalApplications}\n`;
      csv += `Interviews Scheduled,${data.interviewsScheduled}\n`;
      csv += `Offers Extended,${data.offersExtended}\n`;
      csv += `Joined,${data.joined}\n`;
    } else if (type === "client-wise") {
      csv = "Client,Industry,Total Jobs,Open Jobs,Applications,Submitted,Interviews,Offers,Joined\n";
      data.forEach((r: any) => {
        csv += `"${r.clientName}","${r.industry || "-"}",${r.totalJobs},${r.openJobs},${r.totalApplications},${r.submitted},${r.interviews},${r.offers},${r.joined}\n`;
      });
    } else if (type === "recruiter-performance") {
      csv = "Recruiter,Email,Jobs,Applications,Submitted,Interviews,Offers,Joined\n";
      data.forEach((r: any) => {
        csv += `"${r.recruiterName}","${r.email}",${r.totalJobs},${r.totalApplications},${r.submitted},${r.interviews},${r.offers},${r.joined}\n`;
      });
    } else if (type === "pipeline-aging") {
      csv = "Candidate,Email,Job,Client,Stage,Days in Pipeline,Applied Date\n";
      data.forEach((r: any) => {
        csv += `"${r.candidateName}","${r.candidateEmail}","${r.jobTitle}","${r.clientName}",${r.stage},${r.daysInPipeline},${r.appliedDate}\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Client</label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">From Date</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">To Date</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-[160px]" />
            </div>
            {(fromDate || toDate || clientId !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setFromDate(""); setToDate(""); setClientId("all"); }}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORT_CONFIGS.map((cfg) => (
          <Card key={cfg.type} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => fetchReport(cfg.type)}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <cfg.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{cfg.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{cfg.description}</p>
                </div>
                <Button variant="outline" size="sm" disabled={loading}>
                  {loading && selectedReport === cfg.type ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  <span className="ml-1.5">Generate</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Results */}
      {reportData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {REPORT_CONFIGS.find((c) => c.type === reportData.type)?.title ?? "Report"}
            </CardTitle>
            <Button size="sm" onClick={downloadCSV}>
              <Download className="h-4 w-4 mr-1.5" /> Download CSV
            </Button>
          </CardHeader>
          <CardContent>
            {reportData.type === "summary" && <SummaryTable data={reportData.data} />}
            {reportData.type === "client-wise" && <ClientWiseTable data={reportData.data} />}
            {reportData.type === "recruiter-performance" && <RecruiterTable data={reportData.data} />}
            {reportData.type === "pipeline-aging" && <PipelineAgingTable data={reportData.data} />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryTable({ data }: { data: any }) {
  const metrics = [
    ["Total Jobs", data.totalJobs],
    ["Open Jobs", data.openJobs],
    ["Total Candidates", data.totalCandidates],
    ["Total Applications", data.totalApplications],
    ["Interviews Scheduled", data.interviewsScheduled],
    ["Offers Extended", data.offersExtended],
    ["Joined / Closures", data.joined],
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {metrics.map(([label, value]) => (
        <div key={label as string} className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}

function ClientWiseTable({ data }: { data: any[] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground py-4">No data found</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4 font-medium">Client</th>
            <th className="py-2 px-3 font-medium text-center">Jobs</th>
            <th className="py-2 px-3 font-medium text-center">Open</th>
            <th className="py-2 px-3 font-medium text-center">Applications</th>
            <th className="py-2 px-3 font-medium text-center">Submitted</th>
            <th className="py-2 px-3 font-medium text-center">Interviews</th>
            <th className="py-2 px-3 font-medium text-center">Offers</th>
            <th className="py-2 px-3 font-medium text-center">Joined</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.clientId} className="border-b border-border/40 hover:bg-muted/30">
              <td className="py-2.5 pr-4">
                <div className="font-medium">{r.clientName}</div>
                {r.industry && <div className="text-xs text-muted-foreground">{r.industry}</div>}
              </td>
              <td className="py-2.5 px-3 text-center">{r.totalJobs}</td>
              <td className="py-2.5 px-3 text-center">{r.openJobs}</td>
              <td className="py-2.5 px-3 text-center">{r.totalApplications}</td>
              <td className="py-2.5 px-3 text-center">{r.submitted}</td>
              <td className="py-2.5 px-3 text-center">{r.interviews}</td>
              <td className="py-2.5 px-3 text-center">{r.offers}</td>
              <td className="py-2.5 px-3 text-center font-semibold text-green-600">{r.joined}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecruiterTable({ data }: { data: any[] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground py-4">No data found</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4 font-medium">Recruiter</th>
            <th className="py-2 px-3 font-medium text-center">Jobs</th>
            <th className="py-2 px-3 font-medium text-center">Applications</th>
            <th className="py-2 px-3 font-medium text-center">Submitted</th>
            <th className="py-2 px-3 font-medium text-center">Interviews</th>
            <th className="py-2 px-3 font-medium text-center">Offers</th>
            <th className="py-2 px-3 font-medium text-center">Joined</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.recruiterId} className="border-b border-border/40 hover:bg-muted/30">
              <td className="py-2.5 pr-4">
                <div className="font-medium">{r.recruiterName}</div>
                <div className="text-xs text-muted-foreground">{r.email}</div>
              </td>
              <td className="py-2.5 px-3 text-center">{r.totalJobs}</td>
              <td className="py-2.5 px-3 text-center">{r.totalApplications}</td>
              <td className="py-2.5 px-3 text-center">{r.submitted}</td>
              <td className="py-2.5 px-3 text-center">{r.interviews}</td>
              <td className="py-2.5 px-3 text-center">{r.offers}</td>
              <td className="py-2.5 px-3 text-center font-semibold text-green-600">{r.joined}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PipelineAgingTable({ data }: { data: any[] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground py-4">No candidates in pipeline</p>;
  const getAgingColor = (days: number) => {
    if (days > 30) return "text-red-600 bg-red-50";
    if (days > 14) return "text-amber-600 bg-amber-50";
    return "text-green-600 bg-green-50";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4 font-medium">Candidate</th>
            <th className="py-2 px-3 font-medium">Job</th>
            <th className="py-2 px-3 font-medium">Client</th>
            <th className="py-2 px-3 font-medium">Stage</th>
            <th className="py-2 px-3 font-medium text-center">Days</th>
            <th className="py-2 px-3 font-medium">Applied</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-b border-border/40 hover:bg-muted/30">
              <td className="py-2.5 pr-4">
                <div className="font-medium">{r.candidateName}</div>
                <div className="text-xs text-muted-foreground">{r.candidateEmail}</div>
              </td>
              <td className="py-2.5 px-3 max-w-[180px] truncate">{r.jobTitle}</td>
              <td className="py-2.5 px-3">{r.clientName}</td>
              <td className="py-2.5 px-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{r.stage.replace(/_/g, " ")}</span>
              </td>
              <td className="py-2.5 px-3 text-center">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getAgingColor(r.daysInPipeline)}`}>
                  {r.daysInPipeline}d
                </span>
              </td>
              <td className="py-2.5 px-3 text-muted-foreground">{r.appliedDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
