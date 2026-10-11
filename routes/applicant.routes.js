const express = require('express');
const router = express.Router();
const applicantController = require('../controllers/applicant.controller');
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// Protect all applicant routes
router.use(authenticate);

// Resume upload endpoints
router.post('/upload', upload.single('resume'), applicantController.uploadResume);
router.post('/upload-bulk', upload.array('resumes', 10), applicantController.uploadBulkResumes);

// Applicant query and management
router.get('/', applicantController.getApplicants);
router.get('/:id', applicantController.getApplicantById);
router.patch('/:id/status', applicantController.updateApplicantStatus);
router.post('/:id/re-evaluate', applicantController.reEvaluateApplicant);
router.delete('/:id', applicantController.deleteApplicant);

module.exports = router;
