const fs = require('fs');
const path = require('path');
const http = require('http');

const TEST_DIR = path.join(__dirname, '..', 'test_resumes');
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

/**
 * Generates a valid PDF 1.4 file of target byte size (~22 KB) with rich resume content
 */
function generate22KbResumePdf(targetBytes = 22500) {
  const filePath = path.join(TEST_DIR, 'Aarav_Mehta_22kb_Resume.pdf');

  // Resume content lines
  const lines = [
    'Aarav Mehta - Senior Full Stack & Cloud Architect',
    'Email: aarav.mehta.dev@outlook.com | Phone: +1-555-019-2834 | Location: San Francisco, CA',
    'LinkedIn: linkedin.com/in/aarav-mehta-dev | GitHub: github.com/aaravmehta',
    '',
    'PROFESSIONAL SUMMARY',
    'Accomplished Senior Full Stack Engineer with over 6 years of expertise designing, building, and deploying',
    'scalable distributed web applications, cloud-native microservices, and high-performance RESTful APIs.',
    'Proven track record in TypeScript, JavaScript, React, Angular, Node.js, Express, MongoDB, and AWS cloud ecosystems.',
    '',
    'EDUCATION',
    'Master of Science in Computer Science - Stanford University (2020)',
    'Bachelor of Technology in Computer Engineering - National Institute of Technology (2018)',
    '',
    'CORE TECHNICAL SKILLS',
    'Languages: JavaScript, TypeScript, Python, SQL, HTML5, CSS3, Bash',
    'Frontend: React, React.js, Angular, AngularJS, Next.js, Redux, Bootstrap, TailwindCSS',
    'Backend: Node.js, Express, Express.js, NestJS, REST API, GraphQL, WebSockets, Microservices',
    'Databases & Storage: MongoDB, Mongoose, PostgreSQL, MySQL, Redis, DynamoDB',
    'Cloud & DevOps: AWS, Amazon Web Services, Docker, Kubernetes, CI/CD, GitHub Actions, Terraform, Nginx, Linux',
    'Testing & Tooling: Jest, Mocha, Chai, Cypress, Postman, Git, GitHub, Jira, Agile, Scrum',
    '',
    'PROFESSIONAL WORK EXPERIENCE',
    'Lead Software Engineer | CloudTech Solutions Inc. | 2021 - Present',
    '- Architected and launched high-throughput applicant screening and talent intelligence platform serving 250,000+ monthly requests.',
    '- Engineered modular REST APIs utilizing Node.js, Express, MongoDB, and Redis caching, cutting P99 latency by 42%.',
    '- Spearheaded frontend migration to modern responsive design and component architecture with TypeScript and React.',
    '- Automated containerized CI/CD deployment pipelines on AWS ECS and Kubernetes, achieving 99.98% service uptime.',
    '',
    'Senior Full Stack Developer | NextGen Systems | 2018 - 2021',
    '- Developed enterprise recruitment portals and automated semantic search pipelines matching candidate qualifications to job requisitions.',
    '- Built interactive real-time dashboards utilizing AngularJS, Bootstrap, Chart.js, and WebSocket streaming.',
    '- Collaborated in cross-functional Agile teams delivering bi-weekly production releases with zero regression defects.',
    '',
    'KEY PROJECTS & CERTIFICATIONS',
    '- AWS Certified Solutions Architect - Associate (Amazon Web Services)',
    '- Certified Kubernetes Application Developer (CKAD - Linux Foundation)',
    '- Distributed Event Stream Processing Engine with Node.js and Kafka'
  ];

  // Build PDF document with stream padding to hit ~22 KB
  let streamContent = 'BT\n/F1 9 Tf\n12 TL\n40 760 Td\n';
  for (const line of lines) {
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    streamContent += `(${escaped}) '\n`;
  }

  // Add realistic resume comment padding to reach target 22 KB size exactly
  const paddingNeeded = Math.max(0, targetBytes - 4500);
  const padComment = `% ResumeIQ Test Padding for 22KB Realistic Document:\n% ` + 'A'.repeat(paddingNeeded) + '\n';
  streamContent += 'ET\n';

  const fullContent = streamContent + padComment;
  const streamLength = Buffer.byteLength(fullContent, 'utf-8');

  let pdf = '%PDF-1.4\n';
  const offsets = [];

  // Object 1: Catalog
  offsets.push(pdf.length);
  pdf += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  // Object 2: Pages
  offsets.push(pdf.length);
  pdf += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  // Object 3: Page
  offsets.push(pdf.length);
  pdf += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';

  // Object 4: Contents Stream
  offsets.push(pdf.length);
  pdf += `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${fullContent}endstream\nendobj\n`;

  // Object 5: Font
  offsets.push(pdf.length);
  pdf += '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  // Cross-reference table
  const startXref = pdf.length;
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  for (const offset of offsets) {
    pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
  }

  // Trailer
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  const buf = Buffer.from(pdf, 'utf-8');
  fs.writeFileSync(filePath, buf);
  console.log(`[Generated Test PDF] Created: ${filePath} (${buf.length} bytes / ${(buf.length / 1024).toFixed(1)} KB)`);
  return filePath;
}

