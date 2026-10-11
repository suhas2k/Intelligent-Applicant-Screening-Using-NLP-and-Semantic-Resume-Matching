const mongoose = require('mongoose');

const applicantSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job reference is required'],
    index: true
  },
  fullName: {
    type: String,
    required: [true, 'Applicant name is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },
  resumeFile: {
    originalName: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true }
  },
  extractedText: {
    type: String,
    default: ''
  },
  extractedData: {
    skills: { type: [String], default: [] },
    experienceYears: { type: Number, default: 0 },
    educationLevel: { type: String, default: 'Not specified' },
    degreeName: { type: String, default: '' },
    contact: {
      emails: { type: [String], default: [] },
      phones: { type: [String], default: [] },
      links: { type: [String], default: [] }
    }
  },
  matchAnalysis: {
    overallScore: { type: Number, default: 0, min: 0, max: 100 },
    skillsScore: { type: Number, default: 0, min: 0, max: 100 },
    similarityScore: { type: Number, default: 0, min: 0, max: 100 },
    experienceScore: { type: Number, default: 0, min: 0, max: 100 },
    educationScore: { type: Number, default: 0, min: 0, max: 100 },
    matchedRequiredSkills: { type: [String], default: [] },
    missingRequiredSkills: { type: [String], default: [] },
    matchedPreferredSkills: { type: [String], default: [] },
    missingPreferredSkills: { type: [String], default: [] },
    weightsUsed: {
      skills: Number,
      similarity: Number,
      experience: Number,
      education: Number
    },
    explanation: { type: String, default: '' },
    limitationsNotice: { type: String, default: '' },
    evaluatedAt: { type: Date, default: Date.now }
  },
  status: {
    type: String,
    enum: ['New', 'Reviewed', 'Shortlisted', 'Rejected'],
    default: 'New',
    index: true
  },
  recruiterNotes: {
    type: String,
    default: ''
  },
  benchmark: {
    dataset: { type: String, default: '' },
    syntheticResumeId: { type: String, default: '' },
    seniority: { type: String, default: '' },
    industry: { type: String, default: '' },
    isBenchmarkMatch: { type: Boolean, default: null },
    benchmarkRule: { type: String, default: '' }
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

applicantSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Applicant', applicantSchema);
