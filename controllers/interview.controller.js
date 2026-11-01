const { interviewRepo } = require('../models/store');

/**
 * GET /api/interviews
 * Retrieves all scheduled interviews with optional filtering by status, round type, date, or search term
 */
exports.getInterviews = async (req, res, next) => {
  try {
    const { status, type, date, search } = req.query;
    const filter = {};

    if (status && status !== 'All') {
      filter.status = status;
    }
    if (type && type !== 'All') {
      filter.type = type;
    }
    if (date) {
      filter.date = date;
    }

    let list = await interviewRepo.find(filter);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(i =>
        (i.candidateName && i.candidateName.toLowerCase().includes(q)) ||
        (i.role && i.role.toLowerCase().includes(q)) ||
        (i.type && i.type.toLowerCase().includes(q)) ||
        (i.interviewer && i.interviewer.toLowerCase().includes(q))
      );
    }

    return res.json({
      success: true,
      count: list.length,
      interviews: list
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/interviews
 * Schedules a new candidate interview round
 */
exports.scheduleInterview = async (req, res, next) => {
  try {
    const {
      candidateName,
      candidateEmail,
      role,
      department,
      date,
      time,
      type,
      interviewer,
      notes,
      applicantId,
      jobId
    } = req.body;

    if (!candidateName || !role || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Candidate name, position, interview date, and time slot are required.'
      });
    }

    const meetingLink = 'https://meet.google.com/iq-' + Math.random().toString(36).substring(2, 8);

    const interview = await interviewRepo.create({
      candidateName: candidateName.trim(),
      candidateEmail: (candidateEmail || 'candidate@talent.iq').trim(),
      role: role.trim(),
      department: department || 'Engineering',
      date,
      time,
      type: type || 'Technical Round',
      interviewer: interviewer || req.user?.name || 'Suhas',
      status: 'Scheduled',
      score: 0,
      notes: notes || '',
      meetingLink,
      createdBy: req.user?._id,
      applicantId: applicantId || undefined,
      jobId: jobId || undefined,
      organization: 'TechCorp Technologies'
    });

    return res.status(201).json({
      success: true,
      message: `Interview successfully scheduled for ${interview.candidateName}.`,
      interview
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/interviews/:id/reschedule
 * Updates the date, time, and status of an existing interview
 */
exports.rescheduleInterview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, time, reason } = req.body;

    const existing = await interviewRepo.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled interview record not found.'
      });
    }

    const updateFields = { status: req.body.status || 'Rescheduled' };
    if (date) updateFields.date = date;
    if (time) updateFields.time = time;
    if (req.body.type) updateFields.type = req.body.type;
    if (reason) updateFields.notes = (existing.notes ? existing.notes + ' | ' : '') + `Rescheduled: ${reason}`;

    const updated = await interviewRepo.findByIdAndUpdate(id, updateFields);

    return res.json({
      success: true,
      message: 'Interview successfully rescheduled.',
      interview: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/interviews/:id
 * Cancels or removes an interview
 */
exports.cancelInterview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await interviewRepo.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled interview record not found.'
      });
    }

    const removed = await interviewRepo.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: `Interview for ${removed.candidateName} cancelled.`,
      interview: removed
    });
  } catch (error) {
    next(error);
  }
};
