const { settingsRepo } = require('../models/store');

/**
 * GET /api/settings
 * Retrieves application and recruiter settings
 */
exports.getSettings = async (req, res, next) => {
  try {
    const doc = await settingsRepo.getSettings(req.user?._id);

    // Merge active user name and email from session
    const currentName = req.user?.name || doc.profile?.fullName || 'Suhas';
    const currentEmail = req.user?.email || doc.profile?.email || 'recruiter@demo.com';

    const settingsPayload = {
      ...doc,
      profile: {
        ...(doc.profile || {}),
        fullName: currentName,
        email: currentEmail
      }
    };

    return res.json({
      success: true,
      settings: settingsPayload,
      profile: settingsPayload.profile,
      organization: settingsPayload.organization,
      nlpMatching: settingsPayload.nlpMatching,
      notifications: settingsPayload.notifications,
      security: settingsPayload.security
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/settings
 * Updates recruiter profile, organization preferences, and NLP screening weights
 */
exports.updateSettings = async (req, res, next) => {
  try {
    const { profile, organization, nlpMatching, notifications, security } = req.body;

    const updateData = {};
    if (profile) updateData.profile = profile;
    if (organization) updateData.organization = organization;
    if (nlpMatching) updateData.nlpMatching = nlpMatching;
    if (notifications) updateData.notifications = notifications;
    if (security) updateData.security = security;

    const saved = await settingsRepo.updateSettings(updateData);

    return res.json({
      success: true,
      message: 'Preferences and AI screening parameters updated successfully.',
      settings: saved,
      organization: saved.organization,
      profile: saved.profile,
      nlpMatching: saved.nlpMatching
    });
  } catch (error) {
    next(error);
  }
};
