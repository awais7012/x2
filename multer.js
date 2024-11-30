const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinaryConfig');

// Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads/images', // Folder in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'mp4', 'mov'], // Allowed file formats
    resource_type: 'auto', // Handles both images and videos
  },
});

const upload = multer({ storage });

module.exports = upload;
