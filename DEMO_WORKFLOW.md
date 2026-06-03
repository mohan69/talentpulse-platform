# TalentPulse Demo Workflow (3-5 minutes)

## Demo Credentials
- **URL:** https://talentpulse.vercel.app (or local dev URL)
- **Admin:** admin@talentpulse.demo / demo123
- **Recruiter:** recruiter1@talentpulse.demo / demo123

## Prerequisites
- [ ] App deployed and accessible
- [ ] Demo data seeded (`npx prisma db seed`)
- [ ] OpenRouter API key configured
- [ ] Browser window maximized (1920x1080 recommended)

---

## Step 1: Dashboard (30s)
1. Navigate to login page
2. Enter admin@talentpulse.demo / demo123
3. **Show:** "Talent Intelligence Command Center" — stat cards (Open Jobs, Pipeline, Interviews, Prospects)
4. **Narrate:** "This is your command center. At a glance you see your pipeline health, active requisitions, and key metrics."

## Step 2: Open a Requisition (30s)
5. Click "Requisitions" in sidebar
6. **Show:** List of 5 active requisitions (SAP Program Manager, Oracle SCM Consultant, AI Solutions Architect, etc.)
7. Click on "SAP Program Manager"
8. **Show:** Job detail with description, skills, salary range, assigned recruiter, and "Job Posting" tracker
9. **Narrate:** "Each requisition shows full details, assigned recruiter, and multi-platform posting status."

## Step 3: View Talent Repository (30s)
10. Click "Talent Repository" in sidebar
11. **Show:** List of candidates with names, titles, companies, skills, and application count
12. **Narrate:** "The Talent Repository is your AI-augmented candidate database. Every profile is enriched with skills, experience, CTC expectations, and AI summaries."

## Step 4: Run AI Match (30s)
13. Click back into the SAP Program Manager requisition
14. Navigate to the Pipeline tab
15. **Show:** Kanban board with candidates in various stages
16. Point out a candidate with a high match score (e.g., 92%)
17. **Narrate:** "Every candidate in the pipeline has an AI match score based on skill overlap, experience alignment, location fit, and CTC expectations. Our AI screening runs in under 30 seconds per candidate."

## Step 5: Open a Candidate (30s)
18. Click on a candidate name (e.g., Suresh Rao)
19. **Show:** Full candidate profile — skills, experience, CTC, education, projects, notes, AI summary
20. **Narrate:** "Each profile is a complete dossier — AI-generated summary, project history, structured compensation data, and collaboration notes from the team."

## Step 6: Generate Interview Questions (30s)
21. Open the Recruiter Copilot (click "Copilot" in sidebar)
22. Click the "Generate questions" example prompt button
23. **Show:** AI generates interview questions for the role
24. **Narrate:** "Our Recruiter Copilot can generate tailored interview questions for any role. Just describe the position and get ready-to-use questions."

## Step 7: Generate Outreach Message (30s)
25. In Copilot, click the "Write outreach email" example prompt
26. **Show:** AI generates a personalized outreach email
27. **Narrate:** "The same Copilot writes personalized outreach emails and LinkedIn messages — saving hours of drafting time per recruiter per week."

## Step 8: Move Candidate Through Pipeline (30s)
28. Navigate to Pipeline
29. Drag a candidate card from one stage to another
30. **Show:** Immediate visual update
31. **Narrate:** "The Kanban pipeline gives you drag-and-drop control. Move candidates through 11 stages from New to Joined."

## Step 9: Show Recruiter Copilot (30s)
32. Back in Copilot, show the example prompts grid
33. Click a few more examples (Analyze a JD, Score a match, LinkedIn message)
34. **Show:** Quick, relevant responses each time
35. **Narrate:** "The Copilot understands your workflow context. It can summarize candidates, analyze job descriptions, score matches, generate questions, write emails, and craft LinkedIn messages — all through OpenRouter-powered AI."

## Closing (15s)
36. **Narrate:** "That's the TalentPulse platform in 3 minutes. AI-native talent intelligence for sourcing, screening, pipeline velocity, and hiring closure. Ready to see how it works for your team?"

---

## Demo Checklist
- [ ] Landing page loads with updated hero
- [ ] Login works with demo credentials
- [ ] Admin dashboard shows stats
- [ ] Requisitions list is populated
- [ ] Job detail page renders
- [ ] Talent Repository shows 28 candidates
- [ ] Pipeline Kanban board renders with candidates
- [ ] Candidate profile page loads
- [ ] Copilot generates responses (OpenRouter live)
- [ ] Example prompts work
- [ ] Drag-and-drop pipeline works
- [ ] Mobile responsive (optional)

## Fallback Plan
- **If OpenRouter is down:** Show the Copilot UI with example prompts; explain the AI integration architecture
- **If demo data is missing:** Run `npx tsx --require dotenv/config scripts/seed-demo.ts`
- **If pipeline drag fails:** Use stage dropdown in candidate detail
