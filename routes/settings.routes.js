const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.route('/')
  .get(settingsController.getSettings)
  .put(settingsController.updateSettings);

module.exports = router;
