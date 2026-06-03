import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const LLM_API_URL = "https://apps.abacus.ai/v1/chat/completions";
const SERPER_API_URL = "https://google.serper.dev/search";

// All supported platforms with their site-search patterns
const PLATFORM_SITES: Record<string, string[]> = {
  linkedin: ["site:linkedin.com/in"],
  naukri: ["site:naukri.com"],
  foundit: ["site:foundit.in", "site:monsterindia.com"],
  indeed: ["site:indeed.com", "site:in.indeed.com"],
  glassdoor: ["site:glassdoor.co.in", "site:glassdoor.com"],
  shine: ["site:shine.com"],
  instahyre: ["site:instahyre.com"],
  hirist: ["site:hirist.tech"],
  iimjobs: ["site:iimjobs.com"],
  cutshort: ["site:cutshort.io"],
};

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  naukri: "Naukri",
  foundit: "FoundIT",
  indeed: "Indeed",
  glassdoor: "Glassdoor",
  shine: "Shine",
  instahyre: "Instahyre",
  hirist: "Hirist",
  iimjobs: "IIMJobs",
  cutshort: "Cutshort",
};

// Detect source from URL
function detectSource(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("linkedin.com")) return "LinkedIn";
  if (u.includes("naukri.com")) return "Naukri";
  if (u.includes("foundit.in") || u.includes("monsterindia.com")) return "FoundIT";
  if (u.includes("indeed.com")) return "Indeed";
  if (u.includes("glassdoor.co") || u.includes("glassdoor.com")) return "Glassdoor";
  if (u.includes("shine.com")) return "Shine";
  if (u.includes("instahyre.com")) return "Instahyre";
  if (u.includes("hirist.tech")) return "Hirist";
  if (u.includes("iimjobs.com")) return "IIMJobs";
  if (u.includes("cutshort.io")) return "Cutshort";
  return "Web";
}

// Make keywords recruitment-friendly (add context so Google doesn't misinterpret short terms)
function enhanceKeywords(keywords: string, skills: string): string {
  const parts: string[] = [];
  if (keywords?.trim()) parts.push(keywords.trim());
  if (skills?.trim()) parts.push(skills.trim());
  const combined = parts.join(" ").trim();
  if (!combined) return "";
  // If the search term is very short or could be a TLD/ambiguous, add "developer" context
  // e.g., ".net" -> ".net developer", "oracle" -> "oracle" (already clear)
  return combined;
}

