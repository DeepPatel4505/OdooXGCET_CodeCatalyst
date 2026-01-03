import multer from 'multer';
import path from 'path';

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store file in memory for processing

const fileFilter = (req, file, cb) => {
  // Accept CSV and Excel files
  const allowedMimes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Error handler for multer errors
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File too large. Maximum size is 10MB.',
        error: 'Validation Error',
      });
    }
    return res.status(400).json({
      status: 'error',
      message: err.message || 'File upload error',
      error: 'Validation Error',
    });
  }
  
  if (err) {
    return res.status(400).json({
      status: 'error',
      message: err.message || 'File upload error',
      error: 'Validation Error',
    });
  }
  
  next();
};

