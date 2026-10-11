const multer = require('multer');
const path = require('path');
const fs = require('fs');

const os = require('os');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const uploadDir = isServerless 
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(__dirname, '..', 'uploads');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn('[Upload Directory Warning]:', err.message);
}

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${cleanBase}-${uniqueSuffix}${ext}`);
  }
});

// File filter for PDF, DOCX, DOC, and TXT
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();

  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'application/octet-stream' // sometimes sent by some browsers for docx
  ];

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new Error(`Unsupported file extension "${ext}". Only PDF (.pdf) and Word documents (.docx, .doc) are permitted.`),
      false
    );
  }

  if (!allowedMimeTypes.includes(file.mimetype) && !allowedExtensions.includes(ext)) {
    return cb(
      new Error(`Unsupported file type (${file.mimetype}). Please upload a valid PDF or DOCX resume.`),
      false
    );
  }

  cb(null, true);
};

const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10;

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: maxFileSizeMB * 1024 * 1024 // e.g. 10MB
  }
});

upload.uploadDir = uploadDir;

module.exports = upload;
