const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\MANIKANTA\\.gemini\\antigravity-ide\\brain\\05eabfc9-f834-4708-ad06-7fa940bbff0a';
const TEMP_USER_DATA = path.join(ARTIFACT_DIR, 'scratch', `chrome_profile_screening_${Date.now()}`);
const CDP_PORT = 9334;

function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }

  waitOpen() {
    return new Promise((resolve, reject) => {
      if (this.ws.readyState === WebSocket.OPEN) return resolve();
      this.ws.onopen = () => resolve();
      this.ws.onerror = reject;
    });
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  console.log('1. Authenticating...');
  const loginRes = await postJson('/api/auth/login', {
    email: 'recruiter@demo.com',
    password: 'password123'
  });

  if (!loginRes.token) {
    throw new Error('Login failed: ' + JSON.stringify(loginRes));
  }
  const token = loginRes.token;
  const user = JSON.stringify(loginRes.user);

  fs.mkdirSync(TEMP_USER_DATA, { recursive: true });

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log(`2. Launching Chrome CDP on port ${CDP_PORT}...`);
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${TEMP_USER_DATA}`
  ]);

  let target = null;
  for (let i = 0; i < 20; i++) {
    await delay(500);
    try {
      const targets = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`).then(r => r.json());
      target = targets.find(t => t.type === 'page') || targets[0];
      if (target) break;
    } catch (e) {}
  }

  if (!target) throw new Error('Could not connect to Chrome CDP');

  const cdp = new CdpClient(target.webSocketDebuggerUrl);
  await cdp.waitOpen();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  // Navigate to app & inject token
  await cdp.send('Page.navigate', { url: 'http://localhost:5000/#!/dashboard' });
  await delay(1200);

  await cdp.send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('screening_token', ${JSON.stringify(token)});
      localStorage.setItem('screening_user', ${JSON.stringify(user)});
      localStorage.setItem('resumeiq_theme', 'light');
    `
  });

  // Navigate to Resume Screening page
  console.log('3. Navigating to Resume Screening page...');
  await cdp.send('Page.navigate', { url: 'http://localhost:5000/#!/screening' });
  await delay(2000);

  // Screenshot 1: Screening page initial state
  console.log('4. Capturing screening_initial_view.png...');
  const shot1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const path1 = path.join(ARTIFACT_DIR, 'screening_initial_view.png');
  fs.writeFileSync(path1, Buffer.from(shot1.data, 'base64'));
  console.log('Saved:', path1);

  // Trigger one of the sample benchmark uploads to run the full automatic pipeline
  console.log('5. Clicking benchmark profile to trigger full automatic upload pipeline...');
  await cdp.send('Runtime.evaluate', {
    expression: `
      var btns = document.querySelectorAll('.benchmark-card');
      if (btns && btns.length > 0) {
        btns[0].click();
      }
    `
  });

  // Wait 600ms to capture 9-stage pipeline progress panel while running
  await delay(600);
  console.log('6. Capturing screening_pipeline_in_progress.png...');
  const shot2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const path2 = path.join(ARTIFACT_DIR, 'screening_pipeline_in_progress.png');
  fs.writeFileSync(path2, Buffer.from(shot2.data, 'base64'));
  console.log('Saved:', path2);

  // Wait for the pipeline to complete and results to render
  console.log('7. Waiting for full automatic pipeline completion...');
  await delay(3500);

  // Screenshot 3: Completed candidate evaluation card & updated history
  console.log('8. Capturing screening_results_complete.png...');
  const shot3 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const path3 = path.join(ARTIFACT_DIR, 'screening_results_complete.png');
  fs.writeFileSync(path3, Buffer.from(shot3.data, 'base64'));
  console.log('Saved:', path3);

  // Dark mode test of the screening page
  console.log('9. Switching to dark mode and capturing screening_dark_mode.png...');
  await cdp.send('Runtime.evaluate', {
    expression: `
      try {
        var body = angular.element(document.body);
        if (body && body.injector()) {
          var ts = body.injector().get('ThemeService');
          if (ts) ts.setTheme('dark');
          body.scope().$apply();
        }
      } catch(e) {}
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.setAttribute('data-theme-setting', 'dark');
    `
  });
  await delay(1000);

  const shot4 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const path4 = path.join(ARTIFACT_DIR, 'screening_dark_mode.png');
  fs.writeFileSync(path4, Buffer.from(shot4.data, 'base64'));
  console.log('Saved:', path4);

  console.log('All screening verification screenshots captured successfully!');
  cdp.close();
  chromeProc.kill();
  process.exit(0);
}

main().catch(err => {
  console.error('[Screening Capture Error]:', err);
  process.exit(1);
});
