const app = require('../server.js');

const handler = (req, res) => {
  return app(req, res);
};

// Support both callable function handler and Express properties
Object.setPrototypeOf(handler, app);

module.exports = handler;
