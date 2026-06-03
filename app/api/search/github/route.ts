import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { skills, location, minRepos, language, page = 1 } = await req.json();

    // Build GitHub search query
    const queryParts: string[] = [];

    if (skills?.trim()) {
      // Skills go into the general query as keywords (searches bio, name, username)
      queryParts.push(skills.trim());
    }

    if (location?.trim()) {
      queryParts.push(`location:"${location.trim()}"`);
    }

    if (language?.trim()) {
      queryParts.push(`language:${language.trim()}`);
    }

    if (minRepos && parseInt(minRepos) > 0) {
      queryParts.push(`repos:>=${minRepos}`);
    }

    // Default: search for developers with repos
    if (queryParts.length === 0) {
      queryParts.push("repos:>=5");
    }

    const query = queryParts.join(" ");
    const perPage = 20;

    // Search users
    const searchRes = await fetch(
      `https://api.github.com/search/users?q=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "CloudCXO-Recruitment",
        },
      }
    );

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      console.error("GitHub search error:", searchRes.status, errText);
      return NextResponse.json(
        { error: `GitHub API error: ${searchRes.status}`, details: errText },
        { status: searchRes.status }
      );
    }

    const searchData = await searchRes.json();
    const totalCount = Math.min(searchData.total_count || 0, 1000); // GitHub caps at 1000

    // Fetch detailed profiles for the results (limit to avoid rate limits)
    const users = searchData.items?.slice(0, 10) || [];
    const detailedProfiles = await Promise.all(
      users.map(async (user: any) => {
        try {
          const profileRes = await fetch(`https://api.github.com/users/${user.login}`, {
            headers: {
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "CloudCXO-Recruitment",
            },
          });
          if (profileRes.ok) {
            return await profileRes.json();
          }
          return user;
        } catch {
          return user;
        }
      })
    );

    // Format results
    const candidates = detailedProfiles.map((u: GitHubUser) => ({
      id: `github-${u.id}`,
      name: u.name || u.login,
      username: u.login,
      email: u.email,
      location: u.location,
      company: u.company,
      bio: u.bio,
      avatarUrl: u.avatar_url,
      profileUrl: u.html_url,
      blogUrl: u.blog,
      repos: u.public_repos,
      followers: u.followers,
      source: "GITHUB",
    }));

    return NextResponse.json({
      candidates,
      totalCount,
      page,
      pageSize: perPage,
      totalPages: Math.ceil(totalCount / perPage),
      rateLimitNote: "GitHub API: 60 requests/hour (unauthenticated). Results limited to top profiles.",
    });
  } catch (error) {
    console.error("GitHub search error:", error);
    return NextResponse.json({ error: "GitHub search failed" }, { status: 500 });
  }
}
