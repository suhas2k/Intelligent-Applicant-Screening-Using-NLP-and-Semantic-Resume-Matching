const path = require('path');
const fs = require('fs');
const { applicantRepo, jobRepo } = require('../models/store');
const { extractResumeText } = require('../services/textExtraction.service');
const { parseResume } = require('../services/nlpParser.service');
const { analyzeMatch } = require('../services/matchingEngine.service');

// Upload single resume and match against a job
exports.uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No resume file uploaded. Please upload a PDF or DOCX file.'
      });
    }

    const { jobId, fullName: providedName, email: providedEmail, phone: providedPhone } = req.body;

    if (!jobId) {
      // Remove uploaded file if jobId is missing
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Job ID is required to associate the applicant with a position.'
      });
    }

    const job = await jobRepo.findById(jobId);
    if (!job) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Associated job not found.'
      });
    }

    // 1. Extract text from uploaded document (PDF/DOCX)
    const rawText = await extractResumeText(req.file.path, req.file.originalname);

    // 2. Parse candidate contact, skills, education, and experience
    const extraJobSkills = [...(job.requiredSkills || []), ...(job.preferredSkills || [])];
    const parsed = parseResume(rawText, req.file.originalname, extraJobSkills);

    // 3. Compute semantic NLP match against Job
    const matchAnalysis = analyzeMatch(job, parsed, rawText);

    // 4. Save applicant
    const applicant = await applicantRepo.create({
      jobId: job._id,
      fullName: providedName?.trim() || parsed.fullName || 'Candidate',
      email: providedEmail?.trim() || parsed.email || '',
      phone: providedPhone?.trim() || parsed.phone || '',
      location: '',
      resumeFile: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      },
      extractedText: rawText,
      extractedData: {
        skills: parsed.skills,
        experienceYears: parsed.experienceYears,
        educationLevel: parsed.educationLevel,
        degreeName: parsed.degreeName,
        contact: parsed.contact
      },
      matchAnalysis,
      status: 'New',
      recruiterNotes: '',
      uploadedBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Resume parsed and screened successfully.',
      applicant
    });
  } catch (error) {
    // Clean up file if processing failed
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    next(error);
  }
};

