"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Send, Loader2, Sparkles, User, Copy, Check, AlertCircle, RefreshCw, MessageSquare, FileText, Briefcase, ListChecks, Mail, Linkedin } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const EXAMPLE_PROMPTS = [
  { label: "Summarize a candidate", icon: User, prompt: "Generate a candidate summary for a Senior Software Engineer with 8 years experience in Java, Spring Boot, and AWS. Currently at Infosys, leading a team of 4 developers. IIT Delhi graduate. Looking for PBC/Product roles in Bangalore. Notice period: 60 days. Current CTC: 28 LPA." },
  { label: "Analyze a JD", icon: FileText, prompt: "Analyze this job description: We are looking for an SAP Program Manager with 12-15 years of experience. Must have strong S/4HANA implementation experience, team management skills, and prior consulting background. PMP certification preferred. Location: Bangalore. Budget: 45-55 LPA." },
  { label: "Score a match", icon: Sparkles, prompt: "Score this candidate-job match: Candidate has 6 years of Oracle SCM experience (Fusion, Cloud), currently at Deloitte, BE from NIT. Job requires Oracle SCM Consultant with 5-8 years, Fusion experience mandatory, location Mumbai, budget 18-25 LPA." },
  { label: "Generate questions", icon: ListChecks, prompt: "Generate 8 interview questions for an AI Solutions Architect role. The role requires expertise in LLMs, RAG architectures, MLOps, and team leadership. Include 2 coding scenario questions." },
  { label: "Write outreach email", icon: Mail, prompt: "Write a professional outreach email to a Manufacturing Sales Director candidate. The role is at a leading industrial automation company expanding into EV battery manufacturing. Candidate has 18+ years of experience in industrial sales. Tone: professional and compelling." },
  { label: "LinkedIn message", icon: Linkedin, prompt: "Write a concise LinkedIn InMail message to a Plant Operations Head in the FMCG sector. Role is with a multinational food processing company. Keep it under 150 characters for the preview. Mention the company name and role." },
  { label: "Search queries", icon: Briefcase, prompt: "Generate 10 Boolean search queries to find SAP SD Consultants with S/4HANA experience in Bangalore. Include variations for different experience levels (5-8 years, 8-12 years) and certification filters (PMP, SAP Certified). Also suggest alternative roles and industries to source from." },
  { label: "Find candidates for role", icon: User, prompt: "I need to find candidates for an SAP Program Manager role. The role requires 12-15 years of SAP experience, S/4HANA implementation experience, team leadership, PMP certification preferred. Location: Bangalore. Budget: 45-55 LPA. Suggest sourcing channels, Boolean search strings, and target companies to source from." },
  { label: "Sourcing strategy", icon: Briefcase, prompt: "Generate a comprehensive sourcing strategy for an Oracle SCM Consultant role. Required: 5-8 years Oracle SCM/Fusion experience, Bangalore location, budget 18-25 LPA. Include Boolean search strings for LinkedIn/Naukri, target competitor companies, industry events, and passive candidate outreach approaches." },
  { label: "Create submission package", icon: FileText, prompt: "Create a client-ready submission package for an AI Solutions Architect candidate. The candidate has 7 years of experience in AI/ML, expertise in LLMs, RAG architectures, and MLOps. Currently at a top product company. Include an executive summary, why-fit statement, skills alignment, compensation analysis, and risk assessment." },
  { label: "Compare candidates", icon: Sparkles, prompt: "Compare these 3 shortlisted candidates for a Plant Operations Head role in the FMCG sector: Candidate 1: Venkatesh Iyer, 18 years experience, currently at Britannia, BE Mechanical. Candidate 2: Lakshmi Narayan, 15 years experience, currently at Nestle, BE + MBA. Candidate 3: Sanjay Pillai, 20 years experience, currently at ITC, Diploma in Engineering. Compare on experience relevance, leadership, industry fit, and compensation expectations." },
  { label: "Hiring manager summary", icon: User, prompt: "Generate a concise hiring manager summary for a Manufacturing Sales Director candidate. Candidate: Mahesh Patil, 22 years of experience in industrial manufacturing sales. Currently heading sales at a leading automation company. Expertise in EV battery manufacturing segment. Include key strengths, relevant industry experience, and why he is a strong fit for this role. Format it as a ready-to-share email." },
];

export function CopilotClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return;

    const userMsg: Message = { role: "user", content: content.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content.trim(), history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ Error: ${e.message || "Failed to get response. Please try again."}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function clearChat() {
    setMessages([]);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 px-1">
        {messages.length === 0 && (
          <div className="text-center pt-8 pb-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Bot className="h-8 w-8" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">How can I help you today?</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Choose an example below or type your own prompt to get started.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-w-3xl mx-auto">
              {EXAMPLE_PROMPTS.map((ep) => (
                <button
                  key={ep.label}
                  onClick={() => sendMessage(ep.prompt)}
                  className="flex items-center gap-2 text-left text-sm p-3 rounded-lg bg-muted/50 hover:bg-accent hover:text-foreground transition-colors border border-border/30"
                >
                  <ep.icon className="h-4 w-4 text-primary shrink-0" />
                  <span>{ep.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div className={`max-w-[80%] ${msg.role === "user" ? "order-first" : ""}`}>
              <div
                className={`rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border/30 shadow-sm rounded-bl-md"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "assistant" && !msg.content.startsWith("❌") && (
                <button
                  onClick={() => copyToClipboard(msg.content, `msg-${i}`)}
                  className="flex items-center gap-1 text-xs text-muted-foreground mt-1 hover:text-foreground transition-colors ml-1"
                >
                  {copiedId === `msg-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedId === `msg-${i}` ? "Copied" : "Copy"}
                </button>
              )}
            </div>
            {msg.role === "user" && (
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-xl bg-card border border-border/30 shadow-sm p-4 rounded-bl-md">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/40 pt-4 mt-4">
        {messages.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <button onClick={clearChat} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> New conversation
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the copilot anything about your recruiting workflow..."
            rows={1}
            className="flex-1 rounded-xl bg-muted/50 border border-border/40 px-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none min-h-[48px] max-h-[120px]"
            disabled={loading}
          />
          <Button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} size="icon" className="h-12 w-12 shrink-0 rounded-xl">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Press Enter to send, Shift+Enter for new line. Powered by OpenRouter.</p>
      </div>
    </div>
  );
}
