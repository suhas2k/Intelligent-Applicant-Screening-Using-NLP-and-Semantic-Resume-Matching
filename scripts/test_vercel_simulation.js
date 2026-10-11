const http = require('http');

// 1. Simulate Vercel Serverless Production Environment
process.env.VERCEL = '1';
process.env.NODE_ENV = 'production';
delete process.env.MONGODB_URI; // No local MongoDB

console.log('--- Simulating Vercel Serverless Invocation ---');

// 2. Load the Vercel entrypoint
const handler = require('../api/index.js');

console.log('Handler type:', typeof handler);
if (typeof handler !== 'function') {
  console.error('FATAL: Vercel handler is not a function! Got:', typeof handler);
  process.exit(1);
}

// 3. Create HTTP server using handler directly (mimicking Vercel @vercel/node bridge)
const server = http.createServer(handler);

server.listen(0, async () => {
  const port = server.address().port;
  console.log(`Simulated Vercel runtime listening on ephemeral port ${port}`);

  function makeRequest(path, method = 'GET', body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const reqHeaders = { ...headers };
      if (payload) {
        reqHeaders['Content-Type'] = 'application/json';
        reqHeaders['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: reqHeaders
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, raw: data });
            }
          });
        }
      );
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  try {
    // Test A: Health check
    console.log('\n[Test A] Calling /api/health ...');
    const health = await makeRequest('/api/health');
    console.log('Health status:', health.status);
    console.log('Health payload:', health.data);
    if (health.status !== 200 || health.data.status !== 'ok') {
      throw new Error(`Health check failed with status ${health.status}`);
    }

    // Test B: Login
    console.log('\n[Test B] Calling /api/auth/login ...');
    const login = await makeRequest('/api/auth/login', 'POST', {
      email: 'recruiter@demo.com',
      password: 'password123'
    });
    console.log('Login status:', login.status, 'Success:', login.data.success);
    if (login.status !== 200 || !login.data.token) {
      throw new Error(`Login failed with status ${login.status}`);
    }
    const token = login.data.token;

    // Test C: Fetch Jobs
    console.log('\n[Test C] Calling /api/jobs ...');
    const jobs = await makeRequest('/api/jobs', 'GET', null, { Authorization: `Bearer ${token}` });
    console.log('Jobs status:', jobs.status, 'Count:', jobs.data.jobs?.length);
    if (jobs.status !== 200 || !jobs.data.jobs || jobs.data.jobs.length === 0) {
      throw new Error(`Fetch jobs failed with status ${jobs.status}`);
    }

    // Test D: Fetch Applicants
    console.log('\n[Test D] Calling /api/applicants ...');
    const applicants = await makeRequest('/api/applicants', 'GET', null, { Authorization: `Bearer ${token}` });
    console.log('Applicants status:', applicants.status, 'Count:', applicants.data.applicants?.length);
    if (applicants.status !== 200 || !applicants.data.applicants || applicants.data.applicants.length === 0) {
      throw new Error(`Fetch applicants failed with status ${applicants.status}`);
    }

    console.log('\n✅ All Vercel serverless simulation tests PASSED successfully!');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Vercel serverless simulation FAILED:', err);
    server.close();
    process.exit(1);
  }
});
