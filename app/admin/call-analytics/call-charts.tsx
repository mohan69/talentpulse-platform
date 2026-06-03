"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  LineChart, Line,
} from "recharts";

interface CallChartsProps {
  statusDistribution: { status: string; count: number; color: string }[];
  dailyTrend: { date: string; total: number; completed: number; avgDuration: number }[];
  scoreDistribution: { range: string; count: number }[];
}

const SCORE_COLORS = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#16a34a"];

export default function CallCharts({ statusDistribution, dailyTrend, scoreDistribution }: CallChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Status Distribution Pie */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Call Status Distribution</CardTitle></CardHeader>
        <CardContent>
          {statusDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No call data</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusDistribution} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label={({ status, count }) => `${status}: ${count}`}>
                  {statusDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* AI Score Distribution Bar */}
      <Card>
        <CardHeader><CardTitle className="text-sm">AI Score Distribution</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={scoreDistribution}>
              <XAxis dataKey="range" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]}>
                {scoreDistribution.map((_, i) => (
                  <Cell key={i} fill={SCORE_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Trend Line */}
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-sm">Daily Call Volume (Last 30 Days)</CardTitle></CardHeader>
        <CardContent>
          {dailyTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No recent call data</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyTrend}>
                <XAxis dataKey="date" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip labelFormatter={(v) => `Date: ${v}`} />
                <Legend />
                <Line type="monotone" dataKey="total" name="Total Calls" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
