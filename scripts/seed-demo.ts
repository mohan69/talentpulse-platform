import { PrismaClient, UserRole, PipelineStage, JobPriority, JobStatus, CandidateSource, InterviewStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding TalentPulse Demo Data");
  const hash = await bcrypt.hash("demo123", 10);

  // ----- CLIENTS -----
  const clients = await Promise.all([
    prisma.client.upsert({ where: { name: "TechCorp India" }, update: {}, create: { name: "TechCorp India", industry: "Enterprise Technology", website: "https://techcorp.example.com", description: "Leading enterprise technology solutions provider.", contactName: "Priya Sharma", contactEmail: "priya@techcorp.example.com", contactPhone: "+91 98765 40001", address: "Bangalore, India" } }),
    prisma.client.upsert({ where: { name: "Global Manufacturing Inc" }, update: {}, create: { name: "Global Manufacturing Inc", industry: "Industrial Manufacturing", website: "https://globalmfg.example.com", description: "Multinational industrial manufacturing conglomerate.", contactName: "Rajesh Kumar", contactEmail: "rajesh@globalmfg.example.com", contactPhone: "+91 98765 40002", address: "Pune, India" } }),
    prisma.client.upsert({ where: { name: "Apex Consulting Group" }, update: {}, create: { name: "Apex Consulting Group", industry: "Management Consulting", website: "https://apexconsulting.example.com", description: "Top-tier global management consulting firm.", contactName: "Anita Desai", contactEmail: "anita@apexconsulting.example.com", contactPhone: "+91 98765 40003", address: "Mumbai, India" } }),
    prisma.client.upsert({ where: { name: "NovaTech Solutions" }, update: {}, create: { name: "NovaTech Solutions", industry: "AI & Software", website: "https://novatech.example.com", description: "Cutting-edge AI and software product company.", contactName: "Vikram Patel", contactEmail: "vikram@novatech.example.com", contactPhone: "+91 98765 40004", address: "Hyderabad, India" } }),
    prisma.client.upsert({ where: { name: "Omni Foods Pvt Ltd" }, update: {}, create: { name: "Omni Foods Pvt Ltd", industry: "FMCG / Food Processing", website: "https://omnifoods.example.com", description: "Fast-growing food processing and distribution company.", contactName: "Meera Nair", contactEmail: "meera@omnifoods.example.com", contactPhone: "+91 98765 40005", address: "Chennai, India" } }),
  ]);
  const [techcorp, globalmfg, apex, novatech, omnifoods] = clients;
  console.log(`  ✅ ${clients.length} clients`);

  // ----- USERS -----
  const admin = await prisma.user.upsert({
    where: { email: "admin@talentpulse.demo" }, update: {},
    create: { email: "admin@talentpulse.demo", passwordHash: hash, name: "Agency Admin", role: "ADMIN", isActive: true },
  });
  const rec1 = await prisma.user.upsert({
    where: { email: "recruiter1@talentpulse.demo" }, update: {},
    create: { email: "recruiter1@talentpulse.demo", passwordHash: hash, name: "Priya Sharma", role: "RECRUITER", isActive: true },
  });
  const rec2 = await prisma.user.upsert({
    where: { email: "recruiter2@talentpulse.demo" }, update: {},
    create: { email: "recruiter2@talentpulse.demo", passwordHash: hash, name: "Arun Kumar", role: "RECRUITER", isActive: true },
  });
  console.log("  ✅ 3 users (admin + 2 recruiters)");

  // ----- JOBS / REQUISITIONS -----
  const jobs = await Promise.all([
    prisma.job.upsert({
      where: { id: "job-sap-pm" }, update: {},
      create: { id: "job-sap-pm", title: "SAP Program Manager", clientId: techcorp.id, location: "Bangalore", jobType: "Full-time", experienceMin: 12, experienceMax: 18, skills: ["SAP S/4HANA", "SAP ECC", "Project Management", "SAP Activate", "Agile", "Stakeholder Management", "PMP", "SAP Fiori"], description: "We are seeking an experienced SAP Program Manager to lead a large-scale S/4HANA transformation program. The ideal candidate will have 12+ years of SAP experience with at least 3 full lifecycle S/4HANA implementations. PMP certification and team leadership experience are mandatory.", salaryMin: 4500000, salaryMax: 5500000, status: "OPEN", priority: "URGENT", openings: 2, createdById: admin.id, recruiterId: rec1.id },
    }),
    prisma.job.upsert({
      where: { id: "job-oracle-scm" }, update: {},
      create: { id: "job-oracle-scm", title: "Oracle SCM Consultant", clientId: techcorp.id, location: "Mumbai", jobType: "Full-time", experienceMin: 5, experienceMax: 9, skills: ["Oracle SCM", "Oracle Fusion", "Oracle Cloud", "Supply Chain Planning", "Order Management", "Inventory Management", "SQL", "Oracle EBS"], description: "Looking for an Oracle SCM Consultant with strong Fusion/Cloud experience. The role involves leading SCM module implementations, gathering requirements, configuring solutions, and managing client relationships. Consulting background preferred.", salaryMin: 1800000, salaryMax: 2500000, status: "OPEN", priority: "HIGH", openings: 3, createdById: admin.id, recruiterId: rec1.id },
    }),
    prisma.job.upsert({
      where: { id: "job-ai-architect" }, update: {},
      create: { id: "job-ai-architect", title: "AI Solutions Architect", clientId: novatech.id, location: "Hyderabad", jobType: "Full-time", experienceMin: 8, experienceMax: 14, skills: ["LLMs", "RAG", "MLOps", "Python", "PyTorch", "TensorFlow", "AWS SageMaker", "Kubernetes", "Vector Databases", "Team Leadership"], description: "We are looking for an AI Solutions Architect to design and lead the implementation of enterprise AI solutions. Expertise in LLMs, RAG architectures, MLOps pipelines, and cloud-native AI deployment is essential. This is a leadership role with team management responsibilities.", salaryMin: 3500000, salaryMax: 5000000, status: "OPEN", priority: "HIGH", openings: 1, createdById: admin.id, recruiterId: rec2.id },
    }),
    prisma.job.upsert({
      where: { id: "job-sales-director" }, update: {},
      create: { id: "job-sales-director", title: "Manufacturing Sales Director", clientId: globalmfg.id, location: "Pune", jobType: "Full-time", experienceMin: 15, experienceMax: 22, skills: ["Industrial Sales", "B2B Sales", "EV Manufacturing", "Key Account Management", "Sales Strategy", "Team Leadership", "CRM", "Negotiation", "Market Analysis"], description: "Seeking a seasoned Sales Director for our manufacturing division expanding into EV battery manufacturing solutions. The ideal candidate has 15+ years in industrial/B2B sales, strong network in the manufacturing sector, and experience building and leading high-performance sales teams.", salaryMin: 4000000, salaryMax: 6000000, status: "OPEN", priority: "HIGH", openings: 1, createdById: admin.id, recruiterId: rec2.id },
    }),
    prisma.job.upsert({
      where: { id: "job-plant-head" }, update: {},
      create: { id: "job-plant-head", title: "Plant Operations Head", clientId: omnifoods.id, location: "Chennai", jobType: "Full-time", experienceMin: 12, experienceMax: 18, skills: ["Plant Operations", "FMCG Manufacturing", "Lean Six Sigma", "Supply Chain Management", "Quality Control", "Safety Compliance", "Budgeting", "Team Management", "ERP Systems"], description: "We are hiring a Plant Operations Head for our flagship food processing facility. The role oversees end-to-end plant operations including production planning, quality assurance, supply chain, safety compliance, and a team of 200+ workers. FMCG manufacturing experience is mandatory.", salaryMin: 3000000, salaryMax: 4200000, status: "OPEN", priority: "MEDIUM", openings: 1, createdById: admin.id, recruiterId: rec1.id },
    }),
  ]);
  console.log(`  ✅ ${jobs.length} requisitions`);

  // ----- CANDIDATES (28 total) -----
  const candidates = await Promise.all([
    // SAP Program Manager candidates (6)
    prisma.candidate.upsert({ where: { email: "suresh.rao@example.com" }, update: {}, create: { name: "Suresh Rao", email: "suresh.rao@example.com", phone: "+91 98765 10001", currentCity: "Bangalore", preferredLocations: ["Bangalore"], willRelocate: false, currentCompany: "Infosys", currentDesignation: "Senior SAP Program Manager", totalExperience: 16, skills: ["SAP S/4HANA", "SAP ECC", "Project Management", "SAP Activate", "Agile", "Stakeholder Management", "PMP", "SAP Fiori", "SAP BW"], degree: "BE Computer Science", institution: "NIT Trichy", graduationYear: 2005, currentCtc: 4800000, expectedCtc: 5500000, noticePeriod: 90, source: "LINKEDIN", linkedinUrl: "https://linkedin.com/in/suresh-rao", aiSummary: "Experienced SAP Program Manager with 16+ years leading large-scale S/4HANA transformations. PMP certified with strong stakeholder management skills." } }),
    prisma.candidate.upsert({ where: { email: "anita.verma@example.com" }, update: {}, create: { name: "Anita Verma", email: "anita.verma@example.com", phone: "+91 98765 10002", currentCity: "Mumbai", preferredLocations: ["Bangalore", "Mumbai", "Pune"], willRelocate: true, currentCompany: "TCS", currentDesignation: "SAP Program Manager", totalExperience: 14, skills: ["SAP S/4HANA", "SAP ECC", "Project Management", "SAP Activate", "Agile", "Stakeholder Management", "SAP MDG"], degree: "MTech", institution: "IIT Bombay", graduationYear: 2008, currentCtc: 4200000, expectedCtc: 5000000, noticePeriod: 60, source: "LINKEDIN", linkedinUrl: "https://linkedin.com/in/anita-verma", aiSummary: "Senior SAP Program Manager with 14 years of experience. Led 2 full S/4HANA implementations at TCS. IIT Bombay alumnus." } }),
    prisma.candidate.upsert({ where: { email: "vikram.joshi@example.com" }, update: {}, create: { name: "Vikram Joshi", email: "vikram.joshi@example.com", phone: "+91 98765 10003", currentCity: "Bangalore", preferredLocations: ["Bangalore"], willRelocate: false, currentCompany: "Wipro", currentDesignation: "SAP Delivery Lead", totalExperience: 15, skills: ["SAP S/4HANA", "SAP ECC", "Project Management", "SAP Activate", "Agile", "SAP HCM"], degree: "BE", institution: "BITS Pilani", graduationYear: 2007, currentCtc: 3800000, expectedCtc: 4500000, noticePeriod: 45, source: "NAUKRI", linkedinUrl: "https://linkedin.com/in/vikram-joshi", aiSummary: "SAP Delivery Lead with 15 years experience. Expertise in S/4HANA, HCM, and Activate methodology." } }),
    prisma.candidate.upsert({ where: { email: "deepa.iyer@example.com" }, update: {}, create: { name: "Deepa Iyer", email: "deepa.iyer@example.com", phone: "+91 98765 10004", currentCity: "Pune", preferredLocations: ["Bangalore", "Pune"], willRelocate: true, currentCompany: "Accenture", currentDesignation: "SAP Program Manager", totalExperience: 13, skills: ["SAP S/4HANA", "SAP ECC", "Project Management", "SAP Activate", "Agile", "Stakeholder Management", "SAP Analytics Cloud"], degree: "MBA", institution: "ISB Hyderabad", graduationYear: 2010, currentCtc: 3500000, expectedCtc: 4200000, noticePeriod: 60, source: "LINKEDIN", aiSummary: "MBA-qualified SAP Program Manager with strong consulting background at Accenture. Led global SAP transformation programs." } }),
    prisma.candidate.upsert({ where: { email: "ravi.shankar@example.com" }, update: {}, create: { name: "Ravi Shankar", email: "ravi.shankar@example.com", phone: "+91 98765 10005", currentCity: "Bangalore", preferredLocations: ["Bangalore"], willRelocate: false, currentCompany: "IBM", currentDesignation: "SAP Project Manager", totalExperience: 12, skills: ["SAP S/4HANA", "SAP ECC", "Project Management", "SAP Activate", "PMP"], degree: "BE Mechanical", institution: "Anna University", graduationYear: 2010, currentCtc: 2800000, expectedCtc: 3500000, noticePeriod: 30, source: "DIRECT", aiSummary: "PMP-certified SAP Project Manager transitioning from ECC to S/4HANA space. Quick joiner with strong project management fundamentals." } }),
    prisma.candidate.upsert({ where: { email: "neha.gupta@example.com" }, update: {}, create: { name: "Neha Gupta", email: "neha.gupta@example.com", phone: "+91 98765 10006", currentCity: "Delhi", preferredLocations: ["Bangalore", "Gurgaon", "Mumbai"], willRelocate: true, currentCompany: "Deloitte", currentDesignation: "SAP Practice Director", totalExperience: 17, skills: ["SAP S/4HANA", "SAP ECC", "Project Management", "SAP Activate", "Agile", "Stakeholder Management", "PMP", "Practice Management", "Pre-Sales"], degree: "BTech", institution: "IIT Delhi", graduationYear: 2005, currentCtc: 5500000, expectedCtc: 6000000, noticePeriod: 90, source: "REFERRAL", aiSummary: "SAP Practice Director at Deloitte with 17 years of experience. Strong pre-sales, practice management, and delivery background." } }),
    // Oracle SCM Consultant candidates (6)
    prisma.candidate.upsert({ where: { email: "arun.nair@example.com" }, update: {}, create: { name: "Arun Nair", email: "arun.nair@example.com", phone: "+91 98765 20001", currentCity: "Mumbai", preferredLocations: ["Mumbai"], willRelocate: false, currentCompany: "Deloitte", currentDesignation: "Oracle SCM Senior Consultant", totalExperience: 7, skills: ["Oracle SCM", "Oracle Fusion", "Oracle Cloud", "Supply Chain Planning", "Order Management", "Inventory Management", "SQL", "Oracle EBS"], degree: "BE", institution: "NIT Surathkal", graduationYear: 2015, currentCtc: 2000000, expectedCtc: 2400000, noticePeriod: 45, source: "LINKEDIN", aiSummary: "Oracle SCM Senior Consultant with strong Fusion Cloud implementation experience. Consulting background at Deloitte." } }),
    prisma.candidate.upsert({ where: { email: "priya.kulkarni@example.com" }, update: {}, create: { name: "Priya Kulkarni", email: "priya.kulkarni@example.com", phone: "+91 98765 20002", currentCity: "Pune", preferredLocations: ["Mumbai", "Pune", "Bangalore"], willRelocate: true, currentCompany: "Infosys", currentDesignation: "Oracle SCM Consultant", totalExperience: 6, skills: ["Oracle SCM", "Oracle Fusion", "Oracle Cloud", "Inventory Management", "Procurement", "SQL"], degree: "MTech", institution: "VIT Vellore", graduationYear: 2017, currentCtc: 1600000, expectedCtc: 2000000, noticePeriod: 30, source: "NAUKRI", aiSummary: "Oracle SCM Consultant with 6 years of Fusion Cloud experience. Quick joiner with strong domain knowledge in supply chain." } }),
    prisma.candidate.upsert({ where: { email: "siddharth.menon@example.com" }, update: {}, create: { name: "Siddharth Menon", email: "siddharth.menon@example.com", phone: "+91 98765 20003", currentCity: "Mumbai", preferredLocations: ["Mumbai", "Pune"], willRelocate: false, currentCompany: "PwC", currentDesignation: "Oracle SCM Manager", totalExperience: 9, skills: ["Oracle SCM", "Oracle Fusion", "Oracle Cloud", "Supply Chain Planning", "Order Management", "Inventory Management", "SQL", "Oracle EBS", "Team Management"], degree: "MBA", institution: "NMIMS Mumbai", graduationYear: 2014, currentCtc: 2500000, expectedCtc: 3000000, noticePeriod: 60, source: "LINKEDIN", aiSummary: "Oracle SCM Manager at PwC with 9 years experience across EBS and Fusion. Leads a team of 8 consultants." } }),
    prisma.candidate.upsert({ where: { email: "kavita.reddy@example.com" }, update: {}, create: { name: "Kavita Reddy", email: "kavita.reddy@example.com", phone: "+91 98765 20004", currentCity: "Hyderabad", preferredLocations: ["Hyderabad", "Mumbai", "Bangalore"], willRelocate: true, currentCompany: "Tech Mahindra", currentDesignation: "Oracle SCM Consultant", totalExperience: 5, skills: ["Oracle SCM", "Oracle Fusion", "Oracle Cloud", "Procurement", "Inventory Management"], degree: "BTech", institution: "JNTU Hyderabad", graduationYear: 2018, currentCtc: 1200000, expectedCtc: 1800000, noticePeriod: 30, source: "DIRECT", aiSummary: "Oracle SCM Consultant with 5 years of Fusion Cloud experience. Eager to work on larger transformation programs." } }),
    prisma.candidate.upsert({ where: { email: "rohan.das@example.com" }, update: {}, create: { name: "Rohan Das", email: "rohan.das@example.com", phone: "+91 98765 20005", currentCity: "Kolkata", preferredLocations: ["Mumbai", "Bangalore"], willRelocate: true, currentCompany: "Capgemini", currentDesignation: "Oracle EBS SCM Lead", totalExperience: 8, skills: ["Oracle SCM", "Oracle EBS", "Order Management", "Inventory Management", "SQL", "PL/SQL", "Oracle Reports"], degree: "BE", institution: "Jadavpur University", graduationYear: 2014, currentCtc: 1700000, expectedCtc: 2200000, noticePeriod: 60, source: "NAUKRI", aiSummary: "Oracle EBS SCM Lead transitioning to Fusion. Strong technical background with 8 years of experience." } }),
    prisma.candidate.upsert({ where: { email: "megha.shah@example.com" }, update: {}, create: { name: "Megha Shah", email: "megha.shah@example.com", phone: "+91 98765 20006", currentCity: "Mumbai", preferredLocations: ["Mumbai", "Pune"], willRelocate: false, currentCompany: "KPMG", currentDesignation: "Oracle Cloud SCM Specialist", totalExperience: 6, skills: ["Oracle SCM", "Oracle Fusion", "Oracle Cloud", "Supply Chain Planning", "Order Management", "Inventory Management", "SQL"], degree: "CA", institution: "ICAI", graduationYear: 2017, currentCtc: 1900000, expectedCtc: 2400000, noticePeriod: 45, source: "LINKEDIN", aiSummary: "Chartered Accountant turned Oracle Cloud SCM Specialist. Unique blend of finance and supply chain expertise." } }),
    // AI Solutions Architect candidates (5)
    prisma.candidate.upsert({ where: { email: "arjun.krishnan@example.com" }, update: {}, create: { name: "Arjun Krishnan", email: "arjun.krishnan@example.com", phone: "+91 98765 30001", currentCity: "Bangalore", preferredLocations: ["Bangalore", "Hyderabad"], willRelocate: true, currentCompany: "Google", currentDesignation: "AI/ML Tech Lead", totalExperience: 10, skills: ["LLMs", "RAG", "MLOps", "Python", "PyTorch", "TensorFlow", "Kubernetes", "Vector Databases", "GCP", "BigQuery"], degree: "MTech", institution: "IIT Madras", graduationYear: 2013, currentCtc: 5500000, expectedCtc: 6000000, noticePeriod: 90, source: "LINKEDIN", aiSummary: "AI/ML Tech Lead at Google with 10 years of experience. Deep expertise in LLMs, RAG, and production ML systems." } }),
    prisma.candidate.upsert({ where: { email: "divya.singh@example.com" }, update: {}, create: { name: "Divya Singh", email: "divya.singh@example.com", phone: "+91 98765 30002", currentCity: "Hyderabad", preferredLocations: ["Hyderabad", "Bangalore"], willRelocate: false, currentCompany: "Microsoft", currentDesignation: "Senior AI Architect", totalExperience: 12, skills: ["LLMs", "RAG", "MLOps", "Python", "PyTorch", "Azure ML", "Kubernetes", "Vector Databases", "Team Leadership", "Azure OpenAI"], degree: "PhD", institution: "IIT Kanpur", graduationYear: 2011, currentCtc: 6000000, expectedCtc: 7000000, noticePeriod: 60, source: "LINKEDIN", aiSummary: "Senior AI Architect at Microsoft with a PhD from IIT Kanpur. Deep expertise in LLMs, Azure OpenAI, and MLOps at scale." } }),
    prisma.candidate.upsert({ where: { email: "karthik.sharma@example.com" }, update: {}, create: { name: "Karthik Sharma", email: "karthik.sharma@example.com", phone: "+91 98765 30003", currentCity: "Bangalore", preferredLocations: ["Bangalore"], willRelocate: false, currentCompany: "Amazon", currentDesignation: "Applied Scientist", totalExperience: 8, skills: ["LLMs", "RAG", "Python", "PyTorch", "AWS SageMaker", "Vector Databases", "NLP", "Information Retrieval"], degree: "MTech", institution: "IIT Bombay", graduationYear: 2015, currentCtc: 4500000, expectedCtc: 5200000, noticePeriod: 60, source: "NAUKRI", aiSummary: "Applied Scientist at Amazon with 8 years of experience building NLP and information retrieval systems at scale." } }),
    prisma.candidate.upsert({ where: { email: "pooja.jain@example.com" }, update: {}, create: { name: "Pooja Jain", email: "pooja.jain@example.com", phone: "+91 98765 30004", currentCity: "Pune", preferredLocations: ["Hyderabad", "Bangalore", "Pune"], willRelocate: true, currentCompany: "Flipkart", currentDesignation: "ML Engineering Manager", totalExperience: 11, skills: ["MLOps", "Python", "TensorFlow", "Kubernetes", "Team Leadership", "Recommendation Systems", "A/B Testing", "Data Pipelines"], degree: "BTech", institution: "IIT Roorkee", graduationYear: 2012, currentCtc: 4800000, expectedCtc: 5500000, noticePeriod: 45, source: "LINKEDIN", aiSummary: "ML Engineering Manager at Flipkart with 11 years experience. Strong MLOps and team leadership background." } }),
    prisma.candidate.upsert({ where: { email: "rahul.desai@example.com" }, update: {}, create: { name: "Rahul Desai", email: "rahul.desai@example.com", phone: "+91 98765 30005", currentCity: "Mumbai", preferredLocations: ["Hyderabad", "Bangalore", "Mumbai"], willRelocate: true, currentCompany: "JPMorgan", currentDesignation: "VP - AI Platform", totalExperience: 13, skills: ["LLMs", "RAG", "MLOps", "Python", "PyTorch", "AWS SageMaker", "Kubernetes", "Vector Databases", "Financial AI"], degree: "MTech", institution: "IIT Delhi", graduationYear: 2010, currentCtc: 5800000, expectedCtc: 6500000, noticePeriod: 90, source: "REFERRAL", aiSummary: "VP of AI Platform at JPMorgan with 13 years experience. Building enterprise AI solutions for financial services." } }),
    // Manufacturing Sales Director candidates (5)
    prisma.candidate.upsert({ where: { email: "mahesh.patil@example.com" }, update: {}, create: { name: "Mahesh Patil", email: "mahesh.patil@example.com", phone: "+91 98765 40001", currentCity: "Pune", preferredLocations: ["Pune"], willRelocate: false, currentCompany: "Siemens India", currentDesignation: "Director - Industrial Sales", totalExperience: 20, skills: ["Industrial Sales", "B2B Sales", "EV Manufacturing", "Key Account Management", "Sales Strategy", "Team Leadership", "CRM", "Negotiation", "Market Analysis", "Channel Sales"], degree: "BE Mechanical", institution: "COEP Pune", graduationYear: 2002, currentCtc: 4800000, expectedCtc: 5500000, noticePeriod: 90, source: "LINKEDIN", aiSummary: "Director of Industrial Sales at Siemens with 20 years of experience. Deep network in manufacturing and EV sector." } }),
    prisma.candidate.upsert({ where: { email: "sunil.verma@example.com" }, update: {}, create: { name: "Sunil Verma", email: "sunil.verma@example.com", phone: "+91 98765 40002", currentCity: "Mumbai", preferredLocations: ["Pune", "Mumbai"], willRelocate: true, currentCompany: "ABB India", currentDesignation: "Head of Sales - Automation", totalExperience: 18, skills: ["Industrial Sales", "B2B Sales", "Automation", "Key Account Management", "Sales Strategy", "Team Leadership", "CRM", "Negotiation"], degree: "BE Electrical", institution: "VJTI Mumbai", graduationYear: 2004, currentCtc: 4200000, expectedCtc: 5000000, noticePeriod: 60, source: "NAUKRI", aiSummary: "Head of Sales at ABB India with 18 years experience in industrial automation sales. Strong B2B and channel network." } }),
    prisma.candidate.upsert({ where: { email: "ananya.reddy@example.com" }, update: {}, create: { name: "Ananya Reddy", email: "ananya.reddy@example.com", phone: "+91 98765 40003", currentCity: "Bangalore", preferredLocations: ["Bangalore", "Pune", "Hyderabad"], willRelocate: true, currentCompany: "Schneider Electric", currentDesignation: "Regional Sales Director", totalExperience: 16, skills: ["Industrial Sales", "B2B Sales", "Key Account Management", "Sales Strategy", "Team Leadership", "CRM", "Negotiation", "Energy Management"], degree: "MBA", institution: "IIM Bangalore", graduationYear: 2008, currentCtc: 3800000, expectedCtc: 4500000, noticePeriod: 45, source: "LINKEDIN", aiSummary: "Regional Sales Director at Schneider Electric with 16 years experience. MBA from IIM Bangalore. Proven track record in energy management sales." } }),
    prisma.candidate.upsert({ where: { email: "rajesh.khanna@example.com" }, update: {}, create: { name: "Rajesh Khanna", email: "rajesh.khanna@example.com", phone: "+91 98765 40004", currentCity: "Delhi", preferredLocations: ["Pune", "Delhi","Mumbai"], willRelocate: true, currentCompany: "Honeywell India", currentDesignation: "VP Sales - Industrial", totalExperience: 22, skills: ["Industrial Sales", "B2B Sales", "EV Manufacturing", "Key Account Management", "Sales Strategy", "Team Leadership", "CRM", "Negotiation", "Market Analysis", "P&L Management"], degree: "BTech", institution: "IIT Delhi", graduationYear: 2000, currentCtc: 6000000, expectedCtc: 7000000, noticePeriod: 90, source: "LINKEDIN", aiSummary: "VP of Industrial Sales at Honeywell with 22 years experience. IIT Delhi alumnus with strong P&L management and strategic sales expertise." } }),
    prisma.candidate.upsert({ where: { email: "sonal.shah@example.com" }, update: {}, create: { name: "Sonal Shah", email: "sonal.shah@example.com", phone: "+91 98765 40005", currentCity: "Mumbai", preferredLocations: ["Pune", "Mumbai"], willRelocate: true, currentCompany: "Bosch India", currentDesignation: "Sales Director - Automotive", totalExperience: 17, skills: ["Industrial Sales", "B2B Sales", "Automotive", "Key Account Management", "Sales Strategy", "Team Leadership", "CRM", "Negotiation"], degree: "BE", institution: "Sardar Patel University", graduationYear: 2006, currentCtc: 3500000, expectedCtc: 4200000, noticePeriod: 60, source: "NAUKRI", aiSummary: "Sales Director at Bosch India with 17 years in automotive and industrial sales. Strong OEM and tier-1 relationships." } }),
    // Plant Operations Head candidates (6)
    prisma.candidate.upsert({ where: { email: "venkatesh.iyer@example.com" }, update: {}, create: { name: "Venkatesh Iyer", email: "venkatesh.iyer@example.com", phone: "+91 98765 50001", currentCity: "Chennai", preferredLocations: ["Chennai"], willRelocate: false, currentCompany: "Britannia Industries", currentDesignation: "Plant Head", totalExperience: 16, skills: ["Plant Operations", "FMCG Manufacturing", "Lean Six Sigma", "Supply Chain Management", "Quality Control", "Safety Compliance", "Budgeting", "Team Management", "ERP Systems", "TQM"], degree: "BE Mechanical", institution: "PSG Tech", graduationYear: 2006, currentCtc: 3500000, expectedCtc: 4000000, noticePeriod: 60, source: "LINKEDIN", aiSummary: "Plant Head at Britannia with 16 years in FMCG manufacturing. Lean Six Sigma Black Belt with expertise in TQM and plant modernization." } }),
    prisma.candidate.upsert({ where: { email: "lakshmi.narayan@example.com" }, update: {}, create: { name: "Lakshmi Narayan", email: "lakshmi.narayan@example.com", phone: "+91 98765 50002", currentCity: "Bangalore", preferredLocations: ["Chennai", "Bangalore", "Pune"], willRelocate: true, currentCompany: "Nestle India", currentDesignation: "Operations Manager", totalExperience: 14, skills: ["Plant Operations", "FMCG Manufacturing", "Supply Chain Management", "Quality Control", "Safety Compliance", "Budgeting", "Team Management", "ERP Systems"], degree: "BTech", institution: "IIT Kharagpur", graduationYear: 2009, currentCtc: 2800000, expectedCtc: 3500000, noticePeriod: 45, source: "LINKEDIN", aiSummary: "Operations Manager at Nestle India with 14 years experience. IIT Kharagpur alumnus with strong FMCG operations background." } }),
    prisma.candidate.upsert({ where: { email: "sanjay.pillai@example.com" }, update: {}, create: { name: "Sanjay Pillai", email: "sanjay.pillai@example.com", phone: "+91 98765 50003", currentCity: "Pune", preferredLocations: ["Chennai", "Pune", "Mumbai"], willRelocate: true, currentCompany: "PepsiCo", currentDesignation: "Senior Operations Lead", totalExperience: 13, skills: ["Plant Operations", "FMCG Manufacturing", "Lean Six Sigma", "Supply Chain Management", "Quality Control", "Safety Compliance", "Team Management"], degree: "BE Mechanical", institution: "VIT Vellore", graduationYear: 2010, currentCtc: 2400000, expectedCtc: 3200000, noticePeriod: 30, source: "NAUKRI", aiSummary: "Senior Operations Lead at PepsiCo with 13 years experience. Lean Six Sigma Green Belt. Ready for plant head role." } }),
    prisma.candidate.upsert({ where: { email: "meena.krishnan@example.com" }, update: {}, create: { name: "Meena Krishnan", email: "meena.krishnan@example.com", phone: "+91 98765 50004", currentCity: "Chennai", preferredLocations: ["Chennai"], willRelocate: false, currentCompany: "Hindustan Unilever", currentDesignation: "Plant Operations Manager", totalExperience: 15, skills: ["Plant Operations", "FMCG Manufacturing", "Lean Six Sigma", "Supply Chain Management", "Quality Control", "Safety Compliance", "Budgeting", "Team Management", "ERP Systems", "Sustainability"], degree: "BE Chemical", institution: "Anna University", graduationYear: 2008, currentCtc: 3200000, expectedCtc: 3800000, noticePeriod: 60, source: "LINKEDIN", aiSummary: "Plant Operations Manager at HUL with 15 years experience. Expertise in sustainable manufacturing and Lean operations." } }),
    prisma.candidate.upsert({ where: { email: "aravind.shetty@example.com" }, update: {}, create: { name: "Aravind Shetty", email: "aravind.shetty@example.com", phone: "+91 98765 50005", currentCity: "Mumbai", preferredLocations: ["Chennai", "Mumbai"], willRelocate: true, currentCompany: "ITC Limited", currentDesignation: "Factory Manager", totalExperience: 14, skills: ["Plant Operations", "FMCG Manufacturing", "Supply Chain Management", "Quality Control", "Safety Compliance", "Budgeting", "Team Management", "ERP Systems"], degree: "BE Mechanical", institution: "BITS Pilani", graduationYear: 2009, currentCtc: 2600000, expectedCtc: 3400000, noticePeriod: 45, source: "NAUKRI", aiSummary: "Factory Manager at ITC Limited with 14 years of FMCG manufacturing experience. BITS Pilani alumnus." } }),
    prisma.candidate.upsert({ where: { email: "nandini.raj@example.com" }, update: {}, create: { name: "Nandini Raj", email: "nandini.raj@example.com", phone: "+91 98765 50006", currentCity: "Coimbatore", preferredLocations: ["Chennai", "Coimbatore", "Bangalore"], willRelocate: true, currentCompany: "Parle Agro", currentDesignation: "Production Head", totalExperience: 12, skills: ["Plant Operations", "FMCG Manufacturing", "Lean Six Sigma", "Quality Control", "Safety Compliance", "Team Management", "ERP Systems"], degree: "BTech", institution: "NIT Calicut", graduationYear: 2011, currentCtc: 2200000, expectedCtc: 3000000, noticePeriod: 30, source: "DIRECT", aiSummary: "Production Head at Parle Agro with 12 years experience. Lean Six Sigma certified. Eager to take on larger plant operations responsibilities." } }),
  ]);
  console.log(`  ✅ ${candidates.length} candidates`);

  // ----- APPLICATIONS (populate pipeline) -----
  const stages: PipelineStage[] = ["NEW", "AI_SCREENING", "REVIEWED", "SUBMITTED", "INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETE", "OFFER_EXTENDED"];
  const [sapPm, oracleScm, aiArch, salesDir, plantHead] = jobs;

  const appData: { candidateId: string; jobId: string; stage: PipelineStage; matchScore: number }[] = [
    // SAP Program Manager applications
    { candidateId: candidates[0].id, jobId: sapPm.id, stage: "INTERVIEW_COMPLETE", matchScore: 92 },
    { candidateId: candidates[1].id, jobId: sapPm.id, stage: "INTERVIEW_SCHEDULED", matchScore: 88 },
    { candidateId: candidates[2].id, jobId: sapPm.id, stage: "REVIEWED", matchScore: 82 },
    { candidateId: candidates[3].id, jobId: sapPm.id, stage: "SUBMITTED", matchScore: 78 },
    { candidateId: candidates[4].id, jobId: sapPm.id, stage: "AI_SCREENING", matchScore: 70 },
    { candidateId: candidates[5].id, jobId: sapPm.id, stage: "NEW", matchScore: 65 },
    // Oracle SCM Consultant applications
    { candidateId: candidates[6].id, jobId: oracleScm.id, stage: "OFFER_EXTENDED", matchScore: 91 },
    { candidateId: candidates[7].id, jobId: oracleScm.id, stage: "INTERVIEW_COMPLETE", matchScore: 85 },
    { candidateId: candidates[8].id, jobId: oracleScm.id, stage: "INTERVIEW_SCHEDULED", matchScore: 88 },
    { candidateId: candidates[9].id, jobId: oracleScm.id, stage: "SUBMITTED", matchScore: 75 },
    { candidateId: candidates[10].id, jobId: oracleScm.id, stage: "REVIEWED", matchScore: 72 },
    { candidateId: candidates[11].id, jobId: oracleScm.id, stage: "AI_SCREENING", matchScore: 68 },
    // AI Solutions Architect applications
    { candidateId: candidates[12].id, jobId: aiArch.id, stage: "INTERVIEW_SCHEDULED", matchScore: 94 },
    { candidateId: candidates[13].id, jobId: aiArch.id, stage: "INTERVIEW_COMPLETE", matchScore: 90 },
    { candidateId: candidates[14].id, jobId: aiArch.id, stage: "SUBMITTED", matchScore: 85 },
    { candidateId: candidates[15].id, jobId: aiArch.id, stage: "REVIEWED", matchScore: 80 },
    { candidateId: candidates[16].id, jobId: aiArch.id, stage: "AI_SCREENING", matchScore: 76 },
    // Manufacturing Sales Director applications
    { candidateId: candidates[17].id, jobId: salesDir.id, stage: "INTERVIEW_COMPLETE", matchScore: 88 },
    { candidateId: candidates[18].id, jobId: salesDir.id, stage: "INTERVIEW_SCHEDULED", matchScore: 85 },
    { candidateId: candidates[19].id, jobId: salesDir.id, stage: "REVIEWED", matchScore: 82 },
    { candidateId: candidates[20].id, jobId: salesDir.id, stage: "SUBMITTED", matchScore: 78 },
    { candidateId: candidates[21].id, jobId: salesDir.id, stage: "AI_SCREENING", matchScore: 74 },
    // Plant Operations Head applications
    { candidateId: candidates[22].id, jobId: plantHead.id, stage: "INTERVIEW_SCHEDULED", matchScore: 89 },
    { candidateId: candidates[23].id, jobId: plantHead.id, stage: "SUBMITTED", matchScore: 84 },
    { candidateId: candidates[24].id, jobId: plantHead.id, stage: "REVIEWED", matchScore: 80 },
    { candidateId: candidates[25].id, jobId: plantHead.id, stage: "AI_SCREENING", matchScore: 76 },
    { candidateId: candidates[26].id, jobId: plantHead.id, stage: "NEW", matchScore: 72 },
    { candidateId: candidates[27].id, jobId: plantHead.id, stage: "NEW", matchScore: 68 },
  ];

  let appsCreated = 0;
  for (const a of appData) {
    try {
      await prisma.application.upsert({
        where: { candidateId_jobId: { candidateId: a.candidateId, jobId: a.jobId } },
        update: { stage: a.stage, matchScore: a.matchScore },
        create: { candidateId: a.candidateId, jobId: a.jobId, stage: a.stage, matchScore: a.matchScore, submittedAt: new Date() },
      });
      appsCreated++;
    } catch (e) {
      // skip duplicates
    }
  }
  console.log(`  ✅ ${appsCreated} pipeline entries`);

  // ----- INTERVIEWS (sample) -----
  const interviewApps = await prisma.application.findMany({
    where: { stage: { in: ["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETE"] } },
    include: { candidate: true, job: true },
    take: 6,
  });

  let interviewsCreated = 0;
  for (const app of interviewApps) {
    const isComplete = app.stage === "INTERVIEW_COMPLETE";
    const scheduledAt = isComplete ? new Date(Date.now() - 3 * 86400000) : new Date(Date.now() + 5 * 86400000);
    try {
      await prisma.interview.upsert({
        where: { id: `interview-${app.id}` },
        update: {},
        create: {
          id: `interview-${app.id}`,
          applicationId: app.id,
          candidateId: app.candidateId,
          scheduledAt,
          round: "L1",
          status: isComplete ? "COMPLETED" : "SCHEDULED",
          outcome: isComplete ? "PROCEED" : "PENDING",
          feedback: isComplete ? "Strong technical background. Good communication skills. Recommended for next round." : null,
          meetingLink: "https://meet.google.com/abc-defg-hij",
        },
      });
      interviewsCreated++;
    } catch (e) {
      // skip duplicates
    }
  }
  console.log(`  ✅ ${interviewsCreated} interviews`);

  // ----- PROJECTS (sample) -----
  const projectCandidates = candidates.slice(0, 6);
  const sampleProjects = [
    { name: "S/4HANA Global Template Rollout", role: "Program Lead", skills: ["SAP S/4HANA", "Project Management", "Agile"], desc: "Led the global template design and rollout across 12 countries for a Fortune 500 manufacturing company.", contrib: "Program leadership, stakeholder management, vendor selection" },
    { name: "Oracle Cloud SCM Implementation", role: "SCM Lead", skills: ["Oracle Fusion", "Supply Chain Planning", "Order Management"], desc: "End-to-end Oracle Fusion SCM implementation for a leading pharmaceutical company.", contrib: "Requirement gathering, solution design, team mentoring" },
    { name: "Enterprise AI Platform", role: "AI Architect", skills: ["LLMs", "RAG", "MLOps", "Kubernetes"], desc: "Designed and deployed an enterprise AI platform serving 5,000+ internal users with LLM-powered features.", contrib: "Architecture design, model selection, deployment pipeline" },
    { name: "EV Battery Manufacturing Expansion", role: "Sales Lead", skills: ["B2B Sales", "Key Account Management", "Market Analysis"], desc: "Led market entry strategy and sales for a new EV battery manufacturing division.", contrib: "Market research, client acquisition, team building" },
    { name: "Plant Digital Transformation", role: "Operations Head", skills: ["Plant Operations", "ERP Systems", "Team Management"], desc: "Led digital transformation of a 50-acre manufacturing plant including ERP implementation and automation.", contrib: "Project sponsorship, vendor management, change management" },
    { name: "AI-Powered Recruitment Platform", role: "Product Manager", skills: ["Product Management", "Agile", "AI/ML"], desc: "Built the TalentPulse AI-native recruitment platform from concept to MVP.", contrib: "Product strategy, requirements, stakeholder management" },
  ];

  let projectsCreated = 0;
  for (let i = 0; i < projectCandidates.length; i++) {
    const proj = sampleProjects[i];
    try {
      await prisma.project.upsert({
        where: { id: `project-${projectCandidates[i].id}-${i}` },
        update: {},
        create: {
          id: `project-${projectCandidates[i].id}-${i}`,
          candidateId: projectCandidates[i].id,
          projectName: proj.name,
          role: proj.role,
          skillsUsed: proj.skills,
          description: proj.desc,
          contribution: proj.contrib,
        },
      });
      projectsCreated++;
    } catch (e) {
      // skip duplicates
    }
  }
  console.log(`  ✅ ${projectsCreated} projects`);

  console.log("\n🎉 TalentPulse demo seeding complete!");
  console.log("   Demo credentials:");
  console.log("   Admin:     admin@talentpulse.demo / demo123");
  console.log("   Recruiter: recruiter1@talentpulse.demo / demo123");
  console.log("   Recruiter: recruiter2@talentpulse.demo / demo123");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
