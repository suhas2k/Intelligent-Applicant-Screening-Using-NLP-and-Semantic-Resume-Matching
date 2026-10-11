const path = require('path');

// Comprehensive Technical & Domain Skill Taxonomy
const SKILL_TAXONOMY = [
  // Programming Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Golang', 'Rust', 'Ruby',
  'PHP', 'Swift', 'Kotlin', 'Dart', 'Scala', 'R', 'SQL', 'Bash', 'Shell', 'PowerShell', 'Perl',
  
  // Frontend Frameworks & Libraries
  'React', 'React.js', 'ReactJS', 'Angular', 'AngularJS', 'Vue', 'Vue.js', 'VueJS', 'Next.js',
  'Nuxt.js', 'Svelte', 'jQuery', 'Redux', 'MobX', 'HTML', 'HTML5', 'CSS', 'CSS3', 'Sass', 'SCSS',
  'Less', 'Tailwind', 'TailwindCSS', 'Bootstrap', 'Material UI', 'Chakra UI', 'Webpack', 'Vite',
  
  // Backend & Runtime
  'Node.js', 'NodeJS', 'Express', 'Express.js', 'NestJS', 'Koa', 'Fastify', 'Django', 'Flask',
  'FastAPI', 'Spring', 'Spring Boot', 'ASP.NET', '.NET', '.NET Core', 'Ruby on Rails', 'Laravel',
  'Symfony', 'Gin', 'Echo', 'GraphQL', 'REST', 'RESTful API', 'REST API', 'gRPC', 'WebSockets',
  'Microservices', 'Serverless',
  
  // Databases & Storage
  'MongoDB', 'Mongoose', 'PostgreSQL', 'Postgres', 'MySQL', 'MariaDB', 'SQLite', 'Redis',
  'Cassandra', 'DynamoDB', 'Elasticsearch', 'Solr', 'Neo4j', 'CouchDB', 'Firebase', 'Firestore',
  'Prisma', 'TypeORM', 'Sequelize', 'Hibernate', 'Oracle', 'SQL Server',
  
  // Cloud & DevOps
  'AWS', 'Amazon Web Services', 'Azure', 'Microsoft Azure', 'GCP', 'Google Cloud', 'Docker',
  'Kubernetes', 'K8s', 'Helm', 'Terraform', 'Ansible', 'Puppet', 'Chef', 'CI/CD', 'Jenkins',
  'GitHub Actions', 'GitLab CI', 'CircleCI', 'Travis CI', 'Linux', 'Ubuntu', 'Debian', 'CentOS',
  'Nginx', 'Apache', 'Cloudflare', 'Prometheus', 'Grafana', 'ELK Stack', 'Datadog',
  
  // Data Science, AI, NLP & Machine Learning
  'Machine Learning', 'Deep Learning', 'NLP', 'Natural Language Processing', 'Computer Vision',
  'Artificial Intelligence', 'LLM', 'Large Language Models', 'Generative AI', 'TensorFlow',
  'PyTorch', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy', 'SciPy', 'Matplotlib', 'Seaborn',
  'Hadoop', 'Spark', 'Apache Spark', 'Kafka', 'Apache Kafka', 'Airflow', 'Databricks',
  'BigQuery', 'Snowflake', 'Tableau', 'Power BI', 'LangChain', 'Hugging Face', 'Transformers',
  'BERT', 'OpenAI', 'Vector Database', 'Pinecone', 'ChromaDB', 'FAISS',
  
  // Testing & Quality Assurance
  'Jest', 'Mocha', 'Chai', 'Jasmine', 'Cypress', 'Selenium', 'Playwright', 'Puppeteer',
  'JUnit', 'PyTest', 'TestNG', 'Postman', 'Swagger', 'OpenAPI', 'TDD', 'BDD',
  
  // Version Control & Project Management
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN', 'Jira', 'Confluence', 'Trello', 'Asana',
  'Agile', 'Scrum', 'Kanban', 'Sprint Planning',
  
  // Architecture & Concepts
  'System Design', 'Software Architecture', 'OOP', 'Object Oriented Programming',
  'Design Patterns', 'Data Structures', 'Algorithms', 'Clean Architecture', 'Event Driven Architecture'
];

