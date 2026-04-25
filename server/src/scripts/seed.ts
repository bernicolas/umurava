/**
 * Seed script — populates the DB with a demo HR manager, 3 jobs, and 15 applicants per job.
 * Run: npm run seed
 */
import "dotenv/config";
import mongoose, { type HydratedDocument } from "mongoose";
import { User, type IUser } from "../models/User";
import { Job } from "../models/Job";
import { Applicant } from "../models/Applicant";
import { ScreeningResult } from "../models/ScreeningResult";

const MONGO_URI =
   process.env["MONGODB_URI"] ?? "mongodb://localhost:27017/umurava_hr";

// ─────────────────────────────────────────────────────────────────────────────
// Demo HR Manager
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_USER = {
   name: "Alex Uwimana",
   email: "demo@umurava.com",
   password: "Demo1234!",
   role: "recruiter" as const,
};

const DEMO_USERS = [
   DEMO_USER,
   {
      name: "Admin User",
      email: "admin@umurava.com",
      password: "Admin1234!",
      role: "admin" as const,
   },
   {
      name: "Jane Recruiter",
      email: "recruiter@umurava.com",
      password: "Recruiter1234!",
      role: "recruiter" as const,
   },
   {
      name: "John Candidate",
      email: "candidate@umurava.com",
      password: "Candidate1234!",
      role: "candidate" as const,
   },
];

// ─────────────────────────────────────────────────────────────────────────────
// Jobs
// ─────────────────────────────────────────────────────────────────────────────
const JOBS = [
   {
      title: "Senior Full-Stack Engineer",
      description:
         "We are looking for a seasoned Full-Stack Engineer to join our product team and help build scalable, high-performance systems that power Rwanda's leading talent marketplace. You will work closely with product, design, and data teams to ship features end-to-end.",
      requirements:
         "5+ years of professional software development experience. Strong proficiency in TypeScript, React, and Node.js. Experience with cloud infrastructure (AWS / GCP). Familiarity with Agile methodologies. Excellent communication skills.",
      requiredSkills: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS"],
      requiredExperience: 5,
      location: "Kigali, Rwanda (Hybrid)",
      type: "Full-time" as const,
      status: "open" as const,
      shortlistSize: 10 as const,
   },
   {
      title: "Product Designer (UX/UI)",
      description:
         "Join our design team to create intuitive and beautiful experiences for HR professionals across Africa. You will own the design process from research to high-fidelity prototypes, working in a collaborative, fast-paced environment.",
      requirements:
         "3+ years of UX/UI design experience. Expert-level proficiency in Figma. Strong portfolio demonstrating end-to-end product design. Experience with design systems. Knowledge of accessibility standards (WCAG 2.1).",
      requiredSkills: [
         "Figma",
         "User Research",
         "Prototyping",
         "Design Systems",
         "Usability Testing",
      ],
      requiredExperience: 3,
      location: "Kigali, Rwanda (On-site)",
      type: "Full-time" as const,
      status: "open" as const,
      shortlistSize: 10 as const,
   },
   {
      title: "Data Engineer",
      description:
         "We are scaling our data infrastructure to support AI-powered talent insights. You will design and maintain robust data pipelines, ensure data quality, and collaborate with our ML team to deliver reliable, analytics-ready datasets.",
      requirements:
         "4+ years of data engineering experience. Strong SQL and Python skills. Experience with Apache Spark or dbt. Familiarity with cloud data warehouses (BigQuery, Redshift, or Snowflake). Knowledge of data modelling and ETL best practices.",
      requiredSkills: ["Python", "SQL", "Apache Spark", "dbt", "BigQuery"],
      requiredExperience: 4,
      location: "Remote (Africa)",
      type: "Full-time" as const,
      status: "open" as const,
      shortlistSize: 10 as const,
   },
];

// ─────────────────────────────────────────────────────────────────────────────
// Applicant pools (5 per job, strong → weak)
// ─────────────────────────────────────────────────────────────────────────────

