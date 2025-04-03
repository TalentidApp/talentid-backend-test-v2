import cloudinary from '../config/cloudinary.js';

const UploadImageToCloudinary = async (fileOrBuffer, folder = '', height = '100', quality = '100') => {
  try {
    const options = {
      folder,
      height: parseInt(height, 10),
      quality: parseInt(quality, 10),
      resource_type: 'auto',
    };

    let uploadResult;

    if (Buffer.isBuffer(fileOrBuffer)) {
      const bufferString = fileOrBuffer.toString('base64');
      const dataUri = `data:application/pdf;base64,${bufferString}`;
      uploadResult = await cloudinary.uploader.upload(dataUri, options);
    } else if (fileOrBuffer && fileOrBuffer.tempFilePath) {
      uploadResult = await cloudinary.uploader.upload(fileOrBuffer.tempFilePath, options);
    } else {
      throw new Error('Invalid file or buffer input.');
    }

    return uploadResult;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error.message);
    throw error;
  }
};

export default UploadImageToCloudinary;