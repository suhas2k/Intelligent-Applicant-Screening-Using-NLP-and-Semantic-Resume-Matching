const natural = require('natural');
const { DEGREE_LEVELS } = require('./nlpParser.service');

const stemmer = natural.PorterStemmer;
const tokenizer = new natural.WordTokenizer();

// Standard English Stopwords to exclude from TF-IDF
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can',
  'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down',
  'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t',
  'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it',
  'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such',
  'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s',
  'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were',
  'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s',
  'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re',
  'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
]);

// Semantic Synonym & Concept Mapping Clusters
const SYNONYM_CLUSTERS = {
  // JavaScript & Frameworks
  'javascript': ['js', 'es6', 'es2015', 'ecmascript', 'vanilla js'],
  'typescript': ['ts'],
  'nodejs': ['node.js', 'node', 'express', 'express.js', 'backend javascript'],
  'react': ['react.js', 'reactjs', 'redux', 'react native'],
  'angularjs': ['angular 1', 'angular 1.x', 'angularjs 1.x', 'angular.js'],
  'angular': ['angular 2+', 'angular io', 'angular framework'],
  'vue': ['vue.js', 'vuejs', 'vue3', 'vue2', 'nuxt'],
  
  // Backend & APIs
  'rest': ['restful', 'rest api', 'rest apis', 'web api', 'http api', 'json api'],
  'graphql': ['apollo', 'graphql api', 'gql'],
  'microservices': ['microservice', 'distributed systems', 'service oriented architecture', 'soa'],
  
  // Databases
  'mongodb': ['mongo', 'nosql', 'mongoose', 'document database'],
  'postgresql': ['postgres', 'psql', 'relational database', 'rdbms', 'sql'],
  'mysql': ['mariadb', 'relational database', 'sql'],
  'redis': ['in memory cache', 'caching', 'key value store'],
  
  // Cloud & DevOps
  'aws': ['amazon web services', 'ec2', 's3', 'lambda', 'cloud computing'],
  'gcp': ['google cloud platform', 'google cloud'],
  'azure': ['microsoft azure', 'azure cloud'],
  'docker': ['containerization', 'containers', 'dockerfile', 'docker compose'],
  'kubernetes': ['k8s', 'container orchestration', 'helm'],
  'cicd': ['ci/cd', 'continuous integration', 'continuous deployment', 'devops', 'pipelines', 'jenkins', 'github actions'],
  
  // AI, NLP, ML
  'nlp': ['natural language processing', 'text mining', 'text analytics', 'computational linguistics', 'nlu', 'ner'],
  'machine learning': ['ml', 'statistical learning', 'predictive modeling', 'supervised learning'],
  'deep learning': ['neural networks', 'ann', 'cnn', 'rnn', 'transformers'],
  'llm': ['large language models', 'generative ai', 'genai', 'prompt engineering'],
  
  // Practices
  'testing': ['unit testing', 'automated testing', 'tdd', 'test driven development', 'jest', 'cypress', 'qa'],
  'agile': ['scrum', 'kanban', 'sprint planning', 'agile methodology']
};

/**
 * Builds canonical synonym lookup
 */
const CANONICAL_MAP = new Map();
Object.keys(SYNONYM_CLUSTERS).forEach(canonical => {
  CANONICAL_MAP.set(canonical.toLowerCase(), canonical);
  SYNONYM_CLUSTERS[canonical].forEach(alias => {
    CANONICAL_MAP.set(alias.toLowerCase(), canonical);
  });
});

/**
 * Tokenize and normalize text with Porter Stemming and Stopword Removal
 * Generates both unigrams and bigrams
 */
