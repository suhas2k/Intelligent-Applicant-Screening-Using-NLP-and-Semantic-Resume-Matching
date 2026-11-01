const http = require('http');

function request(path, options = {}, payload = null) {
  return new Promise((resolve, reject) => {
    const headers = Object.assign({}, options.headers || {});
    let payloadStr = null;
    if (payload !== null) {
      payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payloadStr);
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: options.method || 'GET',
        headers
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(body);
          } catch (e) {
            // Not json
          }
          resolve({ status: res.statusCode, headers: res.headers, body, json });
        });
      }
    );
    req.on('error', reject);
    if (payloadStr) req.write(payloadStr);
    req.end();
  });
}

const results = [];

function assert(description, condition, details = '') {
  if (condition) {
    console.log(`  [PASS] ${description}`);
    results.push({ test: description, status: 'PASS', details });
  } else {
    console.error(`  [FAIL] ${description} ${details ? '- ' + details : ''}`);
    results.push({ test: description, status: 'FAIL', details });
  }
}

async function run() {
  console.log('============================================================');
  console.log('RESUMEIQ MASTER AUDIT & AUTOMATED VERIFICATION TEST SUITE');
  console.log('============================================================\n');

  // 1. Health & Server Ping
  console.log('--- 1. SERVER HEALTH & PING ---');
  const health = await request('/api/health');
  assert('Server health check responds with 200', health.status === 200);
  assert('Health response contains status ok', health.json && (health.json.status === 'ok' || health.json.status === 'OK'));

  // 2. Static Views Availability
  console.log('\n--- 2. ANGULARJS VIEW TEMPLATES ---');
  const views = [
    '/',
    '/css/style.css',
    '/app/views/login.html',
    '/app/views/register.html',
    '/app/views/dashboard.html',
    '/app/views/jobs.html',
    '/app/views/job-detail.html',
    '/app/views/applicants.html',
    '/app/views/applicant-detail.html',
    '/app/views/screening.html',
    '/app/views/interviews.html',
    '/app/views/analytics.html',
    '/app/views/team.html',
    '/app/views/settings.html'
  ];

  for (const v of views) {
    const res = await request(v);
    assert(`View '${v}' loads with HTTP 200`, res.status === 200, `Got ${res.status}`);
  }

  // 3. Authentication
  console.log('\n--- 3. AUTHENTICATION & SECURITY ---');
  const badLogin = await request('/api/auth/login', { method: 'POST' }, {
    email: 'recruiter@demo.com',
    password: 'wrongpassword'
  });
  assert('Bad login credentials rejected with 401', badLogin.status === 401);

  const goodLogin = await request('/api/auth/login', { method: 'POST' }, {
    email: 'recruiter@demo.com',
    password: 'password123'
  });
  assert('Valid login succeeds with 200', goodLogin.status === 200);
  assert('JWT token returned', goodLogin.json && !!goodLogin.json.token);
  
  const token = goodLogin.json ? goodLogin.json.token : null;
  const authHeaders = { Authorization: `Bearer ${token}` };

  const unauthMe = await request('/api/auth/me');
  assert('Missing token rejects with 401', unauthMe.status === 401);

  const authMe = await request('/api/auth/me', { headers: authHeaders });
  assert('Profile fetch (/api/auth/me) succeeds with 200', authMe.status === 200);
  assert('Profile contains user info', authMe.json && authMe.json.user && authMe.json.user.email === 'recruiter@demo.com');

  // 4. Analytics & Dashboard
  console.log('\n--- 4. ANALYTICS & DASHBOARD KPIS ---');
  const dashRes = await request('/api/analytics/dashboard', { headers: authHeaders });
  assert('Dashboard API (/api/analytics/dashboard) succeeds with 200', dashRes.status === 200);
  assert('Dashboard stats present', dashRes.json && dashRes.json.stats && typeof dashRes.json.stats.activeJobs === 'number');

  const analyticsRes = await request('/api/analytics', { headers: authHeaders });
  assert('Analytics API (/api/analytics) succeeds with 200', analyticsRes.status === 200);

  // 5. Jobs CRUD
  console.log('\n--- 5. JOB POSTINGS CRUD ---');
  const jobsListRes = await request('/api/jobs', { headers: authHeaders });
  assert('Jobs list (/api/jobs) succeeds with 200', jobsListRes.status === 200);
  assert('Jobs list returns array', jobsListRes.json && Array.isArray(jobsListRes.json.jobs));

  const newJobRes = await request('/api/jobs', { method: 'POST', headers: authHeaders }, {
    title: 'Senior QA Automation Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    description: 'Lead QA testing and automation for enterprise AI application.',
    requiredSkills: ['JavaScript', 'Playwright', 'Node.js', 'CI/CD'],
    preferredSkills: ['AngularJS', 'Express', 'MongoDB'],
    experienceYears: 5,
    minEducation: 'Bachelor',
    status: 'Active'
  });
  assert('Job creation (POST /api/jobs) succeeds with 201', newJobRes.status === 201);
  const createdJobId = newJobRes.json && newJobRes.json.job ? newJobRes.json.job._id : null;

  if (createdJobId) {
    const jobGetRes = await request(`/api/jobs/${createdJobId}`, { headers: authHeaders });
    assert('Get single job (/api/jobs/:id) succeeds with 200', jobGetRes.status === 200);

    const jobPutRes = await request(`/api/jobs/${createdJobId}`, { method: 'PUT', headers: authHeaders }, {
      title: 'Lead QA Automation Engineer'
    });
    assert('Update job (PUT /api/jobs/:id) succeeds with 200', jobPutRes.status === 200);

    const jobDeleteRes = await request(`/api/jobs/${createdJobId}`, { method: 'DELETE', headers: authHeaders });
    assert('Delete job (DELETE /api/jobs/:id) succeeds with 200', jobDeleteRes.status === 200);
  }

  // 6. Candidates / Applicants
  console.log('\n--- 6. CANDIDATES & APPLICANTS ---');
  const applicantsRes = await request('/api/applicants', { headers: authHeaders });
  assert('Applicants list (/api/applicants) succeeds with 200', applicantsRes.status === 200);
  assert('Applicants array returned', applicantsRes.json && Array.isArray(applicantsRes.json.applicants) && applicantsRes.json.applicants.length > 0);

  const sampleCandidate = applicantsRes.json.applicants[0];
  const candidateDetailRes = await request(`/api/applicants/${sampleCandidate._id}`, { headers: authHeaders });
  assert('Single applicant detail succeeds with 200', candidateDetailRes.status === 200);
  assert('Applicant detail contains matchAnalysis', candidateDetailRes.json && candidateDetailRes.json.applicant && !!candidateDetailRes.json.applicant.matchAnalysis);

  const statusUpdateRes = await request(`/api/applicants/${sampleCandidate._id}/status`, { method: 'PATCH', headers: authHeaders }, {
    status: 'Shortlisted'
  });
  assert('Applicant status update (PATCH /api/applicants/:id/status) succeeds with 200', statusUpdateRes.status === 200);

  // 7. Resume Screening Validation
  console.log('\n--- 7. RESUME SCREENING ---');
  const emptyScreenRes = await request('/api/applicants/upload', { method: 'POST', headers: authHeaders }, {});
  assert('Screening without resume file fails gracefully with 400', emptyScreenRes.status === 400);

  // 8. Interviews Workflow (Target of the Reported Bug)
  console.log('\n--- 8. INTERVIEWS WORKFLOW (BUG AUDIT TARGET) ---');
  const interviewsRes = await request('/api/interviews', { headers: authHeaders });
  assert('GET /api/interviews succeeds with 200 (NOT "Failed to load interviews")', interviewsRes.status === 200, `Got HTTP ${interviewsRes.status}`);
  assert('GET /api/interviews returns interviews array', interviewsRes.json && Array.isArray(interviewsRes.json.interviews));
  console.log(`   Initial interview count: ${interviewsRes.json && interviewsRes.json.interviews ? interviewsRes.json.interviews.length : 0}`);

  // Schedule a new interview
  const scheduleRes = await request('/api/interviews', { method: 'POST', headers: authHeaders }, {
    candidateName: sampleCandidate.fullName || 'Elena Rostova',
    candidateEmail: sampleCandidate.email || 'elena.rostova@example.com',
    role: 'Principal Full-Stack Engineer',
    department: 'Engineering',
    date: '2026-11-10',
    time: '14:30',
    type: 'Technical',
    interviewer: 'Alex Morgan',
    notes: 'Technical assessment on modern architecture and NLP.'
  });
  assert('Schedule interview (POST /api/interviews) succeeds with 201', scheduleRes.status === 201, `Got ${scheduleRes.status}`);
  const createdInterview = scheduleRes.json ? scheduleRes.json.interview : null;
  assert('Scheduled interview object contains valid ID', createdInterview && !!createdInterview._id);

  if (createdInterview && createdInterview._id) {
    // Reschedule interview
    const rescheduleRes = await request(`/api/interviews/${createdInterview._id}/reschedule`, { method: 'PATCH', headers: authHeaders }, {
      date: '2026-11-12',
      time: '16:00',
      type: 'System Design',
      status: 'Confirmed'
    });
    assert('Reschedule interview (PATCH /api/interviews/:id/reschedule) succeeds with 200', rescheduleRes.status === 200);
    assert('Rescheduled fields updated', rescheduleRes.json && rescheduleRes.json.interview && rescheduleRes.json.interview.time === '16:00');

    // Filter interviews by status
    const filterRes = await request('/api/interviews?status=Confirmed', { headers: authHeaders });
    assert('Filter interviews by status succeeds with 200', filterRes.status === 200);
    assert('Filter results contain confirmed interview', filterRes.json && filterRes.json.interviews.some(i => i._id === createdInterview._id));

    // Cancel / Delete interview
    const deleteInterviewRes = await request(`/api/interviews/${createdInterview._id}`, { method: 'DELETE', headers: authHeaders });
    assert('Delete interview (DELETE /api/interviews/:id) succeeds with 200', deleteInterviewRes.status === 200);
  }

  // 9. Team & Access
  console.log('\n--- 9. TEAM & ACCESS ---');
  const teamListRes = await request('/api/team', { headers: authHeaders });
  assert('Team list (GET /api/team) succeeds with 200', teamListRes.status === 200);
  assert('Team array returned', teamListRes.json && Array.isArray(teamListRes.json.team));

  const inviteRes = await request('/api/team/invite', { method: 'POST', headers: authHeaders }, {
    name: 'Sarah Connor',
    email: 'sarah.connor@enterprise.ai',
    role: 'Senior Recruiter',
    accessScope: 'Screening & Interviews'
  });
  assert('Team invite (POST /api/team/invite) succeeds with 201', inviteRes.status === 201);
  const invitedMemberId = inviteRes.json && inviteRes.json.member ? inviteRes.json.member._id : null;

  if (invitedMemberId) {
    const deleteMemberRes = await request(`/api/team/${invitedMemberId}`, { method: 'DELETE', headers: authHeaders });
    assert('Team member delete (DELETE /api/team/:id) succeeds with 200', deleteMemberRes.status === 200);
  }

  // 10. Settings & Configuration
  console.log('\n--- 10. SETTINGS & CONFIGURATION ---');
  const getSettingsRes = await request('/api/settings', { headers: authHeaders });
  assert('Get settings (GET /api/settings) succeeds with 200', getSettingsRes.status === 200);
  assert('Settings contains organization info', getSettingsRes.json && getSettingsRes.json.organization && !!getSettingsRes.json.organization.name);

  const putSettingsRes = await request('/api/settings', { method: 'PUT', headers: authHeaders }, {
    organization: {
      name: 'ResumeIQ Global Enterprise',
      domain: 'resumeiq.enterprise.ai'
    },
    nlpMatching: {
      semanticThreshold: 72,
      skillsWeight: 45,
      experienceWeight: 35,
      educationWeight: 20
    }
  });
  assert('Update settings (PUT /api/settings) succeeds with 200', putSettingsRes.status === 200);
  assert('Updated organization name reflected', putSettingsRes.json && putSettingsRes.json.organization && putSettingsRes.json.organization.name === 'ResumeIQ Global Enterprise');

  // Summary
  console.log('\n============================================================');
  console.log('TEST SUMMARY');
  console.log('============================================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`Total Tests Executed: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.error('\nFAILED TESTS:');
    results.filter(r => r.status === 'FAIL').forEach(f => console.error(` - ${f.test}: ${f.details}`));
    process.exit(1);
  } else {
    console.log('\nALL APPLICATION-WIDE ENDPOINTS AND WORKFLOWS VERIFIED AS 100% OPERATIONAL!');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal test suite error:', err);
  process.exit(1);
});