// helpers
const exp = (
   company: string,
   role: string,
   years: number,
   isCurrent = false,
   tech: string[] = [],
) => ({
   company,
   role,
   startDate: `${2024 - years}-01`,
   endDate: isCurrent
      ? ("Present" as const)
      : `${2024 - years + Math.max(1, years - 1)}-12`,
   description: `Led end-to-end delivery of critical features at ${company}, collaborating with cross-functional teams to meet product goals.`,
   technologies: tech,
   isCurrent,
});

const edu = (
   institution: string,
   degree: string,
   field: string,
   start: number,
) => ({
   institution,
   degree,
   fieldOfStudy: field,
   startYear: start,
   endYear: start + 4,
});

const skill = (
   name: string,
   level: "Beginner" | "Intermediate" | "Advanced" | "Expert",
   yoe: number,
) => ({
   name,
   level,
   yearsOfExperience: yoe,
});

const avail = (
   status: "Available" | "Open to Opportunities" | "Not Available",
   type: "Full-time" | "Part-time" | "Contract",
) => ({
   status,
   type,
   startDate: "2025-06-01",
});

// ── Full-Stack applicants ─────────────────────────────────────────────────────
const fullstackApplicants = [
   {
      firstName: "Chisom",
      lastName: "Okafor",
      email: "chisom.okafor@email.com",
      headline:
         "Senior Full-Stack Engineer @ Andela | TypeScript · React · Node",
      location: "Lagos, Nigeria",
      bio: "I build products that scale.",
      skills: [
         skill("TypeScript", "Expert", 7),
         skill("React", "Expert", 7),
         skill("Node.js", "Expert", 6),
         skill("PostgreSQL", "Advanced", 5),
         skill("AWS", "Advanced", 4),
      ],
      experience: [
         exp("Andela", "Senior Software Engineer", 4, true, [
            "TypeScript",
            "React",
            "Node.js",
            "AWS",
         ]),
         exp("Flutterwave", "Mid-Level Engineer", 3, false, [
            "JavaScript",
            "Vue.js",
            "MongoDB",
         ]),
      ],
      education: [
         edu("University of Lagos", "Bachelor's", "Computer Science", 2013),
      ],
      certifications: [
         {
            name: "AWS Solutions Architect – Associate",
            issuer: "Amazon Web Services",
            issueDate: "2022-03",
         },
      ],
      projects: [
         {
            name: "PayFlow Dashboard",
            description:
               "Real-time payments analytics platform serving 200k+ transactions/day",
            technologies: ["React", "Node.js", "Redis", "PostgreSQL"],
            role: "Tech Lead",
            startDate: "2022-01",
            endDate: "2023-06",
         },
      ],
      availability: avail("Available", "Full-time"),
      socialLinks: {
         github: "https://github.com/chisom-dev",
         linkedin: "https://linkedin.com/in/chisom-okafor",
      },
   },
   {
      firstName: "Amara",
      lastName: "Diallo",
      email: "amara.diallo@email.com",
      headline: "Full-Stack Engineer | React · TypeScript · AWS | 6 yrs",
      location: "Dakar, Senegal",
      bio: "Passionate about clean architecture and developer experience.",
      skills: [
         skill("TypeScript", "Expert", 6),
         skill("React", "Advanced", 6),
         skill("Node.js", "Advanced", 5),
         skill("AWS", "Intermediate", 3),
         skill("PostgreSQL", "Intermediate", 3),
      ],
      experience: [
         exp("Wave Mobile Money", "Full-Stack Engineer", 3, true, [
            "React",
            "TypeScript",
            "Node.js",
         ]),
         exp("Orange Digital Center", "Junior Engineer", 3, false, [
            "JavaScript",
            "PHP",
         ]),
      ],
      education: [
         edu(
            "Université Cheikh Anta Diop",
            "Bachelor's",
            "Mathematics & Computer Science",
            2015,
         ),
      ],
      certifications: [],
      projects: [
         {
            name: "Credit Scoring Engine",
            description:
               "ML-driven credit scoring API integrated into mobile app",
            technologies: ["TypeScript", "Node.js", "PostgreSQL"],
            role: "Backend Lead",
            startDate: "2023-01",
            endDate: "2024-01",
         },
      ],
      availability: avail("Available", "Full-time"),
      socialLinks: { github: "https://github.com/amara-d" },
   },
   {
      firstName: "Kevin",
      lastName: "Nkurunziza",
      email: "kevin.nkurunziza@email.com",
      headline: "Software Engineer · React / Node.js · Kigali",
      location: "Kigali, Rwanda",
      bio: "Building for Africa from Africa.",
      skills: [
         skill("JavaScript", "Advanced", 5),
         skill("React", "Advanced", 4),
         skill("Node.js", "Intermediate", 3),
         skill("MySQL", "Intermediate", 3),
         skill("AWS", "Beginner", 1),
      ],
      experience: [
         exp("Irembo", "Software Engineer", 3, true, [
            "React",
            "Node.js",
            "MySQL",
         ]),
         exp("Klab", "Junior Developer", 2, false, ["JavaScript", "PHP"]),
      ],
      education: [
         edu(
            "Carnegie Mellon University Africa",
            "Master's",
            "Information Technology",
            2019,
         ),
      ],
      certifications: [],
      projects: [
         {
            name: "Irembo Gov Portal",
            description:
               "Public services digitisation portal used by 3M+ citizens",
            technologies: ["React", "Node.js", "MySQL"],
            role: "Frontend Lead",
            startDate: "2021-06",
            endDate: "2023-12",
         },
      ],
      availability: avail("Open to Opportunities", "Full-time"),
      socialLinks: {
         linkedin: "https://linkedin.com/in/kevin-dev",
         github: "https://github.com/kevin-rw",
      },
   },
   {
      firstName: "Fatou",
      lastName: "Coulibaly",
      email: "fatou.coulibaly@email.com",
      headline: "Backend Engineer · Python / Django / PostgreSQL",
      location: "Abidjan, Côte d'Ivoire",
      bio: "I love APIs and databases.",
      skills: [
         skill("Python", "Advanced", 5),
         skill("Django", "Advanced", 4),
         skill("PostgreSQL", "Advanced", 4),
         skill("React", "Beginner", 1),
         skill("AWS", "Intermediate", 2),
      ],
      experience: [
         exp("CinetPay", "Backend Engineer", 4, true, [
            "Python",
            "Django",
            "PostgreSQL",
         ]),
         exp("Freelance", "Full-Stack Developer", 2, false, [
            "Python",
            "Vue.js",
         ]),
      ],
      education: [
         edu(
            "Institut National Polytechnique Félix Houphouët-Boigny",
            "Bachelor's",
            "Computer Engineering",
            2016,
         ),
      ],
      certifications: [],
      projects: [
         {
            name: "Payment Gateway API",
            description:
               "High-throughput payment processing API for West Africa, 99.9% uptime",
            technologies: ["Python", "Django", "Redis", "PostgreSQL"],
            role: "Lead Developer",
            startDate: "2022-01",
         },
      ],
      availability: avail("Available", "Full-time"),
      socialLinks: { github: "https://github.com/fatou-dev" },
   },
   {
      firstName: "Emmanuel",
      lastName: "Asante",
      email: "e.asante@email.com",
      headline: "Junior Full-Stack Developer | React · Node",
      location: "Accra, Ghana",
      bio: "Fresh grad, keen learner.",
      skills: [
         skill("JavaScript", "Intermediate", 2),
         skill("React", "Intermediate", 2),
         skill("Node.js", "Beginner", 1),
         skill("MongoDB", "Beginner", 1),
      ],
      experience: [
         exp("Farmerline", "Junior Developer", 1, true, ["React", "Node.js"]),
      ],
      education: [
         edu("University of Ghana", "Bachelor's", "Computer Science", 2020),
      ],
      certifications: [],
      projects: [
         {
            name: "Agri-Connect App",
            description: "Mobile-first app connecting farmers to markets",
            technologies: ["React Native", "Node.js"],
            role: "Developer",
            startDate: "2024-01",
         },
      ],
      availability: avail("Available", "Full-time"),
      socialLinks: {},
   },
];