// Batch upload multiple resumes
exports.uploadBulkResumes = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one resume file to upload.'
      });
    }

    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'Job ID is required.'
      });
    }

    const job = await jobRepo.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Target job not found.'
      });
    }

    const extraJobSkills = [...(job.requiredSkills || []), ...(job.preferredSkills || [])];
    const results = [];
    const errors = [];

    for (const file of req.files) {
      try {
        const rawText = await extractResumeText(file.path, file.originalname);
        const parsed = parseResume(rawText, file.originalname, extraJobSkills);
        const matchAnalysis = analyzeMatch(job, parsed, rawText);

        const applicant = await applicantRepo.create({
          jobId: job._id,
          fullName: parsed.fullName || 'Candidate',
          email: parsed.email || '',
          phone: parsed.phone || '',
          location: '',
          resumeFile: {
            originalName: file.originalname,
            filename: file.filename,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path
          },
          extractedText: rawText,
          extractedData: {
            skills: parsed.skills,
            experienceYears: parsed.experienceYears,
            educationLevel: parsed.educationLevel,
            degreeName: parsed.degreeName,
            contact: parsed.contact
          },
          matchAnalysis,
          status: 'New',
          recruiterNotes: '',
          uploadedBy: req.user._id
        });

        results.push(applicant);
      } catch (err) {
        errors.push({
          file: file.originalname,
          error: err.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Processed ${results.length} resumes successfully.${errors.length > 0 ? ` Encountered errors on ${errors.length} files.` : ''}`,
      processedCount: results.length,
      errorCount: errors.length,
      applicants: results,
      errors
    });
  } catch (error) {
    next(error);
  }
};

// Get all applicants with filtering, searching, and sorting
exports.getApplicants = async (req, res, next) => {
  try {
    const { jobId, status, minScore, search, sortBy, sortOrder } = req.query;

    const filter = {};
    if (jobId && jobId !== 'All') {
      filter.jobId = jobId;
    }
    if (status && status !== 'All') {
      filter.status = status;
    }

    let applicants = await applicantRepo.find(filter);

    // Filter by minScore
    if (minScore) {
      const min = Number(minScore);
      applicants = applicants.filter(a => (a.matchAnalysis?.overallScore || 0) >= min);
    }

    // Search by candidate name, email, synthetic ID, or skills
    if (search) {
      const q = search.toLowerCase();
      applicants = applicants.filter(a =>
        (a.fullName && a.fullName.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q)) ||
        (a.benchmark?.syntheticResumeId && a.benchmark.syntheticResumeId.toLowerCase().includes(q)) ||
        (a.benchmark?.seniority && a.benchmark.seniority.toLowerCase().includes(q)) ||
        (a.benchmark?.industry && a.benchmark.industry.toLowerCase().includes(q)) ||
        (a.extractedData?.skills && a.extractedData.skills.some(s => s.toLowerCase().includes(q))) ||
        (a.matchAnalysis?.matchedRequiredSkills && a.matchAnalysis.matchedRequiredSkills.some(s => s.toLowerCase().includes(q)))
      );
    }

    // Sorting
    const order = sortOrder === 'asc' ? 1 : -1;
    applicants.sort((a, b) => {
      if (sortBy === 'experience') {
        const expA = a.extractedData?.experienceYears || 0;
        const expB = b.extractedData?.experienceYears || 0;
        return (expA - expB) * order;
      }
      if (sortBy === 'name') {
        return (a.fullName || '').localeCompare(b.fullName || '') * order;
      }
      if (sortBy === 'date') {
        return (new Date(a.createdAt) - new Date(b.createdAt)) * order;
      }
      // Default: match score descending
      const scoreA = a.matchAnalysis?.overallScore || 0;
      const scoreB = b.matchAnalysis?.overallScore || 0;
      return (scoreA - scoreB) * order;
    });

    res.json({
      success: true,
      count: applicants.length,
      applicants
    });
  } catch (error) {
    next(error);
  }
};

// Get single applicant by ID
exports.getApplicantById = async (req, res, next) => {
  try {
    const applicant = await applicantRepo.findById(req.params.id);
    if (!applicant) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found.'
      });
    }

    res.json({
      success: true,
      applicant
    });
  } catch (error) {
    next(error);
  }
};

// Update applicant status and recruiter notes
exports.updateApplicantStatus = async (req, res, next) => {
  try {
    const { status, recruiterNotes } = req.body;

    const validStatuses = ['New', 'Reviewed', 'Shortlisted', 'Rejected'];
    const updateData = {};

    if (status) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Permitted values: ${validStatuses.join(', ')}`
        });
      }
      updateData.status = status;
    }

    if (recruiterNotes !== undefined) {
      updateData.recruiterNotes = recruiterNotes;
    }

    const updated = await applicantRepo.findByIdAndUpdate(req.params.id, updateData);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found.'
      });
    }

    res.json({
      success: true,
      message: 'Applicant status updated successfully.',
      applicant: updated
    });
  } catch (error) {
    next(error);
  }
};

// Re-evaluate an applicant's match against their associated job
exports.reEvaluateApplicant = async (req, res, next) => {
  try {
    const applicant = await applicantRepo.findById(req.params.id);
    if (!applicant) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found.'
      });
    }

    const jobId = applicant.jobId?._id || applicant.jobId;
    const job = await jobRepo.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Associated job no longer exists.'
      });
    }

    const matchAnalysis = analyzeMatch(
      job,
      applicant.extractedData,
      applicant.extractedText
    );

    const updated = await applicantRepo.findByIdAndUpdate(req.params.id, {
      matchAnalysis
    });

    res.json({
      success: true,
      message: 'Applicant re-evaluated successfully against latest job parameters.',
      applicant: updated
    });
  } catch (error) {
    next(error);
  }
};

// Delete an applicant
exports.deleteApplicant = async (req, res, next) => {
  try {
    const applicant = await applicantRepo.findByIdAndDelete(req.params.id);
    if (!applicant) {
      return res.status(404).json({
        success: false,
        message: 'Applicant not found.'
      });
    }

    // Clean up uploaded file if exists
    if (applicant.resumeFile?.path && fs.existsSync(applicant.resumeFile.path)) {
      try {
        fs.unlinkSync(applicant.resumeFile.path);
      } catch (e) {}
    }

    res.json({
      success: true,
      message: 'Applicant and associated resume deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};
