const path = require('path');
const fs = require('fs');
const { userRepo, jobRepo, applicantRepo, memoryStore } = require('../models/store');
const { analyzeMatch } = require('../services/matchingEngine.service');
const { parseResume } = require('../services/nlpParser.service');

// Default manual demo resumes
const DEMO_RESUMES = {
  alexMorgan: `
ALEX MORGAN
Senior Full Stack Engineer
alex.morgan.dev@gmail.com | (555) 382-9014 | San Francisco, CA
LinkedIn: linkedin.com/in/alexmorgan-dev | GitHub: github.com/alexmorgan

PROFESSIONAL SUMMARY
Results-driven Full Stack Engineer with over 6 years of professional experience architecting scalable web applications using the MERN stack (MongoDB, Express.js, React, Node.js). Proven track record leading microservices migrations, optimizing database queries, and deploying containerized applications on AWS.

TECHNICAL SKILLS
Languages: JavaScript (ES6+), TypeScript, Python, HTML5, CSS3, SQL
Frontend: React, Redux, Next.js, AngularJS, Bootstrap, TailwindCSS, Webpack
Backend: Node.js, Express, RESTful APIs, GraphQL, Microservices, NestJS
Databases: MongoDB, Mongoose, PostgreSQL, Redis
Cloud & DevOps: Docker, Kubernetes, AWS (EC2, S3, Lambda), CI/CD, GitHub Actions
Testing & Methods: Jest, Mocha, Agile, Scrum, TDD, Git

PROFESSIONAL EXPERIENCE
Senior Software Engineer | TechScale Solutions (2021 – Present)
- Architected enterprise cloud platforms using Node.js, Express, and React, reducing page latency by 42%.
- Designed distributed MongoDB aggregations and indexing schemas handling 2M+ daily active requests.
- Integrated automated CI/CD pipelines via GitHub Actions and Docker containers deployed to AWS ECS.
- Mentored 5 junior and mid-level engineers in code quality, TDD, and clean architecture.

Full Stack Developer | CloudNova Inc. (2018 – 2021)
- Developed responsive single-page applications using React, HTML5, CSS3, and Node.js.
- Implemented secure JWT authentication and role-based access control across multi-tenant APIs.
- Built automated test suites using Jest and Cypress achieving 88% test coverage.

EDUCATION
Bachelor of Science in Computer Science | University of California, Berkeley (2014 – 2018)
`,

  priyaSharma: `
PRIYA SHARMA
Lead NLP & Machine Learning Engineer
priya.sharma.ai@outlook.com | +1 (555) 724-1189 | New York, NY
GitHub: github.com/priyasharma-nlp | Google Scholar: scholar.google.com/priyasharma

SUMMARY
Innovative AI & Machine Learning Specialist with 6+ years of industry experience developing state-of-the-art NLP pipelines, semantic search engines, and transformer-based language models. Passionate about bringing cutting-edge LLMs and statistical text mining to production.

CORE COMPETENCIES
AI & NLP: Natural Language Processing, Machine Learning, Deep Learning, Transformers, BERT, LLMs, Text Mining, Vector Databases, FAISS, LangChain, Hugging Face
Languages: Python, C++, SQL, Bash
Frameworks: PyTorch, TensorFlow, Scikit-learn, Pandas, NumPy, Keras, FastAPI, Flask
DevOps & Cloud: Docker, Kubernetes, AWS, GCP, MLflow, Git, CI/CD

EXPERIENCE
Lead Machine Learning Engineer | DeepCognition Labs (2020 – Present)
- Engineered large-scale NLP information extraction pipeline utilizing PyTorch, Hugging Face Transformers, and BERT.
- Deployed high-throughput semantic similarity and vector retrieval engines using Scikit-learn and FAISS.
- Supervised end-to-end model training, validation, and containerized deployment with Docker and Kubernetes on GCP.

Senior Data Scientist | DataVenture Analytics (2018 – 2020)
- Designed machine learning classification and sentiment analysis algorithms using Python, Scikit-learn, and Pandas.
- Fine-tuned transformer models for biomedical entity recognition with 94.2% F1 score.

EDUCATION
Master of Science in Artificial Intelligence & Computer Science | Columbia University (2016 – 2018)
Bachelor of Technology in Computer Engineering | IIT Delhi (2012 – 2016)
`,

  davidKim: `
DAVID KIM
Frontend Web Developer
david.kim.frontend@yahoo.com | (555) 912-4433 | Austin, TX
Portfolio: davidkim-dev.io | GitHub: github.com/davidkim-fe

PROFILE
Passionate Frontend Developer with 2 years of experience creating dynamic, responsive web applications. Strong foundation in JavaScript, HTML5, CSS3, AngularJS, and Bootstrap with a keen eye for accessible UI/UX and seamless responsive styling.

SKILLS
Languages: JavaScript, HTML5, CSS3, TypeScript
Frameworks & Libraries: AngularJS, Angular, Bootstrap, jQuery, SASS
Tools & Practices: Git, GitHub, REST APIs, JSON, Responsive Web Design, NPM, Webpack

EXPERIENCE
Junior Frontend Developer | PixelCraft Interactive (2022 – Present)
- Developed and maintained responsive recruiter and client portal dashboards using AngularJS 1.x, HTML5, and Bootstrap.
- Integrated RESTful backend endpoints with AngularJS $http services and dependency injection.
- Optimized UI components ensuring WCAG 2.1 AA accessibility and cross-browser responsiveness.

Web Development Intern | NovaTech Agency (2021 – 2022)
- Built interactive landing pages and reusable UI widgets using HTML5, CSS3, and JavaScript.
- Collaborated in daily Agile/Scrum standups and managed code versions with Git.

EDUCATION
Bachelor of Science in Information Technology | University of Texas at Austin (2018 – 2022)
`
};

