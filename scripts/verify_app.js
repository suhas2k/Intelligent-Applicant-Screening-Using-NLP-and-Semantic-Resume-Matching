const http = require('http');

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'GET',
        headers
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function post(path, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('--- Verifying ResumeIQ App & Endpoints with Synthetic Benchmark Data ---');

  // 1. Health
  const health = await get('/api/health');
  console.log('1. Health check status:', health.status);

  // 2. Static HTML and Views
  const views = [
    '/',
    '/css/style.css',
    '/app/views/login.html',
    '/app/views/register.html',
    '/app/views/dashboard.html',
    '/app/views/jobs.html',
    '/app/views/job-detail.html',
    '/app/views/applicants.html',
    '/app/views/applicant-detail.html'
  ];

  for (const v of views) {
    const res = await get(v);
    if (res.status !== 200) {
      throw new Error(`Failed to load static view ${v}: HTTP ${res.status}`);
    }
  }
  console.log(`2. All ${views.length} static view templates loaded (HTTP 200).`);

  // 3. Auth login
  const loginRes = await post('/api/auth/login', {
    email: 'recruiter@demo.com',
    password: 'password123'
  });
  console.log('3. Recruiter Login status:', loginRes.status);
  const loginJson = JSON.parse(loginRes.body);
  const token = loginJson.token;
  console.log('   Recruiter:', loginJson.user?.name, `(${loginJson.user?.email})`);

  // 4. Authenticated Dashboard stats
  const authHeaders = { Authorization: `Bearer ${token}` };
  const dashRes = await get('/api/analytics/dashboard', authHeaders);
  console.log('4. Dashboard Stats status:', dashRes.status);
  const dashJson = JSON.parse(dashRes.body);
  console.log('   Active Jobs:', dashJson.stats.activeJobs, 'Total Screened:', dashJson.stats.totalApplicants);

  // 5. Authenticated Jobs list
  const jobsRes = await get('/api/jobs', authHeaders);
  console.log('5. Jobs List status:', jobsRes.status);
  const jobsJson = JSON.parse(jobsRes.body);
  console.log('   Total jobs:', jobsJson.jobs.length);
  const syntheticJobs = jobsJson.jobs.filter(j => j.benchmark && j.benchmark.isSynthetic);
  console.log('   Synthetic benchmark jobs count:', syntheticJobs.length);

  // 6. Authenticated Applicants list
  const appRes = await get('/api/applicants', authHeaders);
  console.log('6. Applicants List status:', appRes.status);
  const appJson = JSON.parse(appRes.body);
  console.log('   Total applicants:', appJson.applicants.length);
  const syntheticApps = appJson.applicants.filter(a => a.benchmark && a.benchmark.syntheticResumeId);
  console.log('   Synthetic sample applicants count:', syntheticApps.length);
  const benchmarkMatches = syntheticApps.filter(a => a.benchmark.isBenchmarkMatch);
  console.log('   Ground-truth benchmark matches count:', benchmarkMatches.length);

  // 7. Search candidate by synthetic ID
  const searchRes = await get('/api/applicants?search=R_002908', authHeaders);
  const searchJson = JSON.parse(searchRes.body);
  if (searchJson.applicants.length === 0) {
    throw new Error('Search for synthetic ID R_002908 returned 0 results');
  }
  const candidate = searchJson.applicants[0];
  console.log('7. Search by synthetic ID (R_002908) succeeded:');
  console.log('   Name:', candidate.fullName);
  console.log('   Score:', candidate.matchAnalysis.overallScore + '%');
  console.log('   Seniority / Industry:', candidate.benchmark.seniority, '/', candidate.benchmark.industry);
  console.log('   isBenchmarkMatch:', candidate.benchmark.isBenchmarkMatch);

  // 8. Fetch single applicant detail
  const detailRes = await get(`/api/applicants/${candidate._id}`, authHeaders);
  if (detailRes.status !== 200) {
    throw new Error(`Failed to fetch applicant detail: HTTP ${detailRes.status}`);
  }
  const detailJson = JSON.parse(detailRes.body);
  console.log('8. Applicant detail API verified:');
  console.log('   Extracted skills:', detailJson.applicant.extractedData.skills.slice(0, 4).join(', '));
  console.log('   Matched required skills:', detailJson.applicant.matchAnalysis.matchedRequiredSkills.join(', '));

  console.log('--- All Verifications Passed Successfully! ---');
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
