import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads', // Folder name in Cloudinary
    format: async (req, file) => {
      // Map MIME types to file extensions (common ones)
      const mimeToExtension = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'application/pdf': 'pdf',
        'text/plain': 'txt',
      };

      // Return the appropriate file extension, defaulting to 'bin' for unknown types
      return mimeToExtension[file.mimetype] || 'bin';
    },
    public_id: (req, file) => file.originalname.split('.')[0], // Use original file name without extension
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // No strict MIME type filtering
    cb(null, true); // Accept all file types
  },
});

export default upload;


