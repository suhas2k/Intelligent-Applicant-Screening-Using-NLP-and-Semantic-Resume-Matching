const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\MANIKANTA\\.gemini\\antigravity-ide\\brain\\05eabfc9-f834-4708-ad06-7fa940bbff0a';
const TEMP_USER_DATA = path.join(ARTIFACT_DIR, 'scratch', `chrome_profile_${Date.now()}`);
const CDP_PORT = 9333;

function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
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
  console.log('1. Authenticating with backend...');
  const loginRes = await postJson('/api/auth/login', {
    email: 'recruiter@demo.com',
    password: 'password123'
  });

  if (!loginRes.token) {
    throw new Error('Login failed: ' + JSON.stringify(loginRes));
  }
  const token = loginRes.token;
  const user = JSON.stringify(loginRes.user);
  console.log('Logged in as:', loginRes.user.email);

  fs.mkdirSync(TEMP_USER_DATA, { recursive: true });

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log(`2. Launching headless Chrome on port ${CDP_PORT}...`);
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

  if (!target) {
    throw new Error('Could not connect to Chrome debugging target on port ' + CDP_PORT);
  }
  console.log('Attached to target:', target.title, target.webSocketDebuggerUrl);

  const cdp = new CdpClient(target.webSocketDebuggerUrl);
  await cdp.waitOpen();
  console.log('Connected to CDP');

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  // Initial load
  await cdp.send('Page.navigate', { url: 'http://localhost:5000/#!/dashboard' });
  await delay(1200);

  // Inject session
  await cdp.send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('screening_token', ${JSON.stringify(token)});
      localStorage.setItem('screening_user', ${JSON.stringify(user)});
      localStorage.setItem('resumeiq_theme', 'light');
    `
  });

  async function capture(name, pathUrl, width, height, theme = null, extraAction = null) {
    console.log(`\n--- Capturing ${name} (${width}x${height}, theme: ${theme || 'unchanged'}) at ${pathUrl} ---`);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768
    });

    if (theme) {
      await cdp.send('Runtime.evaluate', {
        expression: `
          localStorage.setItem('resumeiq_theme', '${theme}');
          document.documentElement.setAttribute('data-theme', '${theme === 'system' ? 'light' : theme}');
          document.documentElement.setAttribute('data-theme-setting', '${theme}');
        `
      });
    }

    await cdp.send('Page.navigate', { url: `http://localhost:5000/${pathUrl}` });
    await delay(1500);

    // If theme specified, ensure ThemeService / DOM is updated
    if (theme) {
      await cdp.send('Runtime.evaluate', {
        expression: `
          try {
            var body = angular.element(document.body);
            if (body && body.injector()) {
              var ts = body.injector().get('ThemeService');
              if (ts) ts.setTheme('${theme}');
              body.scope().$apply();
            }
          } catch(e) {}
          document.documentElement.setAttribute('data-theme', '${theme === 'system' ? 'light' : theme}');
          document.documentElement.setAttribute('data-theme-setting', '${theme}');
        `
      });
      await delay(500);
    }

    if (extraAction) {
      await cdp.send('Runtime.evaluate', { expression: extraAction });
      await delay(600);
    }

    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const outPath = path.join(ARTIFACT_DIR, `${name}.png`);
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    console.log(`Saved screenshot: ${outPath} (${fs.statSync(outPath).size} bytes)`);
    return outPath;
  }

  // 1. Light Desktop (1440x900)
  await capture('light_desktop', '#!/dashboard', 1440, 900, 'light');

  // 2. Dark Desktop (1440x900)
  await capture('dark_desktop', '#!/dashboard', 1440, 900, 'dark');

  // 3. System Theme (1440x900, in settings appearance tab)
  await capture('system_theme', '#!/settings', 1440, 900, 'system', `
    try {
      var tabs = document.querySelectorAll('.iq-tab-item');
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].textContent.includes('Appearance')) {
          tabs[i].click();
          break;
        }
      }
    } catch(e) {}
  `);

  // 4. Mobile Dashboard (390x844)
  await capture('mobile_dashboard', '#!/dashboard', 390, 844, 'light');

  // 5. Mobile Job Postings (390x844)
  await capture('mobile_job_postings', '#!/jobs', 390, 844, 'light');

  // 6. Mobile Candidates (390x844)
  await capture('mobile_candidates', '#!/candidates', 390, 844, 'light');

  // 7. Mobile Interviews (390x844)
  await capture('mobile_interviews', '#!/interviews', 390, 844, 'light');

  // Mobile Drawer Open test (390x844)
  await capture('mobile_drawer_open', '#!/dashboard', 390, 844, 'light', `
    try {
      var btn = document.querySelector('.btn-outline-iq.d-lg-none');
      if (btn) btn.click();
    } catch(e) {}
  `);

  // Tablet 768px test
  await capture('tablet_dashboard_768', '#!/dashboard', 768, 1024, 'light');

  console.log('\nAll visual testing and screenshots successfully captured!');
  cdp.close();
  chromeProc.kill();
  process.exit(0);
}

main().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
