const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./User');
const Job = require('./Job');
const Applicant = require('./Applicant');
const Interview = require('./Interview');
const Team = require('./Team');
const Settings = require('./Settings');

// Default initial seeds for memoryStore
const INITIAL_INTERVIEWS = [
  {
    _id: '65f000000000000000000101',
    candidateName: 'Priya Sharma',
    candidateEmail: 'priya.sharma.ai@outlook.com',
    role: 'Lead NLP & Machine Learning Engineer',
    department: 'AI & Data Science',
    date: '2026-11-05',
    time: '10:00 AM - 11:00 AM',
    type: 'Technical Round',
    interviewer: 'Suhas',
    status: 'Scheduled',
    score: 83.3,
    meetingLink: 'https://meet.google.com/iq-nlp-round1',
    notes: 'Focus on NLP embeddings and transformer fine-tuning depth.',
    organization: 'TechCorp Technologies',
    createdAt: new Date('2026-11-01T08:00:00Z')
  },
  {
    _id: '65f000000000000000000102',
    candidateName: 'David Kim',
    candidateEmail: 'david.kim.frontend@yahoo.com',
    role: 'Junior Frontend Developer (AngularJS & Web UI)',
    department: 'Design & UX',
    date: '2026-11-06',
    time: '2:30 PM - 3:30 PM',
    type: 'Behavioral',
    interviewer: 'Neha Reddy',
    status: 'Scheduled',
    score: 79.8,
    meetingLink: 'https://meet.google.com/iq-culture-fit',
    notes: 'Culture fit, team collaboration and design system comprehension.',
    organization: 'TechCorp Technologies',
    createdAt: new Date('2026-11-01T08:30:00Z')
  },
  {
    _id: '65f000000000000000000103',
    candidateName: 'Casey Kim',
    candidateEmail: 'casey.kim.r_001348@synthetic-talent.io',
    role: 'Software Engineer (Travel)',
    department: 'Engineering',
    date: '2026-11-08',
    time: '11:00 AM - 12:00 PM',
    type: 'Technical Round',
    interviewer: 'Suhas',
    status: 'Scheduled',
    score: 79.5,
    meetingLink: 'https://meet.google.com/iq-eng-round2',
    notes: 'Distributed systems and API latency evaluation.',
    organization: 'TechCorp Technologies',
    createdAt: new Date('2026-11-01T09:00:00Z')
  },
  {
    _id: '65f000000000000000000104',
    candidateName: 'Alex Morgan',
    candidateEmail: 'alex.morgan.dev@gmail.com',
    role: 'Senior Full Stack Engineer (MERN)',
    department: 'Platform Engineering',
    date: '2026-11-10',
    time: '3:30 PM - 4:30 PM',
    type: 'Management',
    interviewer: 'Ravin Kumar',
    status: 'Scheduled',
    score: 78.9,
    meetingLink: 'https://meet.google.com/iq-mgmt-round',
    notes: 'Architectural leadership and full-stack system scalability.',
    organization: 'TechCorp Technologies',
    createdAt: new Date('2026-11-01T09:30:00Z')
  }
];

const INITIAL_TEAM = [
  {
    _id: '65f000000000000000000201',
    name: 'Suhas (You)',
    email: 'suhas@techcorp.com',
    role: 'Super Admin',
    accessScope: 'Full Access (All Modules)',
    status: 'Active',
    lastActive: 'Just now',
    avatarBg: '#6366f1',
    organization: 'TechCorp Technologies',
    createdAt: new Date('2026-11-01T08:00:00Z')
  },
  {
    _id: '65f000000000000000000202',
    name: 'Neha Reddy',
    email: 'neha.reddy@techcorp.com',
    role: 'Hiring Manager',
    accessScope: 'Manage Jobs, Candidates',
    status: 'Active',
    lastActive: '2 hours ago',
    avatarBg: '#06b6d4',
    organization: 'TechCorp Technologies',
    createdAt: new Date('2026-11-01T08:15:00Z')
  },
  {
    _id: '65f000000000000000000203',
    name: 'Ravin Kumar',
    email: 'ravin.kumar@techcorp.com',
    role: 'Interviewer',
    accessScope: 'View Candidates, Interviews',
    status: 'Active',
    lastActive: 'Yesterday',
    avatarBg: '#ec4899',
    organization: 'TechCorp Technologies',
    createdAt: new Date('2026-11-01T08:30:00Z')
  },
  {
    _id: '65f000000000000000000204',
    name: 'Ananya Iyer',
    email: 'ananya.iyer@techcorp.com',
    role: 'Technical Lead',
    accessScope: 'Candidate Evaluation & Scoring',
    status: 'Active',
    lastActive: '3 days ago',
    avatarBg: '#8b5cf6',
    organization: 'TechCorp Technologies',
    createdAt: new Date('2026-11-01T08:45:00Z')
  }
];

