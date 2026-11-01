const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Member name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Member email is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['Super Admin', 'Hiring Manager', 'Interviewer', 'Technical Lead', 'Recruiter'],
    default: 'Interviewer'
  },
  accessScope: {
    type: String,
    default: 'View Candidates, Interviews'
  },
  status: {
    type: String,
    enum: ['Active', 'Invited', 'Suspended'],
    default: 'Active',
    index: true
  },
  lastActive: {
    type: String,
    default: 'Just now'
  },
  avatarBg: {
    type: String,
    default: '#6366f1'
  },
  organization: {
    type: String,
    default: 'TechCorp Technologies'
  },
  invitedBy: {
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

teamSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Team', teamSchema);
