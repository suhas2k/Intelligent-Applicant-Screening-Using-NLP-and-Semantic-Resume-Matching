const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interview.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.route('/')
  .get(interviewController.getInterviews)
  .post(interviewController.scheduleInterview);

router.route('/:id/reschedule')
  .patch(interviewController.rescheduleInterview);

router.route('/:id')
  .delete(interviewController.cancelInterview);

module.exports = router;