// ── UX/UI Designer applicants ─────────────────────────────────────────────────
const designerApplicants = [
   {
      firstName: "Zara",
      lastName: "Mensah",
      email: "zara.mensah@email.com",
      headline:
         "Senior Product Designer @ Paystack | Figma Expert | Design Systems",
      location: "Lagos, Nigeria",
      bio: "I craft interfaces that delight and perform.",
      skills: [
         skill("Figma", "Expert", 6),
         skill("User Research", "Expert", 5),
         skill("Prototyping", "Expert", 6),
         skill("Design Systems", "Advanced", 4),
         skill("Usability Testing", "Advanced", 4),
      ],
      experience: [
         exp("Paystack", "Senior Product Designer", 4, true, [
            "Figma",
            "Maze",
            "Notion",
         ]),
         exp("GTBank Digital", "UX Designer", 2, false, ["Sketch", "InVision"]),
      ],
      education: [
         edu(
            "University of Cape Town",
            "Bachelor's",
            "Visual Communication Design",
            2016,
         ),
      ],
      certifications: [
         {
            name: "Google UX Design Certificate",
            issuer: "Google / Coursera",
            issueDate: "2021-05",
         },
      ],
      projects: [
         {
            name: "Paystack Merchant Dashboard v3",
            description:
               "Complete redesign of the merchant portal serving 100k+ businesses across Africa",
            technologies: ["Figma", "FigJam", "Maze"],
            role: "Design Lead",
            startDate: "2022-03",
            endDate: "2023-09",
         },
      ],
      availability: avail("Open to Opportunities", "Full-time"),
      socialLinks: {
         linkedin: "https://linkedin.com/in/zara-mensah",
         portfolio: "https://zaramensah.design",
      },
   },
   {
      firstName: "Imani",
      lastName: "Kariuki",
      email: "imani.kariuki@email.com",
      headline: "Product Designer | SaaS & Fintech | Nairobi",
      location: "Nairobi, Kenya",
      bio: "User-centered design with a love for accessibility.",
      skills: [
         skill("Figma", "Expert", 5),
         skill("User Research", "Advanced", 4),
         skill("Prototyping", "Advanced", 5),
         skill("Design Systems", "Advanced", 3),
         skill("Usability Testing", "Intermediate", 3),
      ],
      experience: [
         exp("Safaricom", "Product Designer", 3, true, [
            "Figma",
            "UserTesting",
         ]),
         exp("Cellulant", "UX/UI Designer", 2, false, ["Sketch", "Zeplin"]),
      ],
      education: [
         edu(
            "Strathmore University",
            "Bachelor's",
            "Information Technology",
            2017,
         ),
      ],
      certifications: [
         {
            name: "Interaction Design Foundation – UX Design",
            issuer: "IDF",
            issueDate: "2022-08",
         },
      ],
      projects: [
         {
            name: "M-Pesa Super App Redesign",
            description:
               "Led research + design for the Super App redesign, improving task completion by 28%",
            technologies: ["Figma", "Hotjar", "Google Analytics"],
            role: "Lead Designer",
            startDate: "2023-01",
            endDate: "2024-03",
         },
      ],
      availability: avail("Available", "Full-time"),
      socialLinks: {
         portfolio: "https://imani.design",
         linkedin: "https://linkedin.com/in/imani-k",
      },
   },
   {
      firstName: "Rokia",
      lastName: "Traoré",
      email: "rokia.traore@email.com",
      headline: "UX Designer · Fintech · 3 years exp",
      location: "Bamako, Mali",
      bio: "Designing for low-bandwidth, multilingual users.",
      skills: [
         skill("Figma", "Advanced", 3),
         skill("User Research", "Advanced", 3),
         skill("Prototyping", "Intermediate", 3),
         skill("Usability Testing", "Intermediate", 2),
      ],
      experience: [
         exp("Orange Money Mali", "UX Designer", 3, true, ["Figma", "Maze"]),
      ],
      education: [
         edu(
            "École Supérieure des Technologies de l'Information",
            "Bachelor's",
            "Multimedia Design",
            2019,
         ),
      ],
      certifications: [],
      projects: [
         {
            name: "Orange Money Onboarding",
            description:
               "Redesigned onboarding flow reducing drop-off by 35% in rural Mali",
            technologies: ["Figma", "Hotjar"],
            role: "UX Designer",
            startDate: "2023-04",
            endDate: "2024-02",
         },
      ],
      availability: avail("Available", "Full-time"),
      socialLinks: {},
   },
   {
      firstName: "Tunde",
      lastName: "Adeyemi",
      email: "tunde.adeyemi@email.com",
      headline: "UI Designer & Front-End Developer | React + Figma",
      location: "Ibadan, Nigeria",
      bio: "I bridge design and code.",
      skills: [
         skill("Figma", "Advanced", 4),
         skill("Prototyping", "Advanced", 4),
         skill("Design Systems", "Intermediate", 2),
         skill("HTML/CSS", "Advanced", 5),
      ],
      experience: [
         exp("Konga", "UI Designer", 4, true, ["Figma", "CSS"]),
         exp("Freelance", "Web Designer", 2, false, ["Adobe XD"]),
      ],
      education: [
         edu(
            "Ladoke Akintola University",
            "Bachelor's",
            "Computer Engineering",
            2018,
         ),
      ],
      certifications: [],
      projects: [],
      availability: avail("Open to Opportunities", "Contract"),
      socialLinks: {},
   },
   {
      firstName: "Nadia",
      lastName: "Boateng",
      email: "nadia.boateng@email.com",
      headline: "Junior UX Designer | Graphic Design background",
      location: "Kumasi, Ghana",
      bio: "Transitioning from graphic design to product design.",
      skills: [
         skill("Figma", "Intermediate", 2),
         skill("Prototyping", "Beginner", 1),
         skill("User Research", "Beginner", 1),
      ],
      experience: [
         exp("Graphic Minds Agency", "Graphic Designer", 3, false, [
            "Photoshop",
            "Illustrator",
         ]),
      ],
      education: [
         edu(
            "Kwame Nkrumah University",
            "Bachelor's",
            "Fine Art & Graphic Design",
            2020,
         ),
      ],
      certifications: [
         {
            name: "Google UX Design Certificate",
            issuer: "Coursera",
            issueDate: "2024-01",
         },
      ],
      projects: [],
      availability: avail("Available", "Full-time"),
      socialLinks: {},
   },
];

