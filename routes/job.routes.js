const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Protect all job routes
router.use(authenticate);

router.route('/')
  .get(jobController.getJobs)
  .post(jobController.createJob);

router.route('/:id')
  .get(jobController.getJobById)
  .put(jobController.updateJob)
  .delete(jobController.deleteJob);

module.exports = router;