const INITIAL_SETTINGS = {
  _id: '65f000000000000000000301',
  profile: {
    fullName: 'Suhas',
    title: 'Senior Talent Lead',
    email: 'recruiter@demo.com',
    phone: '+91 98765 43210',
    location: 'Hyderabad, India',
    timezone: 'Asia/Kolkata (IST)',
    bio: 'Lead talent acquisition and AI-powered applicant screening architect at TechCorp Technologies.'
  },
  organization: {
    name: 'TechCorp Technologies',
    domain: 'techcorp.com',
    industry: 'Enterprise Software & Cloud Platforms',
    headquarters: 'San Francisco, CA / Bengaluru, IN',
    plan: 'Enterprise Recruiter Tier',
    totalSeats: 15
  },
  nlpMatching: {
    defaultSkillsWeight: 40,
    defaultSimilarityWeight: 30,
    defaultExperienceWeight: 20,
    defaultEducationWeight: 10,
    autoShortlistThreshold: 75,
    enableSemanticSynonyms: true,
    enableBenchmarkMatching: true
  },
  notifications: {
    emailOnNewApplication: true,
    emailOnHighMatchScore: true,
    weeklyHiringDigest: true,
    interviewReminders: true
  },
  security: {
    twoFactorEnabled: false,
    sessionTimeoutMinutes: 60,
    ipAllowlistEnabled: false
  }
};

// In-Memory store fallback in case local MongoDB is offline
const memoryStore = {
  users: [],
  jobs: [],
  applicants: [],
  interviews: [...INITIAL_INTERVIEWS],
  teamMembers: [...INITIAL_TEAM],
  settings: { ...INITIAL_SETTINGS }
};

function generateId() {
  return new mongoose.Types.ObjectId().toString();
}

const isMongoActive = () => {
  return mongoose.connection && mongoose.connection.readyState === 1;
};

// ---------------- USER OPERATIONS ----------------
const userRepo = {
  async findByEmail(email) {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();
    if (isMongoActive()) {
      return await User.findOne({ email: normalized });
    }
    const found = memoryStore.users.find(u => u.email.toLowerCase() === normalized);
    if (!found) return null;
    return {
      ...found,
      comparePassword: async (pwd) => found.password ? await bcrypt.compare(pwd, found.password) : false
    };
  },

  async findByGoogleId(googleId) {
    if (!googleId) return null;
    if (isMongoActive()) {
      return await User.findOne({ googleId });
    }
    const found = memoryStore.users.find(u => u.googleId === googleId);
    if (!found) return null;
    return {
      ...found,
      comparePassword: async (pwd) => found.password ? await bcrypt.compare(pwd, found.password) : false
    };
  },

  async findByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = phone.trim();
    if (isMongoActive()) {
      return await User.findOne({ phone: cleanPhone });
    }
    const found = memoryStore.users.find(u => u.phone && u.phone.trim() === cleanPhone);
    if (!found) return null;
    return {
      ...found,
      comparePassword: async (pwd) => found.password ? await bcrypt.compare(pwd, found.password) : false
    };
  },

  async findById(id) {
    if (!id) return null;
    if (isMongoActive()) {
      return await User.findById(id).select('-password');
    }
    const found = memoryStore.users.find(u => u._id.toString() === id.toString());
    if (!found) return null;
    const { password, ...rest } = found;
    return rest;
  },

  async create(userData) {
    if (isMongoActive()) {
      return await User.create(userData);
    }
    let hashedPassword = null;
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(userData.password, salt);
    }

    // Deterministic ID for demo users so restarts do not invalidate sessions
    let assignedId = generateId();
    if (userData.email && userData.email.toLowerCase() === 'recruiter@demo.com') {
      assignedId = '65f000000000000000000001';
    } else if (userData.email && userData.email.toLowerCase() === 'manisuhas23@gmail.com') {
      assignedId = '65f000000000000000000002';
    }

    const user = {
      _id: assignedId,
      name: userData.name,
      email: userData.email.toLowerCase().trim(),
      password: hashedPassword,
      phone: userData.phone || '',
      company: userData.company || 'Talent Acquisition Team',
      role: userData.role || 'recruiter',
      authProvider: userData.authProvider || 'local',
      googleId: userData.googleId || null,
      avatar: userData.avatar || null,
      createdAt: new Date()
    };
    memoryStore.users.push(user);
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      company: user.company,
      role: user.role,
      authProvider: user.authProvider,
      googleId: user.googleId,
      avatar: user.avatar,
      createdAt: user.createdAt
    };
  },

  async findByIdAndUpdate(id, updateData) {
    if (isMongoActive()) {
      return await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    }
    const index = memoryStore.users.findIndex(u => u._id.toString() === id.toString());
    if (index === -1) return null;
    let finalUpdate = { ...updateData };
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      finalUpdate.password = await bcrypt.hash(updateData.password, salt);
    }
    const updated = {
      ...memoryStore.users[index],
      ...finalUpdate,
      updatedAt: new Date()
    };
    memoryStore.users[index] = updated;
    const { password, ...rest } = updated;
    return rest;
  }
};

