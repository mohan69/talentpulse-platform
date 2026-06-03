import { PrismaClient, UserRole, PipelineStage, JobPriority, JobStatus, CandidateSource } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding CloudCXO");

  // ----- CLIENTS -----
  const barclays = await prisma.client.upsert({
    where: { name: "Barclays" },
    update: {},
    create: {
      name: "Barclays",
      industry: "Banking & Financial Services",
      website: "https://www.barclays.in",
      description: "British multinational investment bank and financial services company.",
      contactName: "Priya Desai",
      contactEmail: "hr@barclays.com",
      contactPhone: "+91 98100 00001",
      address: "Pune, India",
    },
  });
  const bosch = await prisma.client.upsert({
    where: { name: "Bosch" },
    update: {},
    create: {
      name: "Bosch",
      industry: "Engineering & Manufacturing",
      website: "https://www.bosch.in",
      description: "Multinational engineering and technology company.",
      contactName: "Ramesh Shetty",
      contactEmail: "talent@bosch.com",
      contactPhone: "+91 98100 00002",
      address: "Bengaluru, India",
    },
  });
  const lti = await prisma.client.upsert({
    where: { name: "LTIMindtree" },
    update: {},
    create: {
      name: "LTIMindtree",
      industry: "IT Services & Consulting",
      website: "https://www.ltimindtree.com",
      description: "Global technology consulting and digital solutions company.",
      contactName: "Anita Rao",
      contactEmail: "careers@ltimindtree.com",
      contactPhone: "+91 98100 00003",
      address: "Mumbai, India",
    },
  });

  // ----- USERS -----
  const adminHash = await bcrypt.hash("john123", 10);
  const recruiterHash = await bcrypt.hash("recruiter123", 10);
  const clientHash = await bcrypt.hash("client123", 10);
  const candidateHash = await bcrypt.hash("candidate123", 10);
  const defaultHash = await bcrypt.hash("johndoe123", 10);

  const defaultUser = await prisma.user.upsert({
    where: { email: "john@doe.com" },
    update: {},
    create: {
      email: "john@doe.com",
      passwordHash: defaultHash,
      name: "John Doe",
      role: UserRole.ADMIN,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "john.sagayaraj@careerpathsindia.com" },
    update: {
      passwordHash: adminHash,
      name: "John Sagayaraj",
      role: UserRole.ADMIN,
      phone: "+91 99723 44773",
    },
    create: {
      email: "john.sagayaraj@careerpathsindia.com",
      passwordHash: adminHash,
      name: "John Sagayaraj",
      role: UserRole.ADMIN,
      phone: "+91 99723 44773",
    },
  });

  const recruiter1 = await prisma.user.upsert({
    where: { email: "priya@careerpathsindia.com" },
    update: {},
    create: {
      email: "priya@careerpathsindia.com",
      passwordHash: recruiterHash,
      name: "Priya Pandey",
      role: UserRole.RECRUITER,
      phone: "+91 98765 00001",
    },
  });
  const recruiter2 = await prisma.user.upsert({
    where: { email: "pramila@careerpathsindia.com" },
    update: {},
    create: {
      email: "pramila@careerpathsindia.com",
      passwordHash: recruiterHash,
      name: "Pramila John",
      role: UserRole.RECRUITER,
      phone: "+91 98765 00002",
    },
  });
  const recruiter3 = await prisma.user.upsert({
    where: { email: "karthik@careerpathsindia.com" },
    update: {},
    create: {
      email: "karthik@careerpathsindia.com",
      passwordHash: recruiterHash,
      name: "Karthik Menon",
      role: UserRole.RECRUITER,
      phone: "+91 98765 00003",
    },
  });

  const clientUser = await prisma.user.upsert({
    where: { email: "hr@barclays.com" },
    update: {},
    create: {
      email: "hr@barclays.com",
      passwordHash: clientHash,
      name: "Priya Desai",
      role: UserRole.CLIENT,
      clientId: barclays.id,
      phone: "+91 99999 11111",
    },
  });
  const clientUser2 = await prisma.user.upsert({
    where: { email: "talent@bosch.com" },
    update: {},
    create: {
      email: "talent@bosch.com",
      passwordHash: clientHash,
      name: "Ramesh Shetty",
      role: UserRole.CLIENT,
      clientId: bosch.id,
    },
  });

  // ----- JOBS -----
  const job1 = await prisma.job.upsert({
    where: { id: "job-senior-java-barclays" },
    update: {},
    create: {
      id: "job-senior-java-barclays",
      title: "Senior Java Developer",
      clientId: barclays.id,
      location: "Pune, India",
      jobType: "Full-time",
      experienceMin: 6,
      experienceMax: 10,
      skills: ["Java", "Spring Boot", "Microservices", "Kafka", "AWS", "PostgreSQL"],
      description: "We are looking for an experienced Java engineer to build high-throughput trading platforms. Must have solid background in distributed systems, messaging (Kafka), and cloud deployments on AWS. Strong problem-solving and mentorship skills required.",
      salaryMin: 2500000,
      salaryMax: 4000000,
      openings: 2,
      priority: JobPriority.HIGH,
      status: JobStatus.OPEN,
      sourcePrefs: ["LINKEDIN", "NAUKRI"],
      createdById: admin.id,
      recruiterId: recruiter1.id,
    },
  });
  const job2 = await prisma.job.upsert({
    where: { id: "job-iot-architect-bosch" },
    update: {},
    create: {
      id: "job-iot-architect-bosch",
      title: "IoT Solution Architect",
      clientId: bosch.id,
      location: "Bengaluru, India",
      jobType: "Full-time",
      experienceMin: 8,
      experienceMax: 14,
      skills: ["IoT", "MQTT", "Azure IoT Hub", "Edge Computing", "C++", "Python", "Docker"],
      description: "Architect and design IoT platforms for industrial use-cases. Experience with Azure IoT Hub and edge devices required. Will own architecture decisions across automotive electronics products.",
      salaryMin: 3500000,
      salaryMax: 5500000,
      openings: 1,
      priority: JobPriority.URGENT,
      status: JobStatus.OPEN,
      sourcePrefs: ["LINKEDIN", "REFERRAL"],
      createdById: admin.id,
      recruiterId: recruiter2.id,
    },
  });
  const job3 = await prisma.job.upsert({
    where: { id: "job-ml-engineer-lti" },
    update: {},
    create: {
      id: "job-ml-engineer-lti",
      title: "ML Engineer — LLM Platform",
      clientId: lti.id,
      location: "Bengaluru, India",
      jobType: "Full-time",
      experienceMin: 4,
      experienceMax: 8,
      skills: ["Python", "PyTorch", "LLM", "RAG", "Vector DB", "AWS SageMaker", "LangChain"],
      description: "Join our AI platform team to build production LLM applications. Strong Python, hands-on with RAG pipelines, fine-tuning and vector stores. Must have shipped at least one LLM product to production.",
      salaryMin: 2000000,
      salaryMax: 3500000,
      openings: 3,
      priority: JobPriority.MEDIUM,
      status: JobStatus.OPEN,
      sourcePrefs: ["LINKEDIN", "NAUKRI", "REFERRAL"],
      createdById: admin.id,
      recruiterId: recruiter3.id,
    },
  });

  // ----- CANDIDATES -----
  const candidatesData = [
    {
      id: "cand-rahul-kumar",
      name: "Rahul Kumar",
      email: "rahul.kumar@example.com",
      phone: "+91 98111 11111",
      currentCity: "Pune",
      preferredLocations: ["Pune", "Bengaluru"],
      willRelocate: true,
      currentCompany: "Synechron",
      currentDesignation: "Senior Software Engineer",
      totalExperience: 7.5,
      relevantExperience: 6,
      skills: ["Java", "Spring Boot", "Microservices", "Kafka", "AWS", "PostgreSQL", "Docker"],
      degree: "B.Tech Computer Science",
      institution: "VIT Pune",
      graduationYear: 2016,
      currentCtc: 2200000,
      expectedCtc: 3200000,
      ctcFixed: 2000000,
      ctcVariable: 200000,
      noticePeriod: 60,
      source: CandidateSource.LINKEDIN,
      linkedinUrl: "https://linkedin.com/in/rahulkumar",
      ownerId: recruiter1.id,
    },
    {
      id: "cand-ananya-sharma",
      name: "Ananya Sharma",
      email: "ananya.sharma@example.com",
      phone: "+91 98111 11112",
      currentCity: "Mumbai",
      preferredLocations: ["Pune", "Mumbai"],
      willRelocate: true,
      currentCompany: "Barclays",
      currentDesignation: "Tech Lead",
      totalExperience: 9,
      skills: ["Java", "Spring Boot", "Microservices", "Kafka", "Kubernetes"],
      degree: "M.Tech CSE",
      institution: "IIT Bombay",
      graduationYear: 2015,
      currentCtc: 3000000,
      expectedCtc: 3800000,
      noticePeriod: 90,
      source: CandidateSource.REFERRAL,
      ownerId: recruiter1.id,
    },
    {
      id: "cand-vikram-iyer",
      name: "Vikram Iyer",
      email: "vikram.iyer@example.com",
      phone: "+91 98111 11113",
      currentCity: "Bengaluru",
      preferredLocations: ["Bengaluru"],
      willRelocate: false,
      currentCompany: "Robert Bosch",
      currentDesignation: "Principal Architect",
      totalExperience: 12,
      skills: ["IoT", "MQTT", "Azure IoT Hub", "Edge Computing", "C++", "Python", "Docker"],
      degree: "B.E. Electronics",
      institution: "BMSCE Bengaluru",
      graduationYear: 2012,
      currentCtc: 4200000,
      expectedCtc: 5200000,
      noticePeriod: 60,
      source: CandidateSource.LINKEDIN,
      ownerId: recruiter2.id,
    },
    {
      id: "cand-sneha-reddy",
      name: "Sneha Reddy",
      email: "sneha.reddy@example.com",
      phone: "+91 98111 11114",
      currentCity: "Hyderabad",
      preferredLocations: ["Bengaluru", "Hyderabad"],
      willRelocate: true,
      currentCompany: "Rakuten",
      currentDesignation: "Senior Data Scientist",
      totalExperience: 5,
      skills: ["Python", "PyTorch", "LLM", "RAG", "Vector DB", "LangChain", "MLOps"],
      degree: "M.S. Computer Science",
      institution: "IIIT Hyderabad",
      graduationYear: 2019,
      currentCtc: 2500000,
      expectedCtc: 3300000,
      noticePeriod: 45,
      source: CandidateSource.NAUKRI,
      ownerId: recruiter3.id,
    },
    {
      id: "cand-arjun-nair",
      name: "Arjun Nair",
      email: "arjun.nair@example.com",
      phone: "+91 98111 11115",
      currentCity: "Bengaluru",
      preferredLocations: ["Bengaluru"],
      willRelocate: false,
      currentCompany: "Freshworks",
      currentDesignation: "Staff Engineer",
      totalExperience: 8,
      skills: ["Python", "PyTorch", "LLM", "LangChain", "AWS SageMaker", "Airflow"],
      degree: "B.Tech Computer Science",
      institution: "NIT Trichy",
      graduationYear: 2016,
      currentCtc: 3500000,
      expectedCtc: 4200000,
      noticePeriod: 30,
      source: CandidateSource.LINKEDIN,
      ownerId: recruiter3.id,
    },
    {
      id: "cand-divya-kapoor",
      name: "Divya Kapoor",
      email: "divya.kapoor@example.com",
      phone: "+91 98111 11116",
      currentCity: "Pune",
      preferredLocations: ["Pune"],
      willRelocate: false,
      currentCompany: "Happiest Minds",
      currentDesignation: "Senior Engineer",
      totalExperience: 6,
      skills: ["Java", "Spring Boot", "AWS", "PostgreSQL"],
      degree: "B.E. CSE",
      institution: "COEP Pune",
      graduationYear: 2018,
      currentCtc: 1800000,
      expectedCtc: 2500000,
      noticePeriod: 30,
      source: CandidateSource.NAUKRI,
      ownerId: recruiter1.id,
    },
    {
      id: "cand-rohan-gupta",
      name: "Rohan Gupta",
      email: "rohan.gupta@example.com",
      phone: "+91 98111 11117",
      currentCity: "Delhi",
      preferredLocations: ["Bengaluru", "Pune"],
      willRelocate: true,
      currentCompany: "TCS",
      currentDesignation: "Senior Developer",
      totalExperience: 6.5,
      skills: ["Java", "Microservices", "AWS"],
      degree: "B.Tech",
      institution: "DTU Delhi",
      graduationYear: 2017,
      currentCtc: 1600000,
      expectedCtc: 2800000,
      noticePeriod: 90,
      employmentGapNotes: "6-month career break (2022) for family health reasons, documented.",
      source: CandidateSource.LINKEDIN,
      ownerId: recruiter1.id,
    },
    {
      id: "cand-meera-pillai",
      name: "Meera Pillai",
      email: "meera.pillai@example.com",
      phone: "+91 98111 11118",
      currentCity: "Chennai",
      preferredLocations: ["Bengaluru", "Chennai"],
      willRelocate: true,
      currentCompany: "Bosch (Contract)",
      currentDesignation: "Embedded Engineer",
      totalExperience: 9,
      skills: ["C++", "MQTT", "IoT", "Edge Computing"],
      degree: "M.E. Embedded Systems",
      institution: "Anna University",
      graduationYear: 2015,
      currentCtc: 2000000,
      expectedCtc: 3000000,
      noticePeriod: 60,
      source: CandidateSource.REFERRAL,
      ownerId: recruiter2.id,
    },
    {
      id: "cand-amit-verma",
      name: "Amit Verma",
      email: "amit.verma@example.com",
      phone: "+91 98111 11119",
      currentCity: "Bengaluru",
      preferredLocations: ["Bengaluru"],
      willRelocate: false,
      currentCompany: "Intuit",
      currentDesignation: "Senior ML Engineer",
      totalExperience: 6,
      skills: ["Python", "PyTorch", "Vector DB", "RAG"],
      degree: "B.Tech",
      institution: "BITS Pilani",
      graduationYear: 2018,
      currentCtc: 3200000,
      expectedCtc: 3800000,
      noticePeriod: 60,
      source: CandidateSource.LINKEDIN,
      ownerId: recruiter3.id,
    },
    {
      id: "cand-kavya-menon",
      name: "Kavya Menon",
      email: "kavya.menon@example.com",
      phone: "+91 98111 11120",
      currentCity: "Bengaluru",
      preferredLocations: ["Bengaluru"],
      willRelocate: false,
      currentCompany: "Microsoft",
      currentDesignation: "Principal ML Scientist",
      totalExperience: 11,
      skills: ["Python", "PyTorch", "LLM", "RAG", "Azure", "LangChain"],
      degree: "Ph.D. Machine Learning",
      institution: "IISc Bengaluru",
      graduationYear: 2014,
      currentCtc: 6500000,
      expectedCtc: 8000000,
      noticePeriod: 90,
      source: CandidateSource.LINKEDIN,
      ownerId: recruiter3.id,
    },
    {
      id: "cand-nikhil-jain",
      name: "Nikhil Jain",
      email: "nikhil.jain@example.com",
      phone: "+91 98111 11121",
      currentCity: "Pune",
      preferredLocations: ["Pune", "Bengaluru"],
      willRelocate: true,
      currentCompany: "ZS Associates",
      currentDesignation: "Lead Software Engineer",
      totalExperience: 8,
      skills: ["Java", "Spring Boot", "Kafka", "AWS", "Kubernetes"],
      degree: "B.Tech",
      institution: "VNIT Nagpur",
      graduationYear: 2016,
      currentCtc: 2800000,
      expectedCtc: 3500000,
      noticePeriod: 45,
      source: CandidateSource.NAUKRI,
      ownerId: recruiter1.id,
    },
    {
      id: "cand-pooja-shah",
      name: "Pooja Shah",
      email: "pooja.shah@example.com",
      phone: "+91 98111 11122",
      currentCity: "Bengaluru",
      preferredLocations: ["Bengaluru"],
      willRelocate: false,
      currentCompany: "Siemens",
      currentDesignation: "Senior IoT Engineer",
      totalExperience: 7,
      skills: ["IoT", "MQTT", "Azure IoT Hub", "Python", "Docker"],
      degree: "B.E. ECE",
      institution: "PES University",
      graduationYear: 2017,
      currentCtc: 2300000,
      expectedCtc: 3200000,
      noticePeriod: 30,
      source: CandidateSource.LINKEDIN,
      ownerId: recruiter2.id,
    },
  ];

  for (const c of candidatesData) {
    await prisma.candidate.upsert({
      where: { email: c.email },
      update: {},
      create: c as any,
    });
  }

  // Link candidate portal user
  const rahulCandidate = await prisma.candidate.findUnique({ where: { email: "rahul.kumar@example.com" } });
  if (rahulCandidate) {
    await prisma.user.upsert({
      where: { email: "rahul.kumar@example.com" },
      update: { candidateId: rahulCandidate.id },
      create: {
        email: "rahul.kumar@example.com",
        passwordHash: candidateHash,
        name: "Rahul Kumar",
        role: UserRole.CANDIDATE,
        candidateId: rahulCandidate.id,
      },
    });
  }

  // Projects
  const existingProjects = await prisma.project.count();
  if (existingProjects === 0 && rahulCandidate) {
    await prisma.project.create({
      data: {
        candidateId: rahulCandidate.id,
        projectName: "Trade Settlement Platform",
        role: "Tech Lead",
        skillsUsed: ["Java", "Spring Boot", "Kafka", "AWS"],
        description: "Built real-time settlement platform processing 50k trades/day for a tier-1 investment bank.",
        contribution: "Led 6-member team, architected event-driven microservices, reduced settlement latency by 45%.",
      },
    });
    await prisma.project.create({
      data: {
        candidateId: rahulCandidate.id,
        projectName: "Customer 360 Platform",
        role: "Senior Engineer",
        skillsUsed: ["Java", "PostgreSQL", "Docker"],
        description: "Unified view of customer data across 8 source systems.",
        contribution: "Owned data ingestion pipeline, improved sync latency from 12h to 10min.",
      },
    });
  }

  // ----- APPLICATIONS -----
  const stageAssignments: { candEmail: string; jobId: string; stage: PipelineStage; matchScore: number; noShowRisk: number }[] = [
    { candEmail: "rahul.kumar@example.com", jobId: job1.id, stage: "SUBMITTED", matchScore: 82, noShowRisk: 25 },
    { candEmail: "ananya.sharma@example.com", jobId: job1.id, stage: "INTERVIEW_SCHEDULED", matchScore: 88, noShowRisk: 20 },
    { candEmail: "divya.kapoor@example.com", jobId: job1.id, stage: "REVIEWED", matchScore: 65, noShowRisk: 35 },
    { candEmail: "rohan.gupta@example.com", jobId: job1.id, stage: "AI_SCREENING", matchScore: 58, noShowRisk: 55 },
    { candEmail: "nikhil.jain@example.com", jobId: job1.id, stage: "OFFER_EXTENDED", matchScore: 85, noShowRisk: 22 },
    { candEmail: "vikram.iyer@example.com", jobId: job2.id, stage: "INTERVIEW_COMPLETE", matchScore: 91, noShowRisk: 15 },
    { candEmail: "meera.pillai@example.com", jobId: job2.id, stage: "SUBMITTED", matchScore: 72, noShowRisk: 30 },
    { candEmail: "pooja.shah@example.com", jobId: job2.id, stage: "REVIEWED", matchScore: 78, noShowRisk: 25 },
    { candEmail: "sneha.reddy@example.com", jobId: job3.id, stage: "OFFER_ACCEPTED", matchScore: 86, noShowRisk: 18 },
    { candEmail: "arjun.nair@example.com", jobId: job3.id, stage: "INTERVIEW_SCHEDULED", matchScore: 80, noShowRisk: 20 },
    { candEmail: "amit.verma@example.com", jobId: job3.id, stage: "SUBMITTED", matchScore: 74, noShowRisk: 28 },
    { candEmail: "kavya.menon@example.com", jobId: job3.id, stage: "JOINED", matchScore: 94, noShowRisk: 10 },
    { candEmail: "rahul.kumar@example.com", jobId: job3.id, stage: "NEW", matchScore: 50, noShowRisk: 40 },
  ];

  for (const sa of stageAssignments) {
    const cand = await prisma.candidate.findUnique({ where: { email: sa.candEmail } });
    if (!cand) continue;
    await prisma.application.upsert({
      where: { candidateId_jobId: { candidateId: cand.id, jobId: sa.jobId } },
      update: {},
      create: {
        candidateId: cand.id,
        jobId: sa.jobId,
        stage: sa.stage,
        matchScore: sa.matchScore,
        noShowRisk: sa.noShowRisk,
        submittedAt: ["SUBMITTED", "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETE", "OFFER_EXTENDED", "OFFER_ACCEPTED", "JOINED"].includes(sa.stage)
          ? new Date(Date.now() - Math.random() * 20 * 86400000)
          : null,
      },
    });
  }

  // Interviews
  const firstApp = await prisma.application.findFirst({
    where: { stage: "INTERVIEW_SCHEDULED" },
    include: { candidate: true },
  });
  if (firstApp) {
    const existing = await prisma.interview.findFirst({ where: { applicationId: firstApp.id } });
    if (!existing) {
      const scheduled = new Date();
      scheduled.setDate(scheduled.getDate() + 3);
      scheduled.setHours(15, 0, 0, 0);
      await prisma.interview.create({
        data: {
          applicationId: firstApp.id,
          candidateId: firstApp.candidateId,
          round: "L1 - Technical",
          scheduledAt: scheduled,
          interviewerName: "Vijay Kumar (Client panel)",
          mode: "Video",
          meetingLink: "https://teams.microsoft.com/meet/demo",
        },
      });
    }
  }

  const completedApp = await prisma.application.findFirst({ where: { stage: "INTERVIEW_COMPLETE" } });
  if (completedApp) {
    const exists = await prisma.interview.findFirst({ where: { applicationId: completedApp.id } });
    if (!exists) {
      await prisma.interview.create({
        data: {
          applicationId: completedApp.id,
          candidateId: completedApp.candidateId,
          round: "L2 - Architecture",
          scheduledAt: new Date(Date.now() - 2 * 86400000),
          interviewerName: "Suresh Gopal",
          mode: "Video",
          status: "COMPLETED",
          outcome: "PROCEED",
          rating: 4,
          feedback: "Strong architectural thinking. Proceed to final round.",
        },
      });
    }
  }

  // Offer
  const offerApp = await prisma.application.findFirst({ where: { stage: "OFFER_EXTENDED" } });
  if (offerApp) {
    const existing = await prisma.offer.findFirst({ where: { applicationId: offerApp.id } });
    if (!existing) {
      await prisma.offer.create({
        data: {
          applicationId: offerApp.id,
          candidateId: offerApp.candidateId,
          offeredCtc: 3400000,
          fixedCtc: 3000000,
          variableCtc: 400000,
          joiningDate: new Date(Date.now() + 45 * 86400000),
          status: "EXTENDED",
          feePercent: 8.33,
        },
      });
    }
  }

  // Accepted & joined offers for closures tracking
  const joinedApp = await prisma.application.findFirst({ where: { stage: "JOINED" } });
  if (joinedApp) {
    const existing = await prisma.offer.findFirst({ where: { applicationId: joinedApp.id } });
    if (!existing) {
      const joinedAt = new Date(Date.now() - 10 * 86400000);
      await prisma.offer.create({
        data: {
          applicationId: joinedApp.id,
          candidateId: joinedApp.candidateId,
          offeredCtc: 7800000,
          fixedCtc: 6800000,
          variableCtc: 1000000,
          joiningDate: joinedAt,
          actualJoinedAt: joinedAt,
          status: "ACCEPTED",
          feePercent: 8.33,
          feeAmount: 650000,
          paymentStatus: "Invoiced",
        },
      });
    }
  }

  // ----- EMAIL TEMPLATES -----
  const templates = [
    {
      name: "Screening Invitation",
      category: "screening",
      subject: "Exciting opportunity — {{jobTitle}} at {{companyName}}",
      body: `<p>Hi {{candidateName}},</p><p>Hope you are doing well. I am <b>{{recruiterName}}</b> from CareerPaths, writing to you about a <b>{{jobTitle}}</b> opportunity at <b>{{companyName}}</b> (via CloudCXO).</p><p>Your profile looks like a strong match. Could we schedule a quick 15-minute introductory call?</p><p>Best,<br/>{{recruiterName}}<br/>CareerPaths India</p>`,
      variables: ["candidateName", "jobTitle", "companyName", "recruiterName"],
    },
    {
      name: "Interview Confirmation",
      category: "interview",
      subject: "Interview scheduled: {{jobTitle}} at {{companyName}}",
      body: `<p>Hi {{candidateName}},</p><p>Your interview for <b>{{jobTitle}}</b> at <b>{{companyName}}</b> is scheduled on <b>{{interviewDate}}</b> at <b>{{interviewTime}}</b>.</p><p>Meeting link: {{meetingLink}}</p><p>Please join 5 minutes early.</p><p>Good luck!<br/>{{recruiterName}}</p>`,
      variables: ["candidateName", "jobTitle", "companyName", "interviewDate", "interviewTime", "meetingLink", "recruiterName"],
    },
    {
      name: "Interview Reminder",
      category: "interview",
      subject: "Reminder: Interview tomorrow for {{jobTitle}}",
      body: `<p>Hi {{candidateName}},</p><p>This is a reminder about your interview for <b>{{jobTitle}}</b> at <b>{{companyName}}</b> tomorrow at <b>{{interviewTime}}</b>.</p><p>A few tips: join 5 min early, dress professionally, test your mic & camera.</p><p>All the best!</p>`,
      variables: ["candidateName", "jobTitle", "companyName", "interviewTime"],
    },
    {
      name: "Offer Letter",
      category: "offer",
      subject: "🎉 Offer from {{companyName}} for {{jobTitle}}",
      body: `<p>Hi {{candidateName}},</p><p>Congratulations! We are pleased to extend an offer for the <b>{{jobTitle}}</b> role at <b>{{companyName}}</b>.</p><p>Offered CTC: <b>{{offeredCtc}}</b></p><p>Tentative joining date: <b>{{joiningDate}}</b></p><p>Please confirm your acceptance within 3 days.</p>`,
      variables: ["candidateName", "jobTitle", "companyName", "offeredCtc", "joiningDate"],
    },
    {
      name: "Joining Reminder",
      category: "joining",
      subject: "Welcome to {{companyName}} — joining on {{joiningDate}}",
      body: `<p>Hi {{candidateName}},</p><p>Your joining date at <b>{{companyName}}</b> is approaching (<b>{{joiningDate}}</b>). Let us know if you need any help with onboarding logistics.</p><p>Welcome aboard!</p>`,
      variables: ["candidateName", "companyName", "joiningDate"],
    },
    {
      name: "Follow-up — No response",
      category: "follow-up",
      subject: "Checking in — {{jobTitle}} opportunity",
      body: `<p>Hi {{candidateName}},</p><p>Just wanted to follow up on our previous conversation about the <b>{{jobTitle}}</b> role. Are you still interested? Happy to answer any questions.</p><p>Best,<br/>{{recruiterName}}</p>`,
      variables: ["candidateName", "jobTitle", "recruiterName"],
    },
  ];
  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { name: t.name },
      update: { subject: t.subject, body: t.body, category: t.category, variables: t.variables },
      create: t,
    });
  }

  // -- Recruiting Platforms --
  const platforms = [
    { name: "Naukri", websiteUrl: "https://www.naukri.com", description: "India's leading job portal" },
    { name: "LinkedIn Recruiter", websiteUrl: "https://www.linkedin.com/talent", description: "Professional networking & talent sourcing" },
    { name: "foundit (Monster)", websiteUrl: "https://www.foundit.in", description: "Formerly Monster India" },
    { name: "Indeed", websiteUrl: "https://www.indeed.co.in", description: "Global job search engine" },
    { name: "Instahyre", websiteUrl: "https://www.instahyre.com", description: "AI-powered hiring platform" },
  ];
  for (const p of platforms) {
    await prisma.recruitingPlatform.upsert({
      where: { name: p.name },
      update: { websiteUrl: p.websiteUrl, description: p.description },
      create: p,
    });
  }

  console.log("✅ Seed complete");
  console.log("Users:");
  console.log("  Admin: john.sagayaraj@careerpathsindia.com / john123");
  console.log("  Recruiter: priya@careerpathsindia.com / recruiter123");
  console.log("  Client (Barclays): hr@barclays.com / client123");
  console.log("  Candidate: rahul.kumar@example.com / candidate123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