// ── Data Engineer applicants ──────────────────────────────────────────────────
const dataEngineerApplicants = [
   {
      firstName: "Kwame",
      lastName: "Asare",
      email: "kwame.asare@email.com",
      headline: "Senior Data Engineer @ MTN Group | Spark · dbt · BigQuery",
      location: "Johannesburg, South Africa",
      bio: "Building the data infrastructure for Africa's digital economy.",
      skills: [
         skill("Python", "Expert", 7),
         skill("SQL", "Expert", 7),
         skill("Apache Spark", "Expert", 5),
         skill("dbt", "Advanced", 4),
         skill("BigQuery", "Advanced", 4),
      ],
      experience: [
         exp("MTN Group", "Senior Data Engineer", 4, true, [
            "Spark",
            "BigQuery",
            "dbt",
            "Python",
         ]),
         exp("BCX", "Data Engineer", 3, false, ["Python", "Hadoop", "Hive"]),
      ],
      education: [
         edu(
            "University of the Witwatersrand",
            "Master's",
            "Computer Science",
            2014,
         ),
      ],
      certifications: [
         {
            name: "Google Professional Data Engineer",
            issuer: "Google Cloud",
            issueDate: "2022-06",
         },
      ],
      projects: [
         {
            name: "MTN Real-Time Churn Pipeline",
            description:
               "Streaming data pipeline predicting churn for 70M+ subscribers using Spark Structured Streaming",
            technologies: ["Spark", "Kafka", "BigQuery", "Python"],
            role: "Lead Engineer",
            startDate: "2022-06",
            endDate: "2024-01",
         },
      ],
      availability: avail("Open to Opportunities", "Full-time"),
      socialLinks: {
         linkedin: "https://linkedin.com/in/kwame-asare",
         github: "https://github.com/kwame-de",
      },
   },
   {
      firstName: "Miriam",
      lastName: "Wanjiru",
      email: "miriam.wanjiru@email.com",
      headline: "Data Engineer | Python · SQL · AWS Glue · dbt",
      location: "Nairobi, Kenya",
      bio: "Turning raw data into reliable, analytics-ready assets.",
      skills: [
         skill("Python", "Advanced", 5),
         skill("SQL", "Expert", 6),
         skill("dbt", "Advanced", 3),
         skill("AWS", "Advanced", 4),
         skill("Apache Spark", "Intermediate", 2),
      ],
      experience: [
         exp("M-Kopa", "Data Engineer", 3, true, [
            "dbt",
            "AWS Glue",
            "Redshift",
         ]),
         exp("Nation Media", "Data Analyst", 3, false, [
            "SQL",
            "Python",
            "Tableau",
         ]),
      ],
      education: [
         edu(
            "University of Nairobi",
            "Bachelor's",
            "Statistics & Computer Science",
            2016,
         ),
      ],
      certifications: [
         {
            name: "AWS Certified Data Analytics – Specialty",
            issuer: "Amazon Web Services",
            issueDate: "2023-03",
         },
      ],
      projects: [
         {
            name: "IoT Device Data Lake",
            description:
               "Built data lake processing 500k+ solar device telemetry records daily on AWS",
            technologies: ["AWS Glue", "S3", "dbt", "Redshift"],
            role: "Data Engineer",
            startDate: "2022-01",
            endDate: "2023-12",
         },
      ],
      availability: avail("Available", "Full-time"),
      socialLinks: {
         github: "https://github.com/miriam-data",
         linkedin: "https://linkedin.com/in/miriam-wanjiru",
      },
   },
   {
      firstName: "Segun",
      lastName: "Adesanya",
      email: "segun.adesanya@email.com",
      headline: "Data Engineer · Fintech · Python / Airflow / BigQuery",
      location: "Lagos, Nigeria",
      bio: "Orchestrating data at scale for financial services.",
      skills: [
         skill("Python", "Advanced", 4),
         skill("SQL", "Advanced", 5),
         skill("BigQuery", "Intermediate", 2),
         skill("Apache Airflow", "Advanced", 3),
         skill("dbt", "Intermediate", 2),
      ],
      experience: [
         exp("Kuda Bank", "Data Engineer", 3, true, [
            "Airflow",
            "BigQuery",
            "Python",
         ]),
         exp("Sterling Bank", "BI Developer", 2, false, ["SQL", "Power BI"]),
      ],
      education: [
         edu("University of Ibadan", "Bachelor's", "Statistics", 2017),
      ],
      certifications: [],
      projects: [
         {
            name: "Fraud Detection Pipeline",
            description:
               "Near-real-time fraud detection pipeline processing 2M transactions/day",
            technologies: ["Airflow", "BigQuery", "Python", "Pub/Sub"],
            role: "Lead Engineer",
            startDate: "2023-01",
         },
      ],
      availability: avail("Available", "Full-time"),
      socialLinks: {},
   },
   {
      firstName: "Absa",
      lastName: "Ndoye",
      email: "absa.ndoye@email.com",
      headline: "Junior Data Engineer | Python · SQL · Spark",
      location: "Dakar, Senegal",
      bio: "Looking to grow in data engineering.",
      skills: [
         skill("Python", "Intermediate", 2),
         skill("SQL", "Advanced", 3),
         skill("Apache Spark", "Beginner", 1),
      ],
      experience: [
         exp("Expresso Telecom", "Data Analyst", 2, true, [
            "SQL",
            "Python",
            "Excel",
         ]),
      ],
      education: [
         edu("Université de Thiès", "Bachelor's", "Applied Mathematics", 2020),
      ],
      certifications: [],
      projects: [],
      availability: avail("Available", "Full-time"),
      socialLinks: {},
   },
   {
      firstName: "Madu",
      lastName: "Chibuike",
      email: "madu.chibuike@email.com",
      headline: "Data Analyst transitioning to Data Engineering",
      location: "Enugu, Nigeria",
      bio: "Strong SQL skills, learning Spark and dbt.",
      skills: [
         skill("SQL", "Advanced", 4),
         skill("Python", "Intermediate", 2),
         skill("dbt", "Beginner", 1),
      ],
      experience: [
         exp("MainOne", "Data Analyst", 3, false, ["SQL", "Power BI", "Excel"]),
         exp("Access Bank", "Junior Analyst", 2, false, ["SQL"]),
      ],
      education: [
         edu(
            "University of Nigeria Nsukka",
            "Bachelor's",
            "Computer Science",
            2018,
         ),
      ],
      certifications: [],
      projects: [],
      availability: avail("Open to Opportunities", "Full-time"),
      socialLinks: {},
   },
];