// ---------------- JOB OPERATIONS ----------------
const jobRepo = {
  async find(filter = {}) {
    if (isMongoActive()) {
      return await Job.find(filter).sort({ createdAt: -1 }).populate('createdBy', 'name email');
    }
    let list = [...memoryStore.jobs];
    if (filter.status && filter.status !== 'All') {
      list = list.filter(j => j.status === filter.status);
    }
    if (filter.createdBy) {
      list = list.filter(j => j.createdBy && j.createdBy.toString() === filter.createdBy.toString());
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async findById(id) {
    if (!id) return null;
    if (isMongoActive()) {
      return await Job.findById(id).populate('createdBy', 'name email');
    }
    return memoryStore.jobs.find(j => j._id.toString() === id.toString()) || null;
  },

  async create(jobData) {
    if (isMongoActive()) {
      return await Job.create(jobData);
    }
    const newJob = {
      _id: generateId(),
      ...jobData,
      weights: {
        skills: Number(jobData.weights?.skills ?? 40),
        similarity: Number(jobData.weights?.similarity ?? 30),
        experience: Number(jobData.weights?.experience ?? 20),
        education: Number(jobData.weights?.education ?? 10)
      },
      status: jobData.status || 'Active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryStore.jobs.unshift(newJob);
    return newJob;
  },

  async findByIdAndUpdate(id, updateData) {
    if (isMongoActive()) {
      return await Job.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    }
    const index = memoryStore.jobs.findIndex(j => j._id.toString() === id.toString());
    if (index === -1) return null;
    const updated = {
      ...memoryStore.jobs[index],
      ...updateData,
      weights: {
        ...memoryStore.jobs[index].weights,
        ...(updateData.weights || {})
      },
      updatedAt: new Date()
    };
    memoryStore.jobs[index] = updated;
    return updated;
  },

  async findByIdAndDelete(id) {
    if (isMongoActive()) {
      return await Job.findByIdAndDelete(id);
    }
    const index = memoryStore.jobs.findIndex(j => j._id.toString() === id.toString());
    if (index === -1) return null;
    const deleted = memoryStore.jobs.splice(index, 1)[0];
    memoryStore.applicants = memoryStore.applicants.filter(a => a.jobId.toString() !== id.toString());
    return deleted;
  }
};

// ---------------- APPLICANT OPERATIONS ----------------
const applicantRepo = {
  async find(filter = {}) {
    if (isMongoActive()) {
      return await Applicant.find(filter).sort({ 'matchAnalysis.overallScore': -1 }).populate('jobId', 'title department weights');
    }
    let list = [...memoryStore.applicants];
    if (filter.jobId && filter.jobId !== 'All') {
      list = list.filter(a => (a.jobId?._id || a.jobId).toString() === filter.jobId.toString());
    }
    if (filter.status && filter.status !== 'All') {
      list = list.filter(a => a.status === filter.status);
    }
    list = list.map(app => {
      const job = memoryStore.jobs.find(j => j._id.toString() === (app.jobId?._id || app.jobId)?.toString());
      return {
        ...app,
        jobId: job ? { _id: job._id, title: job.title, department: job.department, weights: job.weights } : app.jobId
      };
    });
    return list.sort((a, b) => (b.matchAnalysis?.overallScore || 0) - (a.matchAnalysis?.overallScore || 0));
  },

  async findOne(filter = {}) {
    if (isMongoActive()) {
      return await Applicant.findOne(filter).populate('jobId');
    }
    const list = await this.find(filter);
    if (!list || list.length === 0) return null;
    if (filter['resumeFile.originalName']) {
      return list.find(a => a.resumeFile?.originalName === filter['resumeFile.originalName']) || null;
    }
    if (filter.email) {
      return list.find(a => a.email && a.email.toLowerCase() === filter.email.toLowerCase()) || null;
    }
    return list[0] || null;
  },

  async update(id, updateData) {
    return await this.findByIdAndUpdate(id, updateData);
  },

  async findById(id) {
    if (!id) return null;
    if (isMongoActive()) {
      return await Applicant.findById(id).populate('jobId');
    }
    const app = memoryStore.applicants.find(a => a._id.toString() === id.toString());
    if (!app) return null;
    const job = memoryStore.jobs.find(j => j._id.toString() === (app.jobId?._id || app.jobId)?.toString());
    return {
      ...app,
      jobId: job || app.jobId
    };
  },

  async create(appData) {
    if (isMongoActive()) {
      return await Applicant.create(appData);
    }
    const newApp = {
      _id: generateId(),
      ...appData,
      status: appData.status || 'New',
      recruiterNotes: appData.recruiterNotes || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryStore.applicants.unshift(newApp);
    return newApp;
  },

  async findByIdAndUpdate(id, updateData) {
    if (isMongoActive()) {
      return await Applicant.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    }
    const index = memoryStore.applicants.findIndex(a => a._id.toString() === id.toString());
    if (index === -1) return null;
    const updated = {
      ...memoryStore.applicants[index],
      ...updateData,
      updatedAt: new Date()
    };
    memoryStore.applicants[index] = updated;
    return updated;
  },

  async findByIdAndDelete(id) {
    if (isMongoActive()) {
      return await Applicant.findByIdAndDelete(id);
    }
    const index = memoryStore.applicants.findIndex(a => a._id.toString() === id.toString());
    if (index === -1) return null;
    return memoryStore.applicants.splice(index, 1)[0];
  },

  async countDocuments(filter = {}) {
    if (isMongoActive()) {
      return await Applicant.countDocuments(filter);
    }
    let list = [...memoryStore.applicants];
    if (filter.jobId) {
      list = list.filter(a => (a.jobId?._id || a.jobId).toString() === filter.jobId.toString());
    }
    if (filter.status) {
      list = list.filter(a => a.status === filter.status);
    }
    return list.length;
  }
};

// ---------------- INTERVIEW OPERATIONS ----------------
const interviewRepo = {
  async find(filter = {}) {
    if (isMongoActive()) {
      const q = {};
      if (filter.status && filter.status !== 'All') q.status = filter.status;
      if (filter.type && filter.type !== 'All') q.type = filter.type;
      if (filter.date) q.date = filter.date;
      if (filter.organization) q.organization = filter.organization;
      return await Interview.find(q).sort({ date: 1, time: 1 });
    }
    let list = [...memoryStore.interviews];
    if (filter.status && filter.status !== 'All') {
      list = list.filter(i => i.status === filter.status);
    }
    if (filter.type && filter.type !== 'All') {
      list = list.filter(i => i.type === filter.type);
    }
    if (filter.date) {
      list = list.filter(i => i.date === filter.date);
    }
    if (filter.organization) {
      list = list.filter(i => i.organization === filter.organization);
    }
    return list.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));
  },

  async findById(id) {
    if (!id) return null;
    if (isMongoActive()) {
      return await Interview.findById(id);
    }
    return memoryStore.interviews.find(i => i._id.toString() === id.toString()) || null;
  },

  async create(interviewData) {
    if (isMongoActive()) {
      return await Interview.create(interviewData);
    }
    const newInterview = {
      _id: generateId(),
      status: 'Scheduled',
      score: 0,
      notes: '',
      meetingLink: 'https://meet.google.com/iq-' + Math.random().toString(36).substring(7),
      organization: 'TechCorp Technologies',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...interviewData
    };
    memoryStore.interviews.unshift(newInterview);
    return newInterview;
  },

  async findByIdAndUpdate(id, updateData) {
    if (isMongoActive()) {
      return await Interview.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    }
    const index = memoryStore.interviews.findIndex(i => i._id.toString() === id.toString());
    if (index === -1) return null;
    const updated = {
      ...memoryStore.interviews[index],
      ...updateData,
      updatedAt: new Date()
    };
    memoryStore.interviews[index] = updated;
    return updated;
  },

  async findByIdAndDelete(id) {
    if (isMongoActive()) {
      return await Interview.findByIdAndDelete(id);
    }
    const index = memoryStore.interviews.findIndex(i => i._id.toString() === id.toString());
    if (index === -1) return null;
    return memoryStore.interviews.splice(index, 1)[0];
  }
};

// ---------------- TEAM OPERATIONS ----------------
const teamRepo = {
  async find(filter = {}) {
    if (isMongoActive()) {
      const q = {};
      if (filter.role && filter.role !== 'All') q.role = filter.role;
      if (filter.status) q.status = filter.status;
      return await Team.find(q).sort({ createdAt: 1 });
    }
    let list = [...memoryStore.teamMembers];
    if (filter.role && filter.role !== 'All') {
      list = list.filter(m => m.role === filter.role);
    }
    if (filter.status) {
      list = list.filter(m => m.status === filter.status);
    }
    return list;
  },

  async findByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();
    if (isMongoActive()) {
      return await Team.findOne({ email: cleanEmail });
    }
    return memoryStore.teamMembers.find(m => m.email.toLowerCase() === cleanEmail) || null;
  },

  async findById(id) {
    if (!id) return null;
    if (isMongoActive()) {
      return await Team.findById(id);
    }
    return memoryStore.teamMembers.find(m => m._id.toString() === id.toString()) || null;
  },

  async create(memberData) {
    if (isMongoActive()) {
      return await Team.create(memberData);
    }
    const newMember = {
      _id: generateId(),
      status: 'Active',
      lastActive: 'Invited just now',
      organization: 'TechCorp Technologies',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...memberData
    };
    memoryStore.teamMembers.push(newMember);
    return newMember;
  },

  async findByIdAndDelete(id) {
    if (isMongoActive()) {
      return await Team.findByIdAndDelete(id);
    }
    const index = memoryStore.teamMembers.findIndex(m => m._id.toString() === id.toString());
    if (index === -1) return null;
    return memoryStore.teamMembers.splice(index, 1)[0];
  }
};

// ---------------- SETTINGS OPERATIONS ----------------
const settingsRepo = {
  async getSettings(recruiterId) {
    if (isMongoActive()) {
      let doc = await Settings.findOne();
      if (!doc) {
        doc = await Settings.create(INITIAL_SETTINGS);
      }
      return doc;
    }
    return memoryStore.settings;
  },

  async updateSettings(updateData) {
    if (isMongoActive()) {
      let doc = await Settings.findOne();
      if (!doc) {
        return await Settings.create({ ...INITIAL_SETTINGS, ...updateData });
      }
      Object.assign(doc, updateData);
      doc.updatedAt = new Date();
      return await doc.save();
    }
    memoryStore.settings = {
      ...memoryStore.settings,
      ...updateData,
      profile: { ...(memoryStore.settings.profile || {}), ...(updateData.profile || {}) },
      organization: { ...(memoryStore.settings.organization || {}), ...(updateData.organization || {}) },
      nlpMatching: { ...(memoryStore.settings.nlpMatching || {}), ...(updateData.nlpMatching || {}) },
      notifications: { ...(memoryStore.settings.notifications || {}), ...(updateData.notifications || {}) },
      security: { ...(memoryStore.settings.security || {}), ...(updateData.security || {}) },
      updatedAt: new Date()
    };
    return memoryStore.settings;
  }
};

module.exports = {
  isMongoActive,
  userRepo,
  jobRepo,
  applicantRepo,
  interviewRepo,
  teamRepo,
  settingsRepo,
  memoryStore
};
