const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', analyticsController.getDashboardStats);
router.get('/dashboard', analyticsController.getDashboardStats);

module.exports = router;