// Build comprehensive search queries — the KEY to getting more results
function buildSearchQueries(rawKeywords: string, rawSkills: string, platform: string, location: string): string[] {
  const keywords = enhanceKeywords(rawKeywords, rawSkills);
  if (!keywords) return [];
  
  const locationStr = location ? ` "${location}"` : "";
  // Create developer/professional variations to help Google understand intent
  const keywordVariations = [keywords];
  // If the keyword is short or a technology name, add role context
  const isShortTech = keywords.length <= 10 || /^[.#]?\w+$/i.test(keywords.replace(/\s/g, ''));
  if (isShortTech) {
    keywordVariations.push(`"${keywords}" developer`);
    keywordVariations.push(`"${keywords}" engineer`);
    keywordVariations.push(`"${keywords}" architect`);
  }

  if (platform !== "all" && PLATFORM_SITES[platform]) {
    const queries: string[] = [];
    for (const site of PLATFORM_SITES[platform]) {
      for (const kw of keywordVariations) {
        queries.push(`${site} ${kw}${locationStr}`);
      }
    }
    return queries;
  }

  // "All platforms" — generate many targeted queries
  const queries: string[] = [];

  // LinkedIn — multiple variations
  for (const kw of keywordVariations) {
    queries.push(`site:linkedin.com/in ${kw}${locationStr}`);
  }
  // LinkedIn page 2 equivalent — add India context
  queries.push(`site:linkedin.com/in ${keywords}${locationStr ? locationStr : ' India'}`);

  // Naukri — multiple variations
  for (const kw of keywordVariations) {
    queries.push(`site:naukri.com ${kw}${locationStr}`);
  }

  // FoundIT / Indeed
  queries.push(`site:foundit.in ${keywords}${locationStr}`);
  queries.push(`site:indeed.com ${keywords}${locationStr}`);

  // Other platforms grouped
  queries.push(`(site:shine.com OR site:instahyre.com OR site:hirist.tech) ${keywords}${locationStr}`);
  queries.push(`(site:iimjobs.com OR site:cutshort.io OR site:glassdoor.co.in) ${keywords}${locationStr}`);

  // General web — multiple angles to maximize unique results
  queries.push(`"${keywords}" resume India${locationStr}`);
  queries.push(`"${keywords}" profile India${locationStr}`);
  queries.push(`"${keywords}" experience years India${locationStr}`);

  return queries;
}

// Search Google using Serper.dev API — with pagination support
async function searchGoogle(query: string, apiKey: string, numResults: number = 100, page: number = 1): Promise<any[]> {
  try {
    const body: any = {
      q: query,
      num: Math.min(numResults, 100),
      gl: "in",
    };
    if (page > 1) {
      body.page = page;
    }
    const res = await fetch(SERPER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("Serper API error:", res.status, await res.text().catch(() => ""));
      return [];
    }

    const data = await res.json();
    return data.organic || [];
  } catch (error) {
    console.error("Serper search error:", error);
    return [];
  }
}

// BLACKLIST: URLs that are NEVER candidate profiles
const URL_BLACKLIST = /greenstechnolog|resumod\.com|besant|intellipaat|edureka|simplilearn|coursera|udemy|geeksforgeeks|w3schools|tutorialspoint|javatpoint|baeldung|enhancv\.com|zety\.com|resumeworded\.com|scribd\.com|facebook\.com\/groups|quora\.com|stackoverflow\.com\/questions|medium\.com\/|wikipedia\.org|youtube\.com|twitter\.com\/(?!.*\/status)|x\.com\/(?!.*\/status)|pinterest\.com|amazon\.com|flipkart\.com|myntra\.com/i;

// TITLE BLACKLIST: titles that indicate non-profile pages
const TITLE_BLACKLIST = /\d{2,}\s*(job|vacancies|openings|results)|jobs?\s*in\s|jobs?,\s*employ|resume\s*(examples?|templates?|samples?|tips|format|builder)|what\s+are|how\s+to|guide\s+to|tutorial|certification\s+course|syllabus|top\s*\d+\s*(companies|tools|websites|resources|courses|certifications)|salary\s*(guide|survey|comparison|range)|interview\s*questions|\b(apply now|we are hiring|job description|job posting|career opportunities)\b|\b(training|course|batch|placement|institute|academy)\b.*\b(join|enroll|register|admission|fee)\b/i;

// Check if a URL is clearly NOT a candidate profile (blacklist approach — more permissive)
function isBlacklistedUrl(url: string): boolean {
  const u = url.toLowerCase();
  
  // Domain-level blacklist
  if (URL_BLACKLIST.test(u)) return true;
  
  // Path-level blacklist: clearly job aggregation / article pages
  if (/\/job-listings-|\/(jobs|careers|vacancies|openings|hiring)\/|\/(blog|article|news|tutorial|guide|how-to|learn|course|training|syllabus|curriculum|placement)\//i.test(u)) {
    // Exception: if URL also contains profile-like segments, let it through
    if (/\/(profile|resume|candidate|cv|in\/|mnjuser|\/r\/)/i.test(u)) return false;
    return true;
  }
  
  // Naukri-specific: reject job listing aggregation pages  
  if (u.includes("naukri.com")) {
    if (/naukri\.com\/[a-z-]+-jobs($|[?#/])/i.test(u)) return true;
    if (u.includes("/code360/") || u.includes("/library/")) return true;
    if (u.includes("/job-listings-")) return true;
    if (u.includes("/recruit/") || u.includes("/companies/")) return true;
  }
  
  return false;
}

// NAME BLACKLIST: these are NOT person names
const NAME_BLACKLIST_START = /^(senior|junior|lead|manager|director|head|chief|vp|cto|ceo|cfo|hiring|jobs?|careers?|sr\.?\s|jr\.?\s|the\s|www|http)/i;
const NAME_BLACKLIST_END = /\b(developer|engineer|analyst|architect|consultant|manager|administrator|specialist|expert|services?|solutions?|technologies?|consulting|training|institute|academy|sample|example|template|plsql|pl\/sql|dba|apps?|inc|ltd|llc|pvt|corporation|company|group|associates?)\s*$/i;
const NAME_BLACKLIST_EXACT = new Set([
  "oracle", "java", "python", "react", "angular", "docker", "kubernetes", "aws", "azure",
  "devops", "sql", "mongodb", "hadoop", "spark", "kafka", "redis", "tableau", "salesforce",
  "sap", "figma", "selenium", "jenkins", "terraform", "git", "linux", "agile", "scrum",
  "sample", "test", "admin", "user", "demo", "example", "resume", "profile", "candidate",
  ".net", "dotnet", "php", "ruby", "scala", "golang", "flutter", "swift", "kotlin",
]);

// Validate that a name looks like a real person's name
function isValidPersonName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 60) return false;
  // Must not start with a digit
  if (/^\d/.test(name)) return false;
  // Must not contain job/search related words
  if (/job|vacanc|employ|search|listing|opening|result|hiring|recruit/i.test(name)) return false;
  // Must not start with a role/title
  if (NAME_BLACKLIST_START.test(name)) return false;
  // Must not end with a role/company word
  if (NAME_BLACKLIST_END.test(name)) return false;
  // Single-word check: must not be a known tech term
  const nameLower = name.toLowerCase().trim();
  if (!name.includes(" ") && NAME_BLACKLIST_EXACT.has(nameLower)) return false;
  // If single word and starts with common tech prefixes, reject
  if (!name.includes(" ") && /^(java|python|oracle|angular|react|node|spring|docker|aws|azure|devops|sql|data|full|front|back|software|web|mobile|cloud|machine|deep|business|project|product|quality|test|automation|network|system|database|security)/i.test(nameLower)) return false;
  // Name should contain at least one letter
  if (!/[a-zA-Z]/.test(name)) return false;
  return true;
}

// Extract candidate info from a search result snippet
function extractCandidate(result: any): any | null {
  const title = result.title || "";
  const snippet = result.snippet || "";
  const url = result.link || "";

  if (!url) return null;

  // STEP 1: Blacklist check (fast rejection)
  if (isBlacklistedUrl(url)) return null;

  const source = detectSource(url);

  // STEP 2: For known platforms, apply platform-specific URL validation
  if (source === "LinkedIn") {
    if (!/linkedin\.com\/in\/[a-z0-9-]+/i.test(url)) return null;
    if (url.toLowerCase().includes("/jobs/") || url.toLowerCase().includes("/company/")) return null;
  }
  // For other platforms: we already rejected blacklisted URLs above
  // Don't over-filter — let the name validation handle quality control

  // STEP 3: Title-based rejection
  if (TITLE_BLACKLIST.test(title)) return null;

  // STEP 4: Extract name from title
  let name = "";
  if (source === "LinkedIn") {
    const parts = title.split(" - ");
    name = parts[0]?.replace(/\s*\|.*$/, "").trim() || "";
  } else if (source === "Naukri") {
    const parts = title.split(" - ");
    name = parts[0]?.replace(/\s*\|.*$/, "").replace(/\s*Profile.*$/i, "").trim() || "";
  } else {
    // Generic: take first segment before any separator
    name = title.split(/\s*[-|–—]\s*/)[0]?.trim() || "";
  }

  // Clean name
  name = name.replace(/\s*(Resume|Profile|CV|MBA|B\.?Tech|M\.?Tech|B\.?E|M\.?E|PMP|CSM).*$/i, "").trim();
  name = name.replace(/\s*\(.*\)\s*$/, "").trim(); // Remove trailing parenthetical
  name = name.replace(/[,.]\s*$/, "").trim(); // Remove trailing punctuation

  // STEP 5: Validate name
  if (!isValidPersonName(name)) return null;

  // STEP 6: Extract other fields
  const titleParts = title.split(/\s*[-|–—]\s*/);
  let designation = "";
  if (titleParts.length > 1) {
    designation = titleParts[1]?.replace(/\s*at\s+.*$/i, "").replace(/\s*\|.*$/, "").trim() || "";
  }

  let company = "";
  const atMatch = title.match(/\bat\s+([^|.\-–—]+)/i) || snippet.match(/\bat\s+([^|.\-–—,]+)/i);
  if (atMatch) company = atMatch[1].trim();
  else if (titleParts.length > 2) company = titleParts[2]?.replace(/\s*\|.*$/, "").trim() || "";

  let experience = 0;
  const expMatch = snippet.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
  if (expMatch) experience = parseInt(expMatch[1]) || 0;

  let location = "";
  const cityPattern = /\b(Mumbai|Bangalore|Bengaluru|Delhi|NCR|Hyderabad|Chennai|Pune|Kolkata|Noida|Gurgaon|Gurugram|Ahmedabad|Jaipur|Lucknow|Kochi|Chandigarh|Indore|Nagpur|Coimbatore|Thiruvananthapuram|Visakhapatnam|Bhopal|Vadodara|Surat|Mysore|Mangalore|Patna|Ranchi|Bhubaneswar|Dehradun|Thane|Navi Mumbai|Faridabad|Ghaziabad|Remote|India)\b/i;
  const locMatch = snippet.match(cityPattern) || title.match(cityPattern);
  if (locMatch) location = locMatch[1];

  const skillPatterns = /\b(Java|Python|JavaScript|TypeScript|React|Angular|Vue|Node\.?js|Spring\s*Boot|\.NET|ASP\.?NET|C#|VB\.?NET|WCF|WPF|MVC|Entity Framework|LINQ|Blazor|Azure|AWS|GCP|Docker|Kubernetes|SQL|SQL Server|MongoDB|PostgreSQL|MySQL|DevOps|Machine Learning|AI|Data Science|Tableau|Power BI|SAP|Salesforce|Figma|UI\/UX|Flutter|Swift|Kotlin|Go|Rust|C\+\+|PHP|Ruby|Scala|Hadoop|Spark|Terraform|Jenkins|Git|Linux|Agile|Scrum|Microservices|REST|GraphQL|HTML|CSS|Selenium|Cypress|Jira|Confluence|Snowflake|Databricks|Airflow|Kafka|Redis|ElasticSearch|TensorFlow|PyTorch|NLP|LLM|GenAI|Generative AI|Deep Learning|Computer Vision|Blockchain|Solidity|MATLAB|Excel|VBA|Looker|dbt|SharePoint|Dynamics|Power\s*Apps|Power\s*Automate|SSRS|SSIS|SSAS|T-SQL|Oracle|PL\/SQL)\b/gi;
  const skillsFound = snippet.match(skillPatterns) || [];
  const skills = [...new Set(skillsFound.map((s: string) => s.trim()))];

  // Extract email/phone from snippet
  let email: string | null = null;
  const emailMatch = (snippet + " " + title).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  if (emailMatch) {
    const found = emailMatch[0].toLowerCase();
    if (!/^(info|contact|hr|admin|support|noreply|no-reply|hello|team|sales|careers|jobs|recruit)@/i.test(found)) {
      email = found;
    }
  }

  let phone: string | null = null;
  const phonePatterns = [
    /(?:\+91[\s.-]?)?[6-9]\d{4}[\s.-]?\d{5}/,
    /(?:\+91[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/,
    /(?:\+91[\s.-]?)?\d{5}[\s.-]?\d{5}/,
  ];
  for (const p of phonePatterns) {
    const m = (snippet + " " + title).match(p);
    if (m) {
      let ph = m[0].replace(/[\s.-]/g, "");
      if (ph.length >= 10 && ph.length <= 13) {
        phone = ph.startsWith("+") ? ph : (ph.length === 10 ? `+91${ph}` : ph);
        break;
      }
    }
  }

  return {
    name,
    designation: designation.substring(0, 100),
    company: company.substring(0, 100),
    experience,
    location,
    skills: skills.slice(0, 10),
    education: "",
    expectedCtc: null,
    source,
    profileUrl: url,
    profileSummary: snippet.substring(0, 200),
    email,
    phone,
  };
}

// Enrich sparse profiles with LLM (only for designation/company, NOT email/phone)
async function enrichProfilesWithLLM(
  profiles: any[],
  apiKey: string,
  searchContext: string
): Promise<any[]> {
  const needsEnrichment = profiles.filter(
    (c) => !c.designation || !c.company
  );
  if (needsEnrichment.length === 0) return profiles;

  // Process in batches of 30
  const batchSize = 30;
  for (let i = 0; i < needsEnrichment.length; i += batchSize) {
    const batch = needsEnrichment.slice(i, i + batchSize);
    const formatted = batch
      .map(
        (c, idx) =>
          `${idx + 1}. Name: ${c.name} | Title: ${c.designation || "unknown"} | Company: ${c.company || "unknown"} | Snippet: ${c.profileSummary}`
      )
      .join("\n");

    try {
      const llmRes = await fetch(LLM_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a recruitment data parser. Extract designation and company from profile snippets. Return ONLY a JSON array with objects {index, designation, company}. Index is 1-based. Only return entries where you found new info. Do NOT generate email or phone.",
            },
            {
              role: "user",
              content: `Context: Searching for ${searchContext}\n\nExtract designation and company for these profiles:\n${formatted}`,
            },
          ],
          temperature: 0,
          max_tokens: 2000,
        }),
      });

      if (!llmRes.ok) continue;

      const llmData = await llmRes.json();
      const content = llmData.choices?.[0]?.message?.content || "[]";
      const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        const enriched = JSON.parse(jsonMatch[0]);
        for (const e of enriched) {
          const idx = (e.index || 0) - 1;
          if (idx >= 0 && idx < batch.length) {
            if (e.designation) batch[idx].designation = e.designation;
            if (e.company) batch[idx].company = e.company;
          }
        }
      }
    } catch {
      // Enrichment is optional
    }
  }

  return profiles;
}