// Degree Hierarchy and Regex Mapping
const DEGREE_LEVELS = [
  {
    level: 'PhD',
    score: 5,
    regex: /\b(ph\.?d|doctorate|doctor of philosophy|dr\b)/i
  },
  {
    level: 'Master',
    score: 4,
    regex: /\b(master'?s?|m\.?s|m\.?tech|m\.?sc|mca|mba|m\.?eng|m\.?phil|master of science|master of business administration|master of technology)\b/i
  },
  {
    level: 'Bachelor',
    score: 3,
    regex: /\b(bachelor'?s?|b\.?s|b\.?tech|b\.?e|bca|b\.?sc|bba|b\.?eng|bachelor of science|bachelor of engineering|bachelor of technology|bachelor of arts)\b/i
  },
  {
    level: 'Associate',
    score: 2,
    regex: /\b(associate'?s?|diploma|associate of science|associate of arts)\b/i
  },
  {
    level: 'High School',
    score: 1,
    regex: /\b(high school|secondary school|ged|matriculation)\b/i
  }
];

/**
 * Extract contact information from resume text
 */
function extractContact(text) {
  const emails = [];
  const phones = [];
  const links = [];

  // Email regex
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  let emailMatch;
  while ((emailMatch = emailRegex.exec(text)) !== null) {
    const email = emailMatch[1].toLowerCase();
    if (!emails.includes(email)) emails.push(email);
  }

  // Phone regex (support US, international, and standard formats)
  const phoneRegex = /(?:(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{10,13})/g;
  let phoneMatch;
  while ((phoneMatch = phoneRegex.exec(text)) !== null) {
    const rawPhone = phoneMatch[0].trim();
    if (rawPhone.length >= 10 && !phones.includes(rawPhone)) {
      phones.push(rawPhone);
    }
  }

  // Links regex (LinkedIn, GitHub, Portfolio)
  const linkRegex = /(https?:\/\/[^\s]+|linkedin\.com\/in\/[^\s]+|github\.com\/[^\s]+)/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(text)) !== null) {
    const link = linkMatch[1];
    if (!links.includes(link)) links.push(link);
  }

  return {
    emails,
    primaryEmail: emails[0] || '',
    phones,
    primaryPhone: phones[0] || '',
    links
  };
}

/**
 * Extract candidate name using header heuristic and fallback to filename
 */
function extractCandidateName(text, filename) {
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // Common title words to ignore in name detection
  const ignorePatterns = [
    /resume/i, /curriculum\s+vitae/i, /cv\b/i, /profile/i, /summary/i,
    /contact/i, /experience/i, /education/i, /skills/i, /projects/i,
    /@/, /https?:/, /phone/i, /email/i, /\d{5}/
  ];

  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const line = lines[i];
    const words = line.split(/\s+/);
    
    // Check if line looks like a valid person name (2 to 4 words, reasonable length, alphabetic)
    const isIgnore = ignorePatterns.some(p => p.test(line));
    if (!isIgnore && words.length >= 2 && words.length <= 4 && line.length < 40) {
      if (/^[a-zA-Z\s.'-]+$/.test(line)) {
        return line;
      }
    }
  }

  // Fallback: clean filename
  if (filename) {
    const ext = path.extname(filename);
    let base = path.basename(filename, ext);
    // Remove timestamps or random hashes (e.g., "-1729000-12345")
    base = base.replace(/-\d+-\d+$/g, '');
    base = base.replace(/[_-]+/g, ' ').trim();
    base = base.replace(/\b(resume|cv|profile)\b/gi, '').trim();
    if (base.length > 2) {
      return base.replace(/\b\w/g, c => c.toUpperCase());
    }
  }

  return 'Candidate';
}

/**
 * Extract highest education level and degree details
 */
function extractEducation(text) {
  let highest = {
    level: 'Not specified',
    score: 0,
    degreeName: ''
  };

  for (const item of DEGREE_LEVELS) {
    const match = text.match(item.regex);
    if (match) {
      highest = {
        level: item.level,
        score: item.score,
        degreeName: match[0]
      };
      break; // Since DEGREE_LEVELS is ordered descending by score
    }
  }

  // Extract surrounding degree sentence/phrase for better clarity if found
  const eduSectionMatch = text.match(/(?:education|academic background|qualifications)[\s\S]{0,400}/i);
  if (eduSectionMatch) {
    const sectionText = eduSectionMatch[0];
    const degreeLineMatch = sectionText.match(/(?:Bachelor|Master|Doctor|B\.?S|M\.?S|Ph\.?D|Associate)[^\n,.]+/i);
    if (degreeLineMatch) {
      highest.degreeName = degreeLineMatch[0].trim();
    }
  }

  return highest;
}

/**
 * Extract estimated professional experience in years
 */
function extractExperience(text) {
  let estimatedYears = 0;

  // 1. Explicit statements: "X+ years of experience"
  const explicitRegex = /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:experience|exp|working|industry\s+experience)/gi;
  let match;
  while ((match = explicitRegex.exec(text)) !== null) {
    const yrs = parseFloat(match[1]);
    if (yrs > estimatedYears && yrs <= 40) {
      estimatedYears = yrs;
    }
  }

  // 2. Timeline date ranges: e.g. "2018 - 2023", "2019 to Present", "Jan 2017 – Dec 2021"
  const currentYear = new Date().getFullYear();
  const dateRangeRegex = /\b(20\d{2}|19\d{2})\s*(?:-|–|—|to)\s*(20\d{2}|present|current)\b/gi;
  let rangeMatch;
  let totalSpan = 0;
  const intervals = [];

  while ((rangeMatch = dateRangeRegex.exec(text)) !== null) {
    const startYr = parseInt(rangeMatch[1], 10);
    const endStr = rangeMatch[2].toLowerCase();
    const endYr = (endStr === 'present' || endStr === 'current') ? currentYear : parseInt(endStr, 10);

    if (startYr <= endYr && startYr >= 1980 && endYr <= currentYear + 1) {
      intervals.push({ start: startYr, end: endYr });
    }
  }

  if (intervals.length > 0) {
    // Sort intervals by start year
    intervals.sort((a, b) => a.start - b.start);
    
    // Merge overlapping intervals to calculate realistic experience span
    let merged = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
      const current = intervals[i];
      const last = merged[merged.length - 1];
      if (current.start <= last.end) {
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push(current);
      }
    }

    const calculatedSpan = merged.reduce((acc, curr) => acc + (curr.end - curr.start), 0);
    if (calculatedSpan > estimatedYears) {
      estimatedYears = calculatedSpan;
    }
  }

  return Math.min(Math.round(estimatedYears * 10) / 10, 40);
}

