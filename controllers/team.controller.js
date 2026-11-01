const { teamRepo } = require('../models/store');

/**
 * GET /api/team
 * Retrieves team members and organization capacity
 */
exports.getTeamMembers = async (req, res, next) => {
  try {
    const { search, role } = req.query;
    const filter = {};
    if (role && role !== 'All') {
      filter.role = role;
    }

    let list = await teamRepo.find(filter);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(m =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.role && m.role.toLowerCase().includes(q))
      );
    }

    return res.json({
      success: true,
      count: list.length,
      team: list,
      organization: {
        name: 'TechCorp Technologies',
        plan: 'Enterprise Recruiter Suite',
        seatsUsed: list.length,
        seatsTotal: 15
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/team/invite
 * Invites a new team member
 */
exports.inviteMember = async (req, res, next) => {
  try {
    const { name, email, role, accessScope } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Member full name and work email are required.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await teamRepo.findByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A team member with this email already exists in your organization.'
      });
    }

    const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    const avatarBg = colors[Math.floor(Math.random() * colors.length)];

    const newMember = await teamRepo.create({
      name: name.trim(),
      email: cleanEmail,
      role: role || 'Interviewer',
      accessScope: accessScope || 'View Candidates, Interviews',
      status: 'Active',
      lastActive: 'Invited just now',
      avatarBg,
      invitedBy: req.user?._id,
      organization: 'TechCorp Technologies'
    });

    return res.status(201).json({
      success: true,
      message: `Invitation successfully sent to ${newMember.email}.`,
      member: newMember
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/team/:id
 * Removes a team member
 */
exports.removeMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const member = await teamRepo.findById(id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found.'
      });
    }

    if (member.role === 'Super Admin') {
      return res.status(400).json({
        success: false,
        message: 'The Super Admin account cannot be removed.'
      });
    }

    const removed = await teamRepo.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: `${removed.name} was removed from the organization.`,
      member: removed
    });
  } catch (error) {
    next(error);
  }
};