// Deterministic name generation for synthetic sample candidates
const FIRST_NAMES = [
  'Avery', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Cameron', 'Dakota',
  'Quinn', 'Reese', 'Rowan', 'Finley', 'Skyler', 'Kendall', 'Emerson', 'Hayden',
  'Logan', 'Sawyer', 'Parker', 'Peyton', 'Harper', 'Eden', 'Micah', 'Kai',
  'Dallas', 'Amari', 'Shiloh', 'River', 'Milan', 'Remy', 'Sage', 'Jesse'
];

const LAST_NAMES = [
  'Chen', 'Vance', 'Sinclair', 'Patel', 'Mercer', 'Novak', 'Zhao', "O'Connor",
  'Lindqvist', 'Nakamura', 'Alvarez', 'Dubois', 'Castillo', 'Kowalski', 'Moreno', 'Fischer',
  'Brennan', 'Gomez', 'Kim', 'Sterling', 'Thornton', 'Holt', 'Reyes', 'Gallagher'
];

function getCandidateName(resumeId) {
  const num = parseInt(resumeId.replace(/\D/g, ''), 10) || 0;
  const first = FIRST_NAMES[num % FIRST_NAMES.length];
  const last = LAST_NAMES[Math.floor(num / FIRST_NAMES.length) % LAST_NAMES.length];
  return `${first} ${last}`;
}

/**
 * Build rich resume text incorporating all 8 required fields:
 * role, seniority, years of experience, industry, education, skills, summary, and experience bullets.
 */
function buildSyntheticResumeText(record, fullName, email, phone) {
  const degreeMap = {
    'BSc': 'Bachelor of Science (BSc)',
    'MSc': 'Master of Science (MSc)',
    'PhD': 'Doctor of Philosophy (PhD)',
    'High School': 'High School Diploma',
    'Associate': 'Associate Degree in Applied Sciences'
  };
  const eduStr = degreeMap[record.education] || record.education || 'Bachelor of Science';

  const bullets = Array.isArray(record.experience_bullets) && record.experience_bullets.length > 0
    ? record.experience_bullets.map(b => `- ${b}`).join('\n')
    : `- Successfully drove strategic delivery and cross-functional operational milestones in ${record.industry}.`;

  const skillsList = Array.isArray(record.skills) ? record.skills.join(', ') : '';

  return `${fullName.toUpperCase()}
${record.seniority} ${record.role} — Industry: ${record.industry}
Email: ${email} | Phone: ${phone} | Location: Remote / Nationwide

PROFESSIONAL SUMMARY
${record.summary}

CORE SKILLS & TECHNOLOGIES
${skillsList}

PROFESSIONAL EXPERIENCE
${record.seniority} ${record.role} | Enterprise ${record.industry} Systems
Total Experience: ${record.years_experience} years of experience
Key Responsibilities & Bullet Points:
${bullets}

EDUCATION
${eduStr} | Accredited University Degree
`;
}

