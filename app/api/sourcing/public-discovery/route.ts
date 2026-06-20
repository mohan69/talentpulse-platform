import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guards";

export const dynamic = "force-dynamic";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function parseGithubLead(item: any) {
  return {
    name: item.name || item.login || "GitHub profile",
    company: item.company ?? null,
    role: item.bio?.split(/[.|-]/)[0]?.trim() || null,
    location: item.location ?? null,
    publicUrl: item.html_url ?? null,
    source: "GitHub",
    notes: [item.bio, item.public_repos ? `${item.public_repos} public repos` : null, item.followers ? `${item.followers} followers` : null]
      .filter(Boolean)
      .join(" · "),
  };
}

function parseGoogleLead(item: any) {
  const title = clean(item.title).replace(/\s+-\s+LinkedIn.*$/i, "").replace(/\s+\|\s+.*$/i, "");
  const parts = title.split(/\s+-\s+/);
  return {
    name: parts[0] || title || "Public profile",
    company: parts[2] ?? null,
    role: parts[1] ?? null,
    location: null,
    publicUrl: item.link ?? null,
    source: item.displayLink?.includes("linkedin") ? "LinkedIn Manual" : "Google PSE",
    notes: clean(item.snippet),
  };
}

async function githubSearch(query: string) {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_API_TOKEN;
  if (!token) return NextResponse.json({ error: "GitHub API credential missing. Set GITHUB_TOKEN or GITHUB_API_TOKEN." }, { status: 503 });

  const search = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(`${query} repos:>=2`)}&per_page=10`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "TalentPulse-Candidate-Acquisition",
    },
  });
  if (!search.ok) return NextResponse.json({ error: `GitHub API error ${search.status}` }, { status: search.status });
  const data = await search.json();
  const profiles = await Promise.all((data.items ?? []).slice(0, 8).map(async (item: any) => {
    const profile = await fetch(`https://api.github.com/users/${item.login}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "TalentPulse-Candidate-Acquisition",
      },
    });
    return profile.ok ? profile.json() : item;
  }));
  return NextResponse.json({ leads: profiles.map(parseGithubLead), message: `${profiles.length} GitHub leads found via official API.` });
}

async function googleSearch(query: string) {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!apiKey || !cx) return NextResponse.json({ error: "Google Programmable Search credential missing. Set GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX." }, { status: 503 });

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", `${query} candidate profile resume`);
  url.searchParams.set("num", "10");
  const response = await fetch(url);
  if (!response.ok) return NextResponse.json({ error: `Google Programmable Search error ${response.status}` }, { status: response.status });
  const data = await response.json();
  const leads = (data.items ?? []).map(parseGoogleLead).filter((lead: any) => lead.publicUrl);
  return NextResponse.json({ leads, message: `${leads.length} public leads found via Google Programmable Search.` });
}

export async function POST(request: Request) {
  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const source = clean(body.source).toLowerCase();
  const query = clean(body.query);
  if (!query) return NextResponse.json({ error: "Search query is required." }, { status: 400 });

  if (source === "github") return githubSearch(query);
  if (source === "google") return googleSearch(query);
  return NextResponse.json({ error: "Unsupported public discovery source." }, { status: 400 });
}
