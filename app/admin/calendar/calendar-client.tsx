"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Settings, CheckCircle2, AlertTriangle, Clock, Video, Phone, MapPin, User } from "lucide-react";
import Link from "next/link";

type Interview = {
  id: string; round: string; scheduledAt: string; durationMins: number;
  mode: string; meetingLink: string | null; interviewerName: string | null;
  application: { job: { title: string } };
  candidate: { name: string; phone: string | null };
};

const MODE_ICON: Record<string, any> = { Video: Video, Phone: Phone, "In-Person": MapPin };

export function CalendarClient({ googleActive, outlookActive, upcomingInterviews }: {
  googleActive: boolean; outlookActive: boolean; upcomingInterviews: Interview[];
}) {
  const anyActive = googleActive || outlookActive;

  return (
    <div className="space-y-6">
      {/* Connection cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm rounded-xl">
          <CardContent className="py-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <svg className="h-6 w-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Google Calendar</h3>
                <p className="text-xs text-muted-foreground">2-way sync with Google Calendar</p>
              </div>
              {googleActive ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-200"><AlertTriangle className="h-3 w-3 mr-1" /> Not Set</Badge>
              )}
            </div>
            {!googleActive && (
              <Button size="sm" className="mt-3 w-full" variant="outline" asChild>
                <Link href="/admin/settings"><Settings className="h-3 w-3 mr-1" /> Configure</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl">
          <CardContent className="py-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-600/10 flex items-center justify-center">
                <svg className="h-6 w-6" viewBox="0 0 24 24"><path fill="#0078D4" d="M21.17 2H7.83A1.83 1.83 0 0 0 6 3.83v3.34L14.09 12 6 17.38v2.79A1.83 1.83 0 0 0 7.83 22h13.34A1.83 1.83 0 0 0 23 20.17V3.83A1.83 1.83 0 0 0 21.17 2zM6 7.17V9l-5 3.5V8a2 2 0 0 1 2-2h3v1.17zM1 12.5l5 3.5v1.83l-3-2.08-2 1.42V12.5z" /></svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Outlook Calendar</h3>
                <p className="text-xs text-muted-foreground">2-way sync with Microsoft Outlook</p>
              </div>
              {outlookActive ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-200"><AlertTriangle className="h-3 w-3 mr-1" /> Not Set</Badge>
              )}
            </div>
            {!outlookActive && (
              <Button size="sm" className="mt-3 w-full" variant="outline" asChild>
                <Link href="/admin/settings"><Settings className="h-3 w-3 mr-1" /> Configure</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming interviews */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Upcoming Interviews</CardTitle>
          <CardDescription className="text-xs">{anyActive ? "Synced with your connected calendar" : "Calendar sync available after configuration"}</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingInterviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No upcoming interviews scheduled.</p>
          ) : (
            <div className="space-y-3">
              {upcomingInterviews.map((i) => {
                const ModeIcon = MODE_ICON[i.mode] || Video;
                const dt = new Date(i.scheduledAt);
                return (
                  <div key={i.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                    <div className="text-center min-w-[50px]">
                      <p className="text-lg font-bold">{dt.getDate()}</p>
                      <p className="text-[10px] text-muted-foreground">{dt.toLocaleDateString("en-IN", { month: "short" })}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{i.candidate.name}</p>
                        <Badge variant="outline" className="text-[10px]">{i.round}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{i.application.job.title}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="flex items-center gap-1"><ModeIcon className="h-3 w-3" /> {i.mode}</span>
                      {i.interviewerName && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {i.interviewerName}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