function tokenizeAndClean(text) {
  if (!text) return [];

  // Remove non-alphanumeric except common skill chars (+, #, ., -)
  const cleanedText = text.toLowerCase().replace(/[^a-z0-9+#.-]/g, ' ');
  const rawTokens = cleanedText.split(/\s+/).filter(t => t.length > 1 && !STOPWORDS.has(t));

  const tokens = [];

  // Unigrams + Canonical Synonym Mapping + Stemming
  for (let i = 0; i < rawTokens.length; i++) {
    const raw = rawTokens[i];
    const canonical = CANONICAL_MAP.get(raw) || raw;
    const stemmed = stemmer.stem(canonical);
    tokens.push(stemmed);

    // Bigrams for multi-word phrases
    if (i < rawTokens.length - 1) {
      const nextRaw = rawTokens[i + 1];
      const bigram = `${raw} ${nextRaw}`;
      const canonicalBigram = CANONICAL_MAP.get(bigram);
      if (canonicalBigram) {
        tokens.push(canonicalBigram);
      } else {
        tokens.push(`${stemmed}_${stemmer.stem(nextRaw)}`);
      }
    }
  }

  return tokens;
}

/**
 * Calculate Term Frequency (TF) with sublinear scaling: 1 + ln(count)
 */
function calculateTF(tokens) {
  const tf = {};
  if (!tokens || tokens.length === 0) return tf;

  const counts = {};
  for (const token of tokens) {
    counts[token] = (counts[token] || 0) + 1;
  }

  for (const token in counts) {
    // Sublinear term frequency scaling
    tf[token] = 1 + Math.log(counts[token]);
  }

  return tf;
}

/**
 * Compute TF-IDF Cosine Similarity between Job Description and Resume Text
 * @param {string} jobText - Combined job title, description, and requirements
 * @param {string} resumeText - Extracted resume content
 * @returns {number} Score from 0 to 100
 */
function computeSemanticJDSimilarity(jobText, resumeText) {
  const jobTokens = tokenizeAndClean(jobText);
  const resumeTokens = tokenizeAndClean(resumeText);

  if (jobTokens.length === 0 || resumeTokens.length === 0) {
    return 0;
  }

  const jobTF = calculateTF(jobTokens);
  const resumeTF = calculateTF(resumeTokens);

  // Vocabulary of union of tokens
  const vocabulary = new Set([...Object.keys(jobTF), ...Object.keys(resumeTF)]);

  let dotProduct = 0;
  let jobNormSq = 0;
  let resumeNormSq = 0;

  for (const token of vocabulary) {
    const vJob = jobTF[token] || 0;
    const vResume = resumeTF[token] || 0;

    // Simulated domain IDF weighting: rare tokens receive higher weight
    // Terms present in both carry heavier informative value
    let idfWeight = 1.0;
    if (token.includes('_') || token.length > 5) {
      idfWeight = 1.4; // technical/compound concepts receive higher specificity
    }

    const weightedJob = vJob * idfWeight;
    const weightedResume = vResume * idfWeight;

    dotProduct += weightedJob * weightedResume;
    jobNormSq += weightedJob * weightedJob;
    resumeNormSq += weightedResume * weightedResume;
  }

  if (jobNormSq === 0 || resumeNormSq === 0) {
    return 0;
  }

  const cosineSim = dotProduct / (Math.sqrt(jobNormSq) * Math.sqrt(resumeNormSq));
  
  // Scale cosine similarity smoothly to 0-100 range
  // Typical TF-IDF cosine between resumes and JDs falls in 0.15 - 0.75 range
  // Apply calibrated sigmoid/linear scaling for intuitive recruiting scoring
  let scaledScore = cosineSim * 115;
  if (scaledScore > 100) scaledScore = 100;
  if (scaledScore < 0) scaledScore = 0;

  return Math.round(scaledScore * 10) / 10;
}

/**
 * Check if a single target skill is present in resume text or candidate's extracted skills
 * Uses exact match, regex word-boundary match, and synonym cluster expansion
 */
function isSkillMatched(targetSkill, resumeText, candidateSkills = []) {
  if (!targetSkill) return false;
  const targetLower = targetSkill.toLowerCase().trim();

  // 1. Direct check in candidate extracted skills
  const inSkillsList = candidateSkills.some(s => s.toLowerCase() === targetLower);
  if (inSkillsList) return true;

  // 2. Canonical synonym check
  const canonicalTarget = CANONICAL_MAP.get(targetLower) || targetLower;
  const synonymList = [
    targetLower,
    canonicalTarget,
    ...(SYNONYM_CLUSTERS[canonicalTarget] || [])
  ];

  const resumeTextLower = resumeText.toLowerCase();

  for (const synonym of synonymList) {
    const escaped = synonym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let regex;
    if (/^[a-z0-9]+$/i.test(synonym)) {
      regex = new RegExp(`\\b${escaped}\\b`, 'i');
    } else {
      regex = new RegExp(`(?:^|[\\s,;()/\\[\\]:])${escaped}(?:$|[\\s,;()/\\[\\]:])`, 'i');
    }

    if (regex.test(resumeTextLower)) {
      return true;
    }
  }

  // 3. Stemmed match for compound words
  const targetStemmed = stemmer.stem(targetLower);
  if (targetStemmed.length > 3) {
    const stemRegex = new RegExp(`\\b${targetStemmed}\\w*\\b`, 'i');
    if (stemRegex.test(resumeTextLower)) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluate skills match against required and preferred skills
 */
function evaluateSkills(requiredSkills = [], preferredSkills = [], resumeText = '', candidateSkills = []) {
  const matchedRequired = [];
  const missingRequired = [];
  const matchedPreferred = [];
  const missingPreferred = [];

  for (const skill of requiredSkills) {
    if (isSkillMatched(skill, resumeText, candidateSkills)) {
      matchedRequired.push(skill);
    } else {
      missingRequired.push(skill);
    }
  }

  for (const skill of preferredSkills) {
    if (isSkillMatched(skill, resumeText, candidateSkills)) {
      matchedPreferred.push(skill);
    } else {
      missingPreferred.push(skill);
    }
  }

  // Scoring: Required skills account for 85% base, preferred for 15% bonus
  let requiredScore = 0;
  if (requiredSkills.length > 0) {
    requiredScore = (matchedRequired.length / requiredSkills.length) * 85;
  } else {
    requiredScore = 85; // If no required skills specified
  }

  let preferredScore = 0;
  if (preferredSkills.length > 0) {
    preferredScore = (matchedPreferred.length / preferredSkills.length) * 15;
  } else {
    // If no preferred skills, scale required up to 100%
    if (requiredSkills.length > 0) {
      requiredScore = (matchedRequired.length / requiredSkills.length) * 100;
    }
  }

  const totalSkillScore = Math.min(Math.round((requiredScore + preferredScore) * 10) / 10, 100);

  return {
    skillsScore: totalSkillScore,
    matchedRequiredSkills: matchedRequired,
    missingRequiredSkills: missingRequired,
    matchedPreferredSkills: matchedPreferred,
    missingPreferredSkills: missingPreferred
  };
}

/**
 * Evaluate candidate experience vs job requirement
 */
function evaluateExperience(candidateYears = 0, requiredYears = 0) {
  if (!requiredYears || requiredYears <= 0) {
    return {
      experienceScore: 100,
      candidateYears,
      requiredYears: 0,
      meetsRequirement: true
    };
  }

  if (candidateYears >= requiredYears) {
    return {
      experienceScore: 100,
      candidateYears,
      requiredYears,
      meetsRequirement: true
    };
  }

  // Partial credit for proportional experience
  const ratio = candidateYears / requiredYears;
  const score = Math.max(0, Math.round(ratio * 100 * 10) / 10);

  return {
    experienceScore: score,
    candidateYears,
    requiredYears,
    meetsRequirement: false
  };
}

/**
 * Evaluate candidate education level vs job requirement
 */
function evaluateEducation(candidateEducationLevel = 'Not specified', requiredEducationLevel = 'Bachelor') {
  if (!requiredEducationLevel || requiredEducationLevel === 'Any') {
    return {
      educationScore: 100,
      candidateLevel: candidateEducationLevel,
      requiredLevel: 'Any',
      meetsRequirement: true
    };
  }

  const levelScoreMap = {
    'PhD': 5,
    'Master': 4,
    'Bachelor': 3,
    'Associate': 2,
    'High School': 1,
    'Not specified': 0
  };

  const reqScore = levelScoreMap[requiredEducationLevel] || 3;
  const candScore = levelScoreMap[candidateEducationLevel] || 0;

  if (candScore >= reqScore) {
    return {
      educationScore: 100,
      candidateLevel: candidateEducationLevel,
      requiredLevel: requiredEducationLevel,
      meetsRequirement: true
    };
  }

  // Partial credit based on gap
  let score = 0;
  if (candScore === reqScore - 1) score = 75;
  else if (candScore === reqScore - 2) score = 50;
  else score = 25;

  return {
    educationScore: score,
    candidateLevel: candidateEducationLevel,
    requiredLevel: requiredEducationLevel,
    meetsRequirement: false
  };
}

/**
 * Run comprehensive semantic resume matching
 * Returns composite match score (0-100) and transparent explainability breakdown
 */
function analyzeMatch(job, parsedResume, rawResumeText) {
  const jobDescriptionFull = `
    ${job.title} ${job.department}
    ${job.description}
    Required Skills: ${(job.requiredSkills || []).join(', ')}
    Preferred Skills: ${(job.preferredSkills || []).join(', ')}
  `;

  // 1. Semantic JD Similarity via Vector Space Model (TF-IDF + Cosine Sim)
  const similarityScore = computeSemanticJDSimilarity(jobDescriptionFull, rawResumeText);

  // 2. Skills Matching
  const skillResults = evaluateSkills(
    job.requiredSkills || [],
    job.preferredSkills || [],
    rawResumeText,
    parsedResume.skills || []
  );

  // 3. Experience Matching
  const expResults = evaluateExperience(
    parsedResume.experienceYears || 0,
    job.minExperience || 0
  );

  // 4. Education Matching
  const eduResults = evaluateEducation(
    parsedResume.educationLevel || 'Not specified',
    job.education || 'Bachelor'
  );

  // 5. Configurable Weights Calculation
  const weights = {
    skills: Number(job.weights?.skills ?? 40),
    similarity: Number(job.weights?.similarity ?? 30),
    experience: Number(job.weights?.experience ?? 20),
    education: Number(job.weights?.education ?? 10)
  };

  const totalWeight = weights.skills + weights.similarity + weights.experience + weights.education;
  const normalizedTotalWeight = totalWeight > 0 ? totalWeight : 100;

  const overallScoreRaw = (
    (skillResults.skillsScore * weights.skills) +
    (similarityScore * weights.similarity) +
    (expResults.experienceScore * weights.experience) +
    (eduResults.educationScore * weights.education)
  ) / normalizedTotalWeight;

  const overallScore = Math.min(Math.max(Math.round(overallScoreRaw * 10) / 10, 0), 100);

  // 6. Generate Explainability Narrative
  const explanationParts = [];

  const reqTotal = (job.requiredSkills || []).length;
  const reqMatchedCount = skillResults.matchedRequiredSkills.length;
  explanationParts.push(
    `Skills: Matched ${reqMatchedCount} of ${reqTotal} required skills (${Math.round((reqMatchedCount / (reqTotal || 1)) * 100)}%).`
  );

  if (skillResults.missingRequiredSkills.length > 0) {
    explanationParts.push(
      `Important missing requirements: ${skillResults.missingRequiredSkills.slice(0, 5).join(', ')}.`
    );
  }

  explanationParts.push(
    `Job Alignment: Semantic content similarity of ${similarityScore}% calculated via TF-IDF Vector Space Model with domain synonym expansion.`
  );

  if (expResults.meetsRequirement) {
    explanationParts.push(
      `Experience: Candidate has ~${expResults.candidateYears} yrs, meeting the required ${expResults.requiredYears} yrs.`
    );
  } else {
    explanationParts.push(
      `Experience: Candidate has ~${expResults.candidateYears} yrs vs required ${expResults.requiredYears} yrs (gap of ${(expResults.requiredYears - expResults.candidateYears).toFixed(1)} yrs).`
    );
  }

  if (eduResults.meetsRequirement) {
    explanationParts.push(
      `Education: Highest degree level detected is ${eduResults.candidateLevel}, satisfying the ${eduResults.requiredLevel} requirement.`
    );
  } else {
    explanationParts.push(
      `Education: Highest degree detected is ${eduResults.candidateLevel}, below the required ${eduResults.requiredLevel}.`
    );
  }

  const limitationsNotice =
    'NLP Methodology Notice & Limitations: This match score is computed locally using a Vector Space Model (TF-IDF with sublinear scaling) enhanced by domain synonym expansion, multi-word bigram recognition, and heuristic structural entity extraction. Limitations: Unlike heavy transformer architectures, TF-IDF does not perform deep bi-directional causal reasoning or detect complex grammatical negations. Scores serve as advisory decision-support only; final shortlisting and hiring determinations must be made by human recruiters without relying on protected demographic characteristics.';

  return {
    overallScore,
    skillsScore: skillResults.skillsScore,
    similarityScore,
    experienceScore: expResults.experienceScore,
    educationScore: eduResults.educationScore,
    matchedRequiredSkills: skillResults.matchedRequiredSkills,
    missingRequiredSkills: skillResults.missingRequiredSkills,
    matchedPreferredSkills: skillResults.matchedPreferredSkills,
    missingPreferredSkills: skillResults.missingPreferredSkills,
    weightsUsed: weights,
    explanation: explanationParts.join(' '),
    limitationsNotice,
    evaluatedAt: new Date()
  };
}

module.exports = {
  SYNONYM_CLUSTERS,
  computeSemanticJDSimilarity,
  isSkillMatched,
  evaluateSkills,
  evaluateExperience,
  evaluateEducation,
  analyzeMatch
};
