"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { StatCard } from "@/components/workspace/stat-card";
import { Briefcase, Users, CheckCircle, Target, UserSearch, Building2 } from "lucide-react";

const ChartPanel: any = dynamic(() => import("./chart-panel").then((m) => m.ChartPanel), { ssr: false });

export function AnalyticsClient() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch("/api/analytics").then((r) => r.json()).then(setData).catch(() => {}); }, []);
  if (!data) return <div className="rounded-xl bg-card shadow-sm p-10 text-center text-muted-foreground">Loading...</div>;
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard label="Open Jobs" value={data.stats?.openJobs ?? 0} icon={Briefcase} color="primary" />
        <StatCard label="Applications" value={data.stats?.totalApplications ?? 0} icon={Users} color="cyan" />
        <StatCard label="Offers Extended" value={data.stats?.offersExtended ?? 0} icon={Target} color="amber" />
        <StatCard label="Joined" value={data.stats?.joined ?? 0} icon={CheckCircle} color="emerald" />
        <StatCard label="Prospects" value={data.stats?.totalProspects ?? 0} icon={UserSearch} color="violet" hint={`${data.stats?.prospectConverted ?? 0} converted`} />
        <StatCard label="Clients" value={data.stats?.totalClients ?? 0} icon={Building2} color="rose" />
      </div>
      <ChartPanel data={data} />
    </>
  );
}
