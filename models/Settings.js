const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    sparse: true
  },
  profile: {
    fullName: { type: String, default: 'Suhas' },
    title: { type: String, default: 'Senior Talent Lead' },
    email: { type: String, default: 'recruiter@demo.com' },
    phone: { type: String, default: '+91 98765 43210' },
    location: { type: String, default: 'Hyderabad, India' },
    timezone: { type: String, default: 'Asia/Kolkata (IST)' },
    bio: { type: String, default: 'Lead talent acquisition and AI-powered applicant screening architect at TechCorp Technologies.' }
  },
  organization: {
    name: { type: String, default: 'TechCorp Technologies' },
    domain: { type: String, default: 'techcorp.com' },
    industry: { type: String, default: 'Enterprise Software & Cloud Platforms' },
    headquarters: { type: String, default: 'San Francisco, CA / Bengaluru, IN' },
    plan: { type: String, default: 'Enterprise Recruiter Tier' },
    totalSeats: { type: Number, default: 15 }
  },
  nlpMatching: {
    defaultSkillsWeight: { type: Number, default: 40, min: 0, max: 100 },
    defaultSimilarityWeight: { type: Number, default: 30, min: 0, max: 100 },
    defaultExperienceWeight: { type: Number, default: 20, min: 0, max: 100 },
    defaultEducationWeight: { type: Number, default: 10, min: 0, max: 100 },
    autoShortlistThreshold: { type: Number, default: 75, min: 0, max: 100 },
    enableSemanticSynonyms: { type: Boolean, default: true },
    enableBenchmarkMatching: { type: Boolean, default: true }
  },
  notifications: {
    emailOnNewApplication: { type: Boolean, default: true },
    emailOnHighMatchScore: { type: Boolean, default: true },
    weeklyHiringDigest: { type: Boolean, default: true },
    interviewReminders: { type: Boolean, default: true }
  },
  security: {
    twoFactorEnabled: { type: Boolean, default: false },
    sessionTimeoutMinutes: { type: Number, default: 60 },
    ipAllowlistEnabled: { type: Boolean, default: false }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

settingsSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);