const APPLICANT_POOLS = [
   fullstackApplicants,
   designerApplicants,
   dataEngineerApplicants,
];

// ─────────────────────────────────────────────────────────────────────────────
// Seed runner
// ─────────────────────────────────────────────────────────────────────────────
async function seed(): Promise<void> {
   await mongoose.connect(MONGO_URI);
   console.log("✅ Connected to MongoDB:", MONGO_URI);

   // Clean up previous seed data for all demo accounts
   const demoEmails = DEMO_USERS.map((u) => u.email);
   const existingUsers = await User.find({ email: { $in: demoEmails } });
   if (existingUsers.length > 0) {
      const userIds = existingUsers.map((u) => u._id);
      const jobIds = await Job.find({ createdBy: { $in: userIds } }).distinct("_id");
      await Applicant.deleteMany({ jobId: { $in: jobIds } });
      await ScreeningResult.deleteMany({ jobId: { $in: jobIds } });
      await Job.deleteMany({ createdBy: { $in: userIds } });
      await User.deleteMany({ _id: { $in: userIds } });
      console.log("🗑️  Cleared previous seed data");
   }

   // Create all demo users (model pre-save hook handles password hashing)
   let primaryRecruiter: HydratedDocument<IUser> | null = null;
   for (const demoUser of DEMO_USERS) {
      const u = await User.create(demoUser);
      if (demoUser.email === DEMO_USER.email) {
         primaryRecruiter = u as HydratedDocument<IUser>;
      }
      console.log(`👤 ${demoUser.role.padEnd(10)} ${demoUser.email} / ${demoUser.password}`);
   }

   // Create jobs + applicants under the primary recruiter (demo@umurava.com)
   for (let i = 0; i < JOBS.length; i++) {
      const jobData = JOBS[i]!;
      const job = await Job.create({ ...jobData, createdBy: primaryRecruiter!._id });

      const applicantPool = APPLICANT_POOLS[i]!;
      const docs = applicantPool.map((profile) => ({
         jobId: job._id,
         source: "platform" as const,
         profile,
      }));
      await Applicant.insertMany(docs);

      console.log(
         `💼 Job "${jobData.title}" → ${applicantPool.length} applicants seeded`,
      );
   }

   console.log("\n🎉 Seed complete!\n");
   console.log("┌──────────────────────────────────────────────────────────┐");
   console.log("│  Demo accounts                                           │");
   console.log("│                                                          │");
   console.log("│  Role       Email                     Password           │");
   console.log("│  ─────────  ────────────────────────  ────────────────── │");
   console.log("│  admin      admin@umurava.com          Admin1234!        │");
   console.log("│  recruiter  demo@umurava.com           Demo1234!         │");
   console.log("│  recruiter  recruiter@umurava.com      Recruiter1234!    │");
   console.log("│  candidate  candidate@umurava.com      Candidate1234!    │");
   console.log("└──────────────────────────────────────────────────────────┘");

   await mongoose.disconnect();
}

seed().catch((err) => {
   console.error("❌ Seed failed:", err);
   process.exit(1);
});
