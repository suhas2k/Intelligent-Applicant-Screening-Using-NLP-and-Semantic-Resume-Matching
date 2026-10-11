const { jobRepo, applicantRepo, isMongoActive } = require('../models/store');
const { getDBStatus } = require('../config/db');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const jobs = await jobRepo.find({});
    const applicants = await applicantRepo.find({});

    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => j.status === 'Active').length;
    const totalApplicants = applicants.length;

    // Status counts
    const statusCounts = {
      New: applicants.filter(a => a.status === 'New').length,
      Reviewed: applicants.filter(a => a.status === 'Reviewed').length,
      Shortlisted: applicants.filter(a => a.status === 'Shortlisted').length,
      Rejected: applicants.filter(a => a.status === 'Rejected').length
    };

    // Score stats
    const avgScore = totalApplicants > 0
      ? Math.round((applicants.reduce((acc, a) => acc + (a.matchAnalysis?.overallScore || 0), 0) / totalApplicants) * 10) / 10
      : 0;

    const highScoreCount = applicants.filter(a => (a.matchAnalysis?.overallScore || 0) >= 75).length;

    // Top matching candidates (top 6)
    const topApplicants = [...applicants]
      .sort((a, b) => (b.matchAnalysis?.overallScore || 0) - (a.matchAnalysis?.overallScore || 0))
      .slice(0, 6);

    // Recent jobs
    const recentJobs = [...jobs].slice(0, 5);

    // Skill frequency across jobs
    const skillCounts = {};
    jobs.forEach(j => {
      (j.requiredSkills || []).forEach(s => {
        skillCounts[s] = (skillCounts[s] || 0) + 1;
      });
    });
    const topRequestedSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    res.json({
      success: true,
      stats: {
        totalJobs,
        activeJobs,
        totalApplicants,
        statusCounts,
        avgScore,
        highScoreCount,
        topRequestedSkills
      },
      topApplicants,
      recentJobs,
      database: {
        ...getDBStatus(),
        mode: isMongoActive() ? 'Live MongoDB' : 'In-Memory / Fallback Storage'
      }
    });
  } catch (error) {
    next(error);
  }
};
