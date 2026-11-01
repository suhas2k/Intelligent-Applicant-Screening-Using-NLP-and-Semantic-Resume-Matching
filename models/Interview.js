const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  candidateName: {
    type: String,
    required: [true, 'Candidate name is required'],
    trim: true,
    maxlength: [100, 'Candidate name cannot exceed 100 characters']
  },
  candidateEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  role: {
    type: String,
    required: [true, 'Applied role / position is required'],
    trim: true
  },
  department: {
    type: String,
    trim: true,
    default: 'Engineering'
  },
  date: {
    type: String,
    required: [true, 'Interview date is required (YYYY-MM-DD)'],
    trim: true
  },
  time: {
    type: String,
    required: [true, 'Interview time slot is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['Technical Round', 'HR Round', 'Behavioral', 'Management', 'Coding Test', 'Cultural Fit'],
    default: 'Technical Round'
  },
  interviewer: {
    type: String,
    trim: true,
    default: 'Suhas'
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Rescheduled', 'Completed', 'Cancelled'],
    default: 'Scheduled',
    index: true
  },
  score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  meetingLink: {
    type: String,
    trim: true,
    default: ''
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Applicant',
    sparse: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    sparse: true
  },
  organization: {
    type: String,
    default: 'TechCorp Technologies'
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

interviewSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Interview', interviewSchema);