async function seedData() {
  console.log('[Seed] Checking and seeding starter demo data...');

  // 1. Ensure Recruiter Account exists
  let recruiter = await userRepo.findByEmail('recruiter@demo.com');
  if (!recruiter) {
    recruiter = await userRepo.create({
      name: 'Manikanta',
      email: 'recruiter@demo.com',
      password: 'password123',
      company: 'TalentForge Technologies',
      role: 'recruiter'
    });
    console.log('[Seed] Created default demo recruiter: recruiter@demo.com / password123');
  }

  // 2. Ensure Original Core Sample Jobs exist
  const existingJobs = await jobRepo.find({});
  let fullStackJob, nlpJob, frontendJob;

  const coreJobs = existingJobs.filter(j => !j.benchmark || !j.benchmark.isSynthetic);
  if (coreJobs.length === 0) {
    fullStackJob = await jobRepo.create({
      title: 'Senior Full Stack Engineer (MERN)',
      department: 'Platform Engineering',
      location: 'Hybrid / Remote',
      employmentType: 'Full-time',
      description: 'We are seeking an experienced Senior Full Stack Engineer to lead the architecture and scaling of our enterprise talent intelligence platform. You will build high-throughput APIs in Node.js/Express, craft responsive frontend interfaces in React/Angular, optimize MongoDB schemas, and oversee Docker deployments on AWS.',
      requiredSkills: ['JavaScript', 'Node.js', 'Express', 'React', 'MongoDB'],
      preferredSkills: ['TypeScript', 'Docker', 'AWS', 'GraphQL', 'CI/CD'],
      minExperience: 4,
      education: 'Bachelor',
      weights: { skills: 40, similarity: 30, experience: 20, education: 10 },
      status: 'Active',
      createdBy: recruiter._id
    });

    nlpJob = await jobRepo.create({
      title: 'Lead NLP & Machine Learning Engineer',
      department: 'AI & Data Science',
      location: 'Remote',
      employmentType: 'Full-time',
      description: 'Join our AI Innovation team to spearhead intelligent semantic matching algorithms, transformer-based document parsing, and NLP classification pipelines. You must possess deep hands-on expertise with Python, PyTorch, Hugging Face Transformers, vector embeddings, and production model serving.',
      requiredSkills: ['Python', 'Machine Learning', 'NLP', 'PyTorch', 'Transformers'],
      preferredSkills: ['BERT', 'Deep Learning', 'Docker', 'Scikit-learn', 'GCP'],
      minExperience: 5,
      education: 'Master',
      weights: { skills: 45, similarity: 25, experience: 20, education: 10 },
      status: 'Active',
      createdBy: recruiter._id
    });

    frontendJob = await jobRepo.create({
      title: 'Junior Frontend Developer (AngularJS & Web UI)',
      department: 'Design & UX',
      location: 'San Francisco, CA',
      employmentType: 'Full-time',
      description: 'Looking for a motivated Frontend Web Developer to maintain and elevate our rich single-page client dashboards. You will work closely with product designers to implement clean HTML5/CSS3 layouts, AngularJS controllers and directives, and sleek Bootstrap components.',
      requiredSkills: ['HTML5', 'CSS3', 'JavaScript', 'AngularJS', 'Bootstrap'],
      preferredSkills: ['Git', 'REST API', 'TypeScript'],
      minExperience: 1,
      education: 'Bachelor',
      weights: { skills: 50, similarity: 30, experience: 10, education: 10 },
      status: 'Active',
      createdBy: recruiter._id
    });

    console.log('[Seed] Created 3 core demo job postings.');
  } else {
    fullStackJob = coreJobs[0];
    nlpJob = coreJobs[1] || coreJobs[0];
    frontendJob = coreJobs[2] || coreJobs[0];
  }

  // 3. Ensure Original Core Applicants exist
  const existingApplicants = await applicantRepo.find({});
  const coreApplicants = existingApplicants.filter(a => !a.benchmark || !a.benchmark.syntheticResumeId);

  if (coreApplicants.length === 0) {
    // Alex Morgan -> Full Stack Job
    const alexParsed = parseResume(DEMO_RESUMES.alexMorgan, 'Alex_Morgan_Senior_FullStack.pdf', [
      ...(fullStackJob.requiredSkills || []),
      ...(fullStackJob.preferredSkills || [])
    ]);
    const alexMatch = analyzeMatch(fullStackJob, alexParsed, DEMO_RESUMES.alexMorgan);

    await applicantRepo.create({
      jobId: fullStackJob._id,
      fullName: 'Alex Morgan',
      email: 'alex.morgan.dev@gmail.com',
      phone: '(555) 382-9014',
      location: 'San Francisco, CA',
      resumeFile: {
        originalName: 'Alex_Morgan_Senior_FullStack.pdf',
        filename: 'Alex_Morgan_Senior_FullStack-demo.pdf',
        mimeType: 'application/pdf',
        size: 142500,
        path: 'uploads/Alex_Morgan_Senior_FullStack-demo.pdf'
      },
      extractedText: DEMO_RESUMES.alexMorgan.trim(),
      extractedData: {
        skills: alexParsed.skills,
        experienceYears: alexParsed.experienceYears,
        educationLevel: alexParsed.educationLevel,
        degreeName: alexParsed.degreeName,
        contact: alexParsed.contact
      },
      matchAnalysis: alexMatch,
      status: 'Shortlisted',
      recruiterNotes: 'Exceptional candidate. Has direct MERN experience, solid AWS infrastructure background, and meets all required qualifications.',
      uploadedBy: recruiter._id
    });

    // Priya Sharma -> NLP Job
    const priyaParsed = parseResume(DEMO_RESUMES.priyaSharma, 'Priya_Sharma_Lead_NLP.pdf', [
      ...(nlpJob.requiredSkills || []),
      ...(nlpJob.preferredSkills || [])
    ]);
    const priyaMatch = analyzeMatch(nlpJob, priyaParsed, DEMO_RESUMES.priyaSharma);

    await applicantRepo.create({
      jobId: nlpJob._id,
      fullName: 'Priya Sharma',
      email: 'priya.sharma.ai@outlook.com',
      phone: '+1 (555) 724-1189',
      location: 'New York, NY',
      resumeFile: {
        originalName: 'Priya_Sharma_Lead_NLP.pdf',
        filename: 'Priya_Sharma_Lead_NLP-demo.pdf',
        mimeType: 'application/pdf',
        size: 168400,
        path: 'uploads/Priya_Sharma_Lead_NLP-demo.pdf'
      },
      extractedText: DEMO_RESUMES.priyaSharma.trim(),
      extractedData: {
        skills: priyaParsed.skills,
        experienceYears: priyaParsed.experienceYears,
        educationLevel: priyaParsed.educationLevel,
        degreeName: priyaParsed.degreeName,
        contact: priyaParsed.contact
      },
      matchAnalysis: priyaMatch,
      status: 'Shortlisted',
      recruiterNotes: 'Top-tier match. Master degree holder in AI with deep PyTorch, transformer, and vector database expertise.',
      uploadedBy: recruiter._id
    });

    // David Kim -> Frontend Job
    const davidParsed = parseResume(DEMO_RESUMES.davidKim, 'David_Kim_Frontend_Dev.docx', [
      ...(frontendJob.requiredSkills || []),
      ...(frontendJob.preferredSkills || [])
    ]);
    const davidMatch = analyzeMatch(frontendJob, davidParsed, DEMO_RESUMES.davidKim);

    await applicantRepo.create({
      jobId: frontendJob._id,
      fullName: 'David Kim',
      email: 'david.kim.frontend@yahoo.com',
      phone: '(555) 912-4433',
      location: 'Austin, TX',
      resumeFile: {
        originalName: 'David_Kim_Frontend_Dev.docx',
        filename: 'David_Kim_Frontend_Dev-demo.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 98200,
        path: 'uploads/David_Kim_Frontend_Dev-demo.docx'
      },
      extractedText: DEMO_RESUMES.davidKim.trim(),
      extractedData: {
        skills: davidParsed.skills,
        experienceYears: davidParsed.experienceYears,
        educationLevel: davidParsed.educationLevel,
        degreeName: davidParsed.degreeName,
        contact: davidParsed.contact
      },
      matchAnalysis: davidMatch,
      status: 'Reviewed',
      recruiterNotes: 'Promising junior candidate with direct hands-on AngularJS 1.x and Bootstrap skills.',
      uploadedBy: recruiter._id
    });

    console.log('[Seed] Created 3 core demo applicants.');
  }

  // 4. Seed Synthetic Benchmark Sample Dataset (michaelozon/candidate-matching-synthetic)
  const sampleFilePath = path.join(__dirname, '..', 'sample_data', 'synthetic_sample.json');
  if (fs.existsSync(sampleFilePath)) {
    const syntheticData = JSON.parse(fs.readFileSync(sampleFilePath, 'utf8'));
    const matchesMap = {};
    (syntheticData.matches || []).forEach(m => {
      matchesMap[m.job_id] = new Set(m.relevant_resume_ids || []);
    });

    // Check if synthetic jobs already exist
    const currentJobs = await jobRepo.find({});
    let syntheticJobs = currentJobs.filter(j => j.benchmark && j.benchmark.isSynthetic);

    if (syntheticJobs.length === 0) {
      console.log('[Seed] Seeding 5 synthetic benchmark jobs...');
      const createdSyntheticJobs = [];

      for (const j of syntheticData.jobs) {
        const fullDesc = `${j.description} Responsibilities: ${(j.responsibilities || []).join('; ')}. Requirements: ${(j.requirements || []).join('; ')}.`;
        const minExp = j.seniority === 'Senior' ? 5 : (j.seniority === 'Mid' ? 3 : 1);
        const deptMap = {
          'Associate Product Manager': 'Product Strategy',
          'Financial Analyst': 'Finance & Operations',
          'Data Analyst': 'Data Analytics',
          'Software Engineer': 'Engineering',
          'Marketing Manager': 'Growth Marketing'
        };

        const newJob = await jobRepo.create({
          title: `${j.job_title} (${j.industry})`,
          department: deptMap[j.job_title] || `${j.industry} Team`,
          location: 'Remote',
          employmentType: 'Full-time',
          description: fullDesc,
          requiredSkills: j.must_have_skills || [],
          preferredSkills: j.nice_to_have_skills || [],
          minExperience: minExp,
          education: 'Bachelor',
          weights: { skills: 45, similarity: 25, experience: 20, education: 10 },
          status: 'Active',
          createdBy: recruiter._id,
          benchmark: {
            dataset: 'michaelozon/candidate-matching-synthetic',
            syntheticJobId: j.job_id,
            isSynthetic: true,
            relevantResumeIds: Array.from(matchesMap[j.job_id] || [])
          }
        });
        createdSyntheticJobs.push(newJob);
      }
      syntheticJobs = createdSyntheticJobs;
      console.log(`[Seed] Seeded ${syntheticJobs.length} synthetic benchmark jobs.`);
    }

    // Check if synthetic applicants already exist
    const currentApplicants = await applicantRepo.find({});
    const existingSyntheticApplicants = currentApplicants.filter(a => a.benchmark && a.benchmark.syntheticResumeId);

    if (existingSyntheticApplicants.length === 0 && syntheticJobs.length > 0) {
      console.log('[Seed] Seeding 50 synthetic resumes with existing matching engine...');
      const resumes = syntheticData.resumes || [];

      // Build a map of synthetic job_id -> job entity
      const jobBySyntheticId = {};
      syntheticJobs.forEach(j => {
        if (j.benchmark?.syntheticJobId) {
          jobBySyntheticId[j.benchmark.syntheticJobId] = j;
        }
      });

      // Partition resumes: 7 benchmark matches per job (35 total), 3 contrast/unlisted per job (15 total)
      const assignedResumeIds = new Set();
      const jobApplicantAssignments = []; // { job, resume, isBenchmarkMatch }

      // Step 1: Assign ground-truth relevant resumes to their corresponding jobs
      for (const sj of syntheticJobs) {
        const synId = sj.benchmark?.syntheticJobId;
        const relevantSet = matchesMap[synId] || new Set();

        const relevantResumesForJob = resumes.filter(r => 
          relevantSet.has(r.resume_id) && !assignedResumeIds.has(r.resume_id)
        );

        for (const r of relevantResumesForJob) {
          assignedResumeIds.add(r.resume_id);
          jobApplicantAssignments.push({
            job: sj,
            resume: r,
            isBenchmarkMatch: true
          });
        }
      }

      // Step 2: Assign remaining unlisted resumes evenly across the 5 jobs
      const remainingResumes = resumes.filter(r => !assignedResumeIds.has(r.resume_id));
      syntheticJobs.forEach((sj, index) => {
        const slice = remainingResumes.slice(index * 3, (index + 1) * 3);
        for (const r of slice) {
          assignedResumeIds.add(r.resume_id);
          const synId = sj.benchmark?.syntheticJobId;
          const isMatch = matchesMap[synId]?.has(r.resume_id) || false;
          jobApplicantAssignments.push({
            job: sj,
            resume: r,
            isBenchmarkMatch: isMatch
          });
        }
      });

      // Step 3: Parse, match using existing NLP matching engine, and create applicants
      let createdCount = 0;
      for (const item of jobApplicantAssignments) {
        const { job, resume, isBenchmarkMatch } = item;
        const candidateName = getCandidateName(resume.resume_id);
        const candidateEmail = `${candidateName.toLowerCase().replace(/[^a-z]/g, '.')}.${resume.resume_id.toLowerCase()}@synthetic-talent.io`;
        const numId = parseInt(resume.resume_id.replace(/\D/g, ''), 10) || 100;
        const candidatePhone = `(555) ${String(200 + (numId % 800)).padStart(3, '0')}-${String(1000 + (numId % 9000)).padStart(4, '0')}`;
        const fakeFilename = `${candidateName.replace(/\s+/g, '_')}_${resume.resume_id}_Resume.pdf`;

        // 1. Build resume text from role, seniority, experience, industry, education, skills, summary, experience bullets
        const resumeText = buildSyntheticResumeText(resume, candidateName, candidateEmail, candidatePhone);

        // 2. Parse candidate resume using existing NLP service
        const extraSkills = Array.from(new Set([
          ...(job.requiredSkills || []),
          ...(job.preferredSkills || []),
          ...(resume.skills || [])
        ]));
        const parsed = parseResume(resumeText, fakeFilename, extraSkills);

        // 3. Compute match analysis strictly using existing matching engine
        const matchAnalysis = analyzeMatch(job, parsed, resumeText);

        // 4. Determine status based on realistic score bracket
        let appStatus = 'New';
        if (matchAnalysis.overallScore >= 70) {
          appStatus = 'Shortlisted';
        } else if (matchAnalysis.overallScore >= 45) {
          appStatus = 'Reviewed';
        }

        const benchmarkNote = isBenchmarkMatch
          ? `[Benchmark Match] Candidate verified as ground-truth relevant match in dataset benchmark (>=60% must-have skills overlap). Evaluated with local TF-IDF semantic engine.`
          : `[Synthetic Candidate] Evaluated by ResumeIQ semantic engine. Unlisted in benchmark reference set (not a confirmed negative).`;

        await applicantRepo.create({
          jobId: job._id,
          fullName: candidateName,
          email: candidateEmail,
          phone: candidatePhone,
          location: `${resume.industry} Hub, Remote`,
          resumeFile: {
            originalName: fakeFilename,
            filename: `synthetic-${resume.resume_id.toLowerCase()}.pdf`,
            mimeType: 'application/pdf',
            size: 110000 + ((numId * 37) % 50000),
            path: `uploads/synthetic-${resume.resume_id.toLowerCase()}.pdf`
          },
          extractedText: resumeText,
          extractedData: {
            skills: parsed.skills,
            experienceYears: parsed.experienceYears,
            educationLevel: parsed.educationLevel,
            degreeName: parsed.degreeName,
            contact: parsed.contact
          },
          matchAnalysis,
          status: appStatus,
          recruiterNotes: benchmarkNote,
          benchmark: {
            dataset: 'michaelozon/candidate-matching-synthetic',
            syntheticResumeId: resume.resume_id,
            seniority: resume.seniority,
            industry: resume.industry,
            isBenchmarkMatch: isBenchmarkMatch,
            benchmarkRule: '>=60% must-have skills overlap according to synthetic benchmark; unlisted is unconfirmed'
          },
          uploadedBy: recruiter._id
        });

        createdCount++;
      }

      console.log(`[Seed] Successfully seeded ${createdCount} synthetic applicants with existing matching engine.`);
    }
  }

  console.log('[Seed] Seeding completed.');
}

if (require.main === module) {
  seedData()
    .then(() => {
      console.log('[Seed] Standalone seed run finished.');
      process.exit(0);
    })
    .catch(err => {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    });
}

module.exports = { seedData, DEMO_RESUMES, buildSyntheticResumeText };
