import multer from 'multer';
import path from 'path';

// Memory storage — files are buffered in memory and uploaded to S3 by StorageService
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'productFiles') {
    return cb(null, true);
  }

  const filetypes = /jpeg|jpg|png|webp|gif|mp4|mov|quicktime/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only images (jpg/png/webp/gif) and videos (mp4/mov) are allowed!'));
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max limit
  },
});

// Middleware helper to validate file size per type across single or multiple fields
export const validateUploadLimit = (req, res, next) => {
  const checkFile = (file) => {
    const isVideo = file.mimetype.startsWith('video/');
    const maxLimit = isVideo ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
    return file.size <= maxLimit;
  };

  let violated = false;
  let violatedMessage = '';

  const processFile = (file, fieldName) => {
    if (!checkFile(file)) {
      violated = true;
      const isVideo = file.mimetype.startsWith('video/');
      violatedMessage = `File size too large for field "${fieldName}". Max limit is ${isVideo ? '100MB' : '50MB'}.`;
    }
  };

  if (req.file) {
    processFile(req.file, req.file.fieldname);
  }

  if (req.files) {
    Object.entries(req.files).forEach(([fieldName, fileArray]) => {
      fileArray.forEach((file) => {
        processFile(file, fieldName);
      });
    });
  }

  if (violated) {
    return res.status(400).json({
      success: false,
      message: violatedMessage,
    });
  }

  next();
};

// Post uploads config: 1 main media file, up to 10 affiliate product card images, up to 10 product files
export const postUpload = upload.fields([
  { name: 'media', maxCount: 10 },
  { name: 'productImages', maxCount: 10 },
  { name: 'productFiles', maxCount: 10 },
]);

// Profile uploads config: 1 avatar picture, 1 profile cover picture
export const profileUpload = upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

export default upload;
