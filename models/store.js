const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./User');
const Job = require('./Job');
const Applicant = require('./Applicant');

// In-Memory store fallback in case local MongoDB is offline
const memoryStore = {
  users: [],
  jobs: [],
  applicants: []
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
    const user = {
      _id: generateId(),
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
    if (filter.status) {
      list = list.filter(j => j.status === filter.status);
    }
    if (filter.createdBy) {
      list = list.filter(j => j.createdBy && j.createdBy.toString() === filter.createdBy.toString());
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async findById(id) {
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
    // Also remove associated applicants
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
    if (filter.jobId) {
      list = list.filter(a => a.jobId.toString() === filter.jobId.toString());
    }
    if (filter.status) {
      list = list.filter(a => a.status === filter.status);
    }
    // Attach job minimal info
    list = list.map(app => {
      const job = memoryStore.jobs.find(j => j._id.toString() === app.jobId?.toString());
      return {
        ...app,
        jobId: job ? { _id: job._id, title: job.title, department: job.department, weights: job.weights } : app.jobId
      };
    });
    return list.sort((a, b) => (b.matchAnalysis?.overallScore || 0) - (a.matchAnalysis?.overallScore || 0));
  },

  async findById(id) {
    if (isMongoActive()) {
      return await Applicant.findById(id).populate('jobId');
    }
    const app = memoryStore.applicants.find(a => a._id.toString() === id.toString());
    if (!app) return null;
    const job = memoryStore.jobs.find(j => j._id.toString() === app.jobId?.toString());
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
      list = list.filter(a => a.jobId.toString() === filter.jobId.toString());
    }
    if (filter.status) {
      list = list.filter(a => a.status === filter.status);
    }
    return list.length;
  }
};

module.exports = {
  isMongoActive,
  userRepo,
  jobRepo,
  applicantRepo,
  memoryStore
};
