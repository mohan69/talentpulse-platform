"use client";

import { useState } from "react";
import { Calendar, Video, Clock, User, Monitor, MapPin, ChevronDown, ChevronUp } from "lucide-react";

function fmt(d: string) {
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function CandidateInterviewsClient({ interviews }: { interviews: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const scheduled = interviews.filter((i) => i.status === "SCHEDULED");
  const past = interviews.filter((i) => i.status !== "SCHEDULED");

  const modeIcon: Record<string, any> = {
    Video: <Monitor className="h-3.5 w-3.5" />,
    Phone: <Calendar className="h-3.5 w-3.5" />,
    "In-Person": <MapPin className="h-3.5 w-3.5" />,
  };

  function renderCard(i: any) {
    const isExpanded = expandedId === i.id;
    return (
      <div key={i.id} className="rounded-xl bg-card shadow-sm overflow-hidden transition-all hover:shadow-md">
        <div className="p-5 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : i.id)}>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${i.status === "SCHEDULED" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
            <Calendar className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium">{i.application.job.title}</div>
            <div className="text-sm text-muted-foreground truncate">{i.application.job.client?.name} · Round {i.round} · {fmt(i.scheduledAt)}</div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${i.status === "SCHEDULED" ? "bg-amber-100 text-amber-700" : i.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{i.status}</span>
          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
        </div>

        {isExpanded && (
          <div className="px-5 pb-5 pt-0 border-t border-border">
            <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{fmtDate(i.scheduledAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{fmtTime(i.scheduledAt)} · {i.durationMins ?? 60} minutes</span>
              </div>
              {i.interviewerName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Interviewer: {i.interviewerName}</span>
                </div>
              )}
              {i.mode && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  {modeIcon[i.mode] ?? <Monitor className="h-3.5 w-3.5" />}
                  <span>{i.mode}</span>
                </div>
              )}
            </div>
            {i.meetingLink && i.status === "SCHEDULED" && (
              <div className="mt-4">
                <a href={i.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                  <Video className="h-4 w-4" /> Join Meeting
                </a>
              </div>
            )}
            {i.feedback && (
              <div className="mt-4 p-3 rounded-lg bg-muted/40">
                <div className="text-xs font-semibold text-muted-foreground mb-1">Feedback</div>
                <div className="text-sm">{i.feedback}</div>
                {i.rating && <div className="text-xs mt-1 text-amber-600">{"★".repeat(i.rating)}{"☆".repeat(5 - i.rating)}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {scheduled.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">UPCOMING ({scheduled.length})</h3>
          <div className="space-y-3">{scheduled.map(renderCard)}</div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">PAST ({past.length})</h3>
          <div className="space-y-3">{past.map(renderCard)}</div>
        </div>
      )}
      {interviews.length === 0 && <div className="p-10 rounded-xl bg-card text-center text-muted-foreground">No interviews scheduled yet.</div>}
    </div>
  );
}
