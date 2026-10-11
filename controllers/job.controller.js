const { jobRepo, applicantRepo } = require('../models/store');
const { analyzeMatch } = require('../services/matchingEngine.service');

// Create a new job posting
exports.createJob = async (req, res, next) => {
  try {
    const {
      title,
      department,
      location,
      employmentType,
      description,
      requiredSkills,
      preferredSkills,
      minExperience,
      education,
      weights,
      status
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Job title and description are required.'
      });
    }

    // Process skills arrays
    let parsedRequiredSkills = [];
    if (Array.isArray(requiredSkills)) {
      parsedRequiredSkills = requiredSkills.map(s => s.trim()).filter(Boolean);
    } else if (typeof requiredSkills === 'string') {
      parsedRequiredSkills = requiredSkills.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (parsedRequiredSkills.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one required skill.'
      });
    }

    let parsedPreferredSkills = [];
    if (Array.isArray(preferredSkills)) {
      parsedPreferredSkills = preferredSkills.map(s => s.trim()).filter(Boolean);
    } else if (typeof preferredSkills === 'string') {
      parsedPreferredSkills = preferredSkills.split(',').map(s => s.trim()).filter(Boolean);
    }

    const job = await jobRepo.create({
      title,
      department: department || 'Engineering',
      location: location || 'Remote',
      employmentType: employmentType || 'Full-time',
      description,
      requiredSkills: parsedRequiredSkills,
      preferredSkills: parsedPreferredSkills,
      minExperience: Number(minExperience) || 0,
      education: education || 'Bachelor',
      weights: {
        skills: Number(weights?.skills ?? 40),
        similarity: Number(weights?.similarity ?? 30),
        experience: Number(weights?.experience ?? 20),
        education: Number(weights?.education ?? 10)
      },
      status: status || 'Active',
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Job posting created successfully.',
      job
    });
  } catch (error) {
    next(error);
  }
};

// Get all jobs with applicant metrics
exports.getJobs = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status && status !== 'All') {
      filter.status = status;
    }

    let jobs = await jobRepo.find(filter);

    if (search) {
      const q = search.toLowerCase();
      jobs = jobs.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.department.toLowerCase().includes(q) ||
        (j.requiredSkills && j.requiredSkills.some(s => s.toLowerCase().includes(q)))
      );
    }

    // Attach applicant metrics to each job
    const allApplicants = await applicantRepo.find({});
    const jobsWithMetrics = jobs.map(job => {
      const jobApps = allApplicants.filter(a =>
        (a.jobId?._id?.toString() || a.jobId?.toString()) === job._id.toString()
      );

      const applicantCount = jobApps.length;
      const shortlistedCount = jobApps.filter(a => a.status === 'Shortlisted').length;
      const avgScore = applicantCount > 0
        ? Math.round(
            (jobApps.reduce((acc, a) => acc + (a.matchAnalysis?.overallScore || 0), 0) / applicantCount) * 10
          ) / 10
        : 0;

      const topScore = applicantCount > 0
        ? Math.max(...jobApps.map(a => a.matchAnalysis?.overallScore || 0))
        : 0;

      return {
        ...((job.toObject ? job.toObject() : job)),
        applicantCount,
        shortlistedCount,
        avgScore,
        topScore
      };
    });

    res.json({
      success: true,
      count: jobsWithMetrics.length,
      jobs: jobsWithMetrics
    });
  } catch (error) {
    next(error);
  }
};

// Get single job by ID with its ranked applicants
exports.getJobById = async (req, res, next) => {
  try {
    const job = await jobRepo.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.'
      });
    }

    const applicants = await applicantRepo.find({ jobId: job._id });

    res.json({
      success: true,
      job: (job.toObject ? job.toObject() : job),
      applicants
    });
  } catch (error) {
    next(error);
  }
};

// Update an existing job
exports.updateJob = async (req, res, next) => {
  try {
    const {
      title,
      department,
      location,
      employmentType,
      description,
      requiredSkills,
      preferredSkills,
      minExperience,
      education,
      weights,
      status,
      rescoreApplicants
    } = req.body;

    let updateData = {};
    if (title) updateData.title = title;
    if (department !== undefined) updateData.department = department;
    if (location !== undefined) updateData.location = location;
    if (employmentType !== undefined) updateData.employmentType = employmentType;
    if (description) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (minExperience !== undefined) updateData.minExperience = Number(minExperience);
    if (education !== undefined) updateData.education = education;

    if (requiredSkills !== undefined) {
      if (Array.isArray(requiredSkills)) {
        updateData.requiredSkills = requiredSkills.map(s => s.trim()).filter(Boolean);
      } else if (typeof requiredSkills === 'string') {
        updateData.requiredSkills = requiredSkills.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    if (preferredSkills !== undefined) {
      if (Array.isArray(preferredSkills)) {
        updateData.preferredSkills = preferredSkills.map(s => s.trim()).filter(Boolean);
      } else if (typeof preferredSkills === 'string') {
        updateData.preferredSkills = preferredSkills.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    if (weights) {
      updateData.weights = {
        skills: Number(weights.skills ?? 40),
        similarity: Number(weights.similarity ?? 30),
        experience: Number(weights.experience ?? 20),
        education: Number(weights.education ?? 10)
      };
    }

    const updatedJob = await jobRepo.findByIdAndUpdate(req.params.id, updateData);
    if (!updatedJob) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.'
      });
    }

    // Re-score existing applicants if requested or if requirements/weights changed
    let rescoredCount = 0;
    if (rescoreApplicants !== false) {
      const applicants = await applicantRepo.find({ jobId: updatedJob._id });
      for (const app of applicants) {
        if (app.extractedText) {
          const newAnalysis = analyzeMatch(
            updatedJob,
            app.extractedData,
            app.extractedText
          );
          await applicantRepo.findByIdAndUpdate(app._id, { matchAnalysis: newAnalysis });
          rescoredCount++;
        }
      }
    }

    res.json({
      success: true,
      message: `Job updated successfully.${rescoredCount > 0 ? ` Re-evaluated ${rescoredCount} applicants.` : ''}`,
      job: updatedJob,
      rescoredCount
    });
  } catch (error) {
    next(error);
  }
};

// Delete job and all its applicants
exports.deleteJob = async (req, res, next) => {
  try {
    const job = await jobRepo.findByIdAndDelete(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.'
      });
    }

    res.json({
      success: true,
      message: 'Job posting and associated applicants were deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};