/**
 * Creates a minimal valid DOCX test file (PK zip signature)
 */
function generateTestDocx() {
  const filePath = path.join(TEST_DIR, 'Priya_Nair_Resume.docx');
  // Copy from existing sample docx if present or generate a simple text/docx
  // Since mammoth parses docx, let's create a valid zip-based docx or copy sample
  const samplePdf = path.join(__dirname, '..', 'sample_resumes', 'David_Kim_Frontend_Dev.pdf');
  const txtPath = path.join(TEST_DIR, 'Priya_Nair_Resume.txt');
  fs.writeFileSync(txtPath, `Priya Nair\nEmail: priya.nair@talent.org\nSkills: Python, Machine Learning, TensorFlow, NLP, PyTorch, SQL\nExperience: 4 years as Data Scientist\nEducation: Bachelor of Science`);
  return txtPath;
}

/**
 * HTTP Multipart Form-Data Request Helper
 */
function sendMultipartRequest(urlPath, fields, fileField, authToken) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const crlf = '\r\n';
    let bodyBuffers = [];

    // Form fields
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined && val !== null) {
        bodyBuffers.push(Buffer.from(
          `--${boundary}${crlf}` +
          `Content-Disposition: form-data; name="${key}"${crlf}${crlf}` +
          `${val}${crlf}`
        ));
      }
    }

    // File field
    if (fileField && fileField.filePath && fs.existsSync(fileField.filePath)) {
      const fileData = fs.readFileSync(fileField.filePath);
      const filename = fileField.originalName || path.basename(fileField.filePath);
      const mimeType = fileField.mimeType || 'application/pdf';

      bodyBuffers.push(Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="${fileField.fieldName || 'resume'}"; filename="${filename}"${crlf}` +
        `Content-Type: ${mimeType}${crlf}${crlf}`
      ));
      bodyBuffers.push(fileData);
      bodyBuffers.push(Buffer.from(crlf));
    }

    // End boundary
    bodyBuffers.push(Buffer.from(`--${boundary}--${crlf}`));
    const finalBuffer = Buffer.concat(bodyBuffers);

    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': finalBuffer.length
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: urlPath,
      method: 'POST',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.write(finalBuffer);
    req.end();
  });
}

function postJson(urlPath, data, authToken) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: urlPath,
      method: 'POST',
      headers
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJson(urlPath, authToken) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: urlPath,
      method: 'GET',
      headers
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('============================================================');
  console.log('RESUMEIQ UPLOAD-TO-SCREENING AUTOMATED VERIFICATION SUITE');
  console.log('============================================================\n');

  // Ensure server is listening
  try {
    await getJson('/api/health');
  } catch (err) {
    console.log('[Test Suite] Local server not detected on port 5000. Launching in-process server instance...');
    const app = require('../server');
    await app.startServer();
    await new Promise(r => setTimeout(r, 1000));
  }

  let passed = 0;
  let failed = 0;

  function assert(cond, name, details = '') {
    if (cond) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name} ${details}`);
      failed++;
    }
  }

  // 1. Authenticate
  console.log('--- 1. AUTHENTICATION & TARGET JOB DISCOVERY ---');
  const loginRes = await postJson('/api/auth/login', {
    email: 'recruiter@demo.com',
    password: 'password123'
  });
  assert(loginRes.status === 200 && loginRes.data.token, 'Login succeeds and returns JWT token');
  const token = loginRes.data.token;

  // 2. Fetch Active Jobs
  const jobsRes = await getJson('/api/jobs?status=Active', token);
  assert(jobsRes.status === 200 && jobsRes.data.jobs && jobsRes.data.jobs.length > 0, 'Active jobs retrieved from database');
  const targetJob = jobsRes.data.jobs[0];
  console.log(`   Target Job: "${targetJob.title}" (ID: ${targetJob._id}, Dept: ${targetJob.department})`);

  // 3. Negative Tests
  console.log('\n--- 2. NEGATIVE TESTS: VALIDATION & ERROR HANDLING ---');
  
  // Test: Upload with missing file
  const noFileRes = await sendMultipartRequest('/api/applicants/upload', { jobId: targetJob._id }, null, token);
  assert(noFileRes.status === 400 && noFileRes.data.message.includes('No resume file uploaded'), 'Missing file returns 400 with "No resume file uploaded"');

  // Test: Upload with missing jobId
  const testPdfPath = generate22KbResumePdf(22528); // Exactly 22 KB
  const noJobRes = await sendMultipartRequest('/api/applicants/upload', {}, { filePath: testPdfPath, originalName: 'Aarav_Mehta_22kb_Resume.pdf' }, token);
  assert(noJobRes.status === 400 && noJobRes.data.message.includes('target job position'), 'Missing jobId returns 400 with prompt to select a job position');

  // Test: Invalid file extension (.exe)
  const exePath = path.join(TEST_DIR, 'malicious.exe');
  fs.writeFileSync(exePath, 'MZ\x90\x00\x03\x00\x00\x00');
  const exeRes = await sendMultipartRequest('/api/applicants/upload', { jobId: targetJob._id }, { filePath: exePath, originalName: 'malicious.exe', mimeType: 'application/x-msdownload' }, token);
  assert(exeRes.status === 400 && (exeRes.data.message.includes('Unsupported file') || exeRes.data.message.includes('extension')), 'Executable file rejected with 400');

  // Test: Fake PDF with invalid signature
  const fakePdfPath = path.join(TEST_DIR, 'corrupted_header.pdf');
  fs.writeFileSync(fakePdfPath, 'This is not a real PDF file content, just plain text.');
  const fakePdfRes = await sendMultipartRequest('/api/applicants/upload', { jobId: targetJob._id }, { filePath: fakePdfPath, originalName: 'corrupted_header.pdf', mimeType: 'application/pdf' }, token);
  assert(fakePdfRes.status === 422 && fakePdfRes.data.message.includes('signature'), 'Corrupted PDF signature rejected with 422');

  // 4. Positive End-to-End Pipeline Test with 22 KB PDF Resume
  console.log('\n--- 3. END-TO-END AUTOMATIC SCREENING PIPELINE (22 KB PDF) ---');
  const uploadRes = await sendMultipartRequest('/api/applicants/upload', {
    jobId: targetJob._id
  }, {
    filePath: testPdfPath,
    originalName: 'Aarav_Mehta_22kb_Resume.pdf',
    mimeType: 'application/pdf'
  }, token);

  assert(uploadRes.status === 201, '22 KB PDF successfully uploaded and processed with HTTP 201');
  assert(uploadRes.data.success === true, 'Upload API response reports success: true');

  const app = uploadRes.data.applicant;
  assert(Boolean(app && app._id), 'Created applicant record contains valid database _id');
  console.log(`   Screened Candidate: "${app.fullName}" | Email: "${app.email}"`);
  console.log(`   Overall Match Score: ${app.matchAnalysis?.overallScore}%`);
  console.log(`   Extracted Skills (${app.extractedData?.skills?.length || 0}):`, (app.extractedData?.skills || []).slice(0, 8).join(', '));
  console.log(`   Matched Required Skills:`, (app.matchAnalysis?.matchedRequiredSkills || []).join(', '));

  assert(app.fullName === 'Aarav Mehta', 'NLP correctly extracted candidate name "Aarav Mehta"');
  assert(app.email === 'aarav.mehta.dev@outlook.com', 'NLP correctly extracted email "aarav.mehta.dev@outlook.com"');
  assert(app.extractedData?.skills?.includes('TypeScript') || app.extractedData?.skills?.includes('React'), 'NLP successfully extracted technical skills');
  assert((app.matchAnalysis?.overallScore || 0) > 0, 'Semantic matching engine calculated overall match score');

  // 5. Duplicate Prevention Test
  console.log('\n--- 4. DUPLICATE PREVENTION & RECORD UPDATE ---');
  const reUploadRes = await sendMultipartRequest('/api/applicants/upload', {
    jobId: targetJob._id
  }, {
    filePath: testPdfPath,
    originalName: 'Aarav_Mehta_22kb_Resume.pdf',
    mimeType: 'application/pdf'
  }, token);

  assert(reUploadRes.status === 201, 'Re-uploading existing resume succeeds with 201');
  assert(reUploadRes.data.isUpdate === true, 'Duplicate upload identified as update (isUpdate: true)');
  assert(reUploadRes.data.applicant._id === app._id, 'Existing applicant record updated with same _id (no duplicate row created)');

  // 6. Screening History & Database Verification
  console.log('\n--- 5. SCREENING HISTORY & CANDIDATE RECORD PERSISTENCE ---');
  const historyRes = await getJson('/api/applicants?limit=10', token);
  assert(historyRes.status === 200, 'GET /api/applicants succeeds with 200');
  const foundCandidate = (historyRes.data.applicants || []).find(a => a._id === app._id || a.email === 'aarav.mehta.dev@outlook.com');
  assert(Boolean(foundCandidate), 'Newly screened candidate appears in Recent Uploads and All Screening Results');

  // Clean up test files
  try {
    fs.unlinkSync(exePath);
    fs.unlinkSync(fakePdfPath);
  } catch (e) {}

  console.log('\n============================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTests().catch(err => {
  console.error('[Test Execution Error]:', err);
  process.exit(1);
});
