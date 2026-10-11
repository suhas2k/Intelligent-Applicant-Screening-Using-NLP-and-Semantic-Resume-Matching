let app;
let initError = null;

try {
  require('../utils/polyfills');
  app = require('../server.js');
} catch (err) {
  initError = err;
  console.error('[FATAL] Failed to require server.js:', err);
}

module.exports = (req, res) => {
  if (initError) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      status: 'error',
      phase: 'module_initialization',
      message: initError.message,
      stack: initError.stack
    }));
  }

  try {
    return app(req, res);
  } catch (runErr) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      status: 'error',
      phase: 'request_execution',
      message: runErr.message,
      stack: runErr.stack
    }));
  }
};