/**
 * Extract matched skills from text based on taxonomy and extra custom skills
 */
function extractSkills(text, extraSkills = []) {
  const allSkills = Array.from(new Set([...SKILL_TAXONOMY, ...extraSkills]));
  const detectedSkills = [];
  const textLower = text.toLowerCase();

  for (const skill of allSkills) {
    if (!skill || skill.trim().length === 0) continue;

    const trimmed = skill.trim();
    // Escape special regex characters in skill (e.g. C++, .NET, C#)
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Word boundary or symbol delimiter regex
    let skillPattern;
    if (/^[a-zA-Z0-9]+$/.test(trimmed)) {
      skillPattern = new RegExp(`\\b${escaped}\\b`, 'i');
    } else {
      // Handles C++, C#, .NET, Node.js, Next.js, etc.
      skillPattern = new RegExp(`(?:^|[\\s,;()/\\[\\]:])${escaped}(?:$|[\\s,;()/\\[\\]:])`, 'i');
    }

    if (skillPattern.test(text)) {
      if (!detectedSkills.includes(trimmed)) {
        detectedSkills.push(trimmed);
      }
    }
  }

  return detectedSkills;
}

/**
 * High-level parser that processes raw resume text and filename
 */
function parseResume(rawText, filename = '', extraSkills = []) {
  const contact = extractContact(rawText);
  const fullName = extractCandidateName(rawText, filename);
  const education = extractEducation(rawText);
  const experienceYears = extractExperience(rawText);
  const skills = extractSkills(rawText, extraSkills);

  return {
    fullName,
    email: contact.primaryEmail,
    phone: contact.primaryPhone,
    contact,
    educationLevel: education.level,
    degreeName: education.degreeName,
    educationScore: education.score,
    experienceYears,
    skills,
    wordCount: rawText.split(/\s+/).filter(Boolean).length
  };
}

module.exports = {
  SKILL_TAXONOMY,
  DEGREE_LEVELS,
  parseResume,
  extractContact,
  extractCandidateName,
  extractEducation,
  extractExperience,
  extractSkills
};
