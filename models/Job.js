const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [120, 'Title cannot exceed 120 characters']
  },
  department: {
    type: String,
    trim: true,
    default: 'Engineering'
  },
  location: {
    type: String,
    trim: true,
    default: 'Remote'
  },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
    default: 'Full-time'
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true
  },
  requiredSkills: {
    type: [String],
    required: [true, 'At least one required skill must be specified'],
    validate: {
      validator: function (v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Please provide at least one required skill'
    }
  },
  preferredSkills: {
    type: [String],
    default: []
  },
  minExperience: {
    type: Number,
    required: [true, 'Minimum experience is required'],
    min: [0, 'Experience cannot be negative'],
    default: 0
  },
  education: {
    type: String,
    enum: ['Any', 'High School', 'Associate', 'Bachelor', 'Master', 'PhD'],
    default: 'Bachelor'
  },
  weights: {
    skills: {
      type: Number,
      default: 40,
      min: [0, 'Weight must be >= 0'],
      max: [100, 'Weight must be <= 100']
    },
    similarity: {
      type: Number,
      default: 30,
      min: [0, 'Weight must be >= 0'],
      max: [100, 'Weight must be <= 100']
    },
    experience: {
      type: Number,
      default: 20,
      min: [0, 'Weight must be >= 0'],
      max: [100, 'Weight must be <= 100']
    },
    education: {
      type: Number,
      default: 10,
      min: [0, 'Weight must be >= 0'],
      max: [100, 'Weight must be <= 100']
    }
  },
  status: {
    type: String,
    enum: ['Active', 'Draft', 'Closed'],
    default: 'Active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  benchmark: {
    dataset: { type: String, default: '' },
    syntheticJobId: { type: String, default: '' },
    isSynthetic: { type: Boolean, default: false },
    relevantResumeIds: { type: [String], default: [] }
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

// Update the updatedAt timestamp before saving
jobSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Job', jobSchema);
