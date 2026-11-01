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
      if (req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(400).json({
        success: false,
        message: 'Please select a target job position to match the resume against.'
      });
    }

    const job = await jobRepo.findById(jobId);
    if (!job) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(404).json({
        success: false,
        message: 'The selected target job position was not found.'
      });
    }

    // 1. Validate file extension
    const ext = path.extname(req.file.originalname).toLowerCase();
    const allowedExts = ['.pdf', '.docx', '.doc', '.txt'];
    if (!allowedExts.includes(ext)) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(400).json({
        success: false,
        message: `Unsupported file extension "${ext}". Only PDF (.pdf) and Word documents (.docx, .doc) are permitted.`
      });
    }

    // 2. Extract text from uploaded document (PDF/DOCX)
    let rawText;
    try {
      rawText = await extractResumeText(req.file.path, req.file.originalname);
    } catch (parseError) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(422).json({
        success: false,
        message: parseError.message || 'Failed to extract text from the uploaded resume.'
      });
    }

    if (!rawText || rawText.trim().length === 0) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(422).json({
        success: false,
        message: 'No readable text could be extracted from this document. If this is an image-only scan, please upload a text-based PDF or DOCX file.'
      });
    }

    // 3. Parse candidate contact, skills, education, and experience via NLP engine
    const extraJobSkills = [...(job.requiredSkills || []), ...(job.preferredSkills || [])];
    const parsed = parseResume(rawText, req.file.originalname, extraJobSkills);

    // 4. Candidate Name & Contact Resolution (prefer genuine parsed info over placeholders)
    let candidateName = parsed.fullName;
    if (providedName && providedName.trim() && !providedName.includes('.pdf') && !providedName.includes('.docx')) {
      candidateName = providedName.trim();
    }
    if (!candidateName || candidateName.toLowerCase() === 'candidate') {
      const base = path.basename(req.file.originalname, ext).replace(/[_.-]/g, ' ').trim();
      candidateName = base ? base.replace(/\b\w/g, c => c.toUpperCase()) : 'Candidate';
    }

    let candidateEmail = parsed.email || '';
    if (providedEmail && providedEmail.trim() && !providedEmail.includes('screened.iq') && !providedEmail.includes('talent.iq')) {
      candidateEmail = providedEmail.trim();
    }

    let candidatePhone = providedPhone?.trim() || parsed.phone || '';

    // 5. Compute semantic NLP match against Target Job
    const matchAnalysis = analyzeMatch(job, parsed, rawText);

    // 6. Check for duplicate record for the same job and candidate
    let existingApplicant = null;
    if (candidateEmail) {
      existingApplicant = await applicantRepo.findOne({
        jobId: job._id,
        email: candidateEmail.toLowerCase()
      });
    }
    if (!existingApplicant && req.file.originalname) {
      existingApplicant = await applicantRepo.findOne({
        jobId: job._id,
        'resumeFile.originalName': req.file.originalname
      });
    }

    let applicant;
    if (existingApplicant) {
      applicant = await applicantRepo.update(existingApplicant._id, {
        fullName: candidateName,
        email: candidateEmail,
        phone: candidatePhone,
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
        updatedAt: new Date()
      });
    } else {
      applicant = await applicantRepo.create({
        jobId: job._id,
        fullName: candidateName,
        email: candidateEmail,
        phone: candidatePhone,
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
        uploadedBy: req.user ? req.user._id : null
      });
    }

    res.status(201).json({
      success: true,
      message: existingApplicant 
        ? `Resume re-screened and candidate record updated for ${candidateName}.` 
        : `Resume parsed and screened successfully for ${candidateName}.`,
      isUpdate: Boolean(existingApplicant),
      applicant: {
        ...applicant,
        jobTitle: job.title,
        jobDepartment: job.department
      }
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