function formatCandidate(c: any, idx: number) {
  return {
    id: `web-${Date.now()}-${idx}`,
    name: c.name || "Unknown",
    designation: c.designation || "",
    company: c.company || "",
    experience: c.experience || 0,
    location: c.location || "",
    skills: Array.isArray(c.skills) ? c.skills : (c.skills ? [c.skills] : []),
    education: c.education || "",
    expectedCtc: c.expectedCtc || null,
    source: c.source || "Web",
    profileSummary: c.profileSummary || "",
    email: c.email || null,
    phone: c.phone || null,
    profileUrl: c.profileUrl || null,
  };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { keywords, location, experience, skills, platform = "all", resultCount = 999 } = await req.json();

    if (!keywords?.trim() && !skills?.trim()) {
      return NextResponse.json(
        { error: "Please enter keywords or skills to search" },
        { status: 400 }
      );
    }

    const serperApiKey = process.env.SERPER_API_KEY;
    const llmApiKey = process.env.ABACUSAI_API_KEY;

    if (!serperApiKey) {
      return NextResponse.json({ error: "Search service not configured" }, { status: 500 });
    }
    if (!llmApiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const locationStr = location?.trim() || "";

    // Build comprehensive search queries
    const queries = buildSearchQueries(keywords?.trim() || "", skills?.trim() || "", platform, locationStr);
    
    // Add experience context to queries if provided
    const expSuffix = experience?.trim() ? ` ${experience} years experience` : "";
    const finalQueries = queries.map(q => q + expSuffix);

    console.log(`[WebSearch] Running ${finalQueries.length} queries for: keywords="${keywords}" skills="${skills}" location="${locationStr}"`);

    // Run ALL searches in parallel — request max results per query
    const searchPromises = finalQueries.map(q => searchGoogle(q, serperApiKey, 100));
    const allSearchResults = await Promise.all(searchPromises);

    // Log per-query results for diagnostics
    let totalRaw = 0;
    allSearchResults.forEach((results, i) => {
      totalRaw += results.length;
      if (results.length > 0) {
        console.log(`[WebSearch] Query ${i + 1}: ${results.length} results — "${finalQueries[i].substring(0, 80)}..."`);
      }
    });
    console.log(`[WebSearch] Total raw results: ${totalRaw}`);

    // Flatten and deduplicate by URL
    const seenUrls = new Set<string>();
    const uniqueResults: any[] = [];
    for (const results of allSearchResults) {
      for (const r of results) {
        const url = (r.link || "").toLowerCase().replace(/\/$/, "");
        if (url && !seenUrls.has(url)) {
          seenUrls.add(url);
          uniqueResults.push(r);
        }
      }
    }
    console.log(`[WebSearch] Unique URLs after dedup: ${uniqueResults.length}`);

    // Extract candidates from snippets
    const extracted = uniqueResults
      .map(r => extractCandidate(r))
      .filter((c): c is NonNullable<typeof c> => c !== null);
    console.log(`[WebSearch] After extraction & validation: ${extracted.length}`);

    // Deduplicate by normalized name
    const seenNames = new Set<string>();
    const uniqueCandidates = extracted.filter(c => {
      const key = c.name.toLowerCase().replace(/[^a-z ]/g, "").trim();
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });
    console.log(`[WebSearch] After name dedup: ${uniqueCandidates.length}`);

    // Enforce platform source if specific platform selected
    if (platform !== "all" && PLATFORM_LABELS[platform]) {
      uniqueCandidates.forEach(c => { c.source = PLATFORM_LABELS[platform]; });
    }

    // Enrich sparse profiles with LLM
    const searchContext = `${keywords || ""} ${skills || ""}${locationStr ? ` in ${locationStr}` : ""}`;
    const finalCandidates = await enrichProfilesWithLLM(
      uniqueCandidates,
      llmApiKey,
      searchContext
    );

    const formatted = finalCandidates.map((c, idx) => formatCandidate(c, idx));

    // Build source summary
    const sourceCounts: Record<string, number> = {};
    formatted.forEach(c => { sourceCounts[c.source] = (sourceCounts[c.source] || 0) + 1; });
    const sourceList = Object.entries(sourceCounts).map(([k, v]) => `${k} (${v})`).join(", ");

    return NextResponse.json({
      candidates: formatted,
      totalCount: formatted.length,
      page: 1,
      pageSize: formatted.length,
      totalPages: 1,
      note: `Found ${formatted.length} real profiles from: ${sourceList || "various platforms"}. Click \"Profile\" to view on the original platform.`,
    });
  } catch (error) {
    console.error("Web search error:", error);
    return NextResponse.json({ error: "Web search failed" }, { status: 500 });
  }
}
