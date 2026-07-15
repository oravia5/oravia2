import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// Lazy getter — reads process.env AFTER dotenv.config() has run in server.js.
let _s3Client = null;
function getS3Client() {
  if (!_s3Client) {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'AWS credentials missing: set AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY in .env'
      );
    }
    _s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _s3Client;
}

function getBucket() {
  return process.env.AWS_BUCKET_NAME || '';
}

function getS3Prefix() {
  const bucket = getBucket();
  if (!bucket) return '';
  return `https://${bucket}.s3.${process.env.AWS_REGION || ''}.amazonaws.com/`;
}

class StorageService {
  /**
   * Upload a file buffer to S3.
   * If S3 upload fails, falls back to local disk storage.
   * @param {Object} file - Multer memoryStorage file object (has buffer, originalname, mimetype)
   * @param {string} folder - S3 folder prefix (e.g. 'posts', 'users', 'comments')
   * @returns {Promise<string>} The public S3 URL or local relative URL
   */
  async uploadFile(file, folder = 'uploads') {
    if (!file || !file.buffer) return '';

    const ext = path.extname(file.originalname);
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const key = `${folder}/${uniqueId}${ext}`;

    try {
      const bucket = getBucket();
      if (!bucket) {
        throw new Error('S3 bucket name not set. Forcing local fallback.');
      }
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await getS3Client().send(command);

      return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (s3Error) {
      console.warn('⚠️ S3 upload failed or credentials invalid. Falling back to local storage:', s3Error.message);
      
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const targetDir = path.join(process.cwd(), uploadDir, folder);
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filePath = path.join(targetDir, `${uniqueId}${ext}`);
      fs.writeFileSync(filePath, file.buffer);

      const relativeUrl = `/uploads/${folder}/${uniqueId}${ext}`.replace(/\\/g, '/');
      return relativeUrl;
    }
  }

  /**
   * Returns the URL for an already-stored file reference.
   * @param {Object|string} fileOrUrl - Either a multer file object or an existing URL string
   * @returns {string} The URL
   */
  getUrl(fileOrUrl) {
    if (!fileOrUrl) return '';
    if (typeof fileOrUrl === 'string') return fileOrUrl;
    return '';
  }

  /**
   * Returns the thumbnail URL (same as main URL for now — video players capture frames).
   */
  getThumbnailUrl(fileOrUrl, type) {
    return this.getUrl(fileOrUrl);
  }

  /**
   * Delete a file from S3 or local storage.
   * @param {string} fileUrl - The S3 URL or local relative path
   * @returns {Promise<boolean>}
   */
  async deleteFile(fileUrl) {
    if (!fileUrl) return false;

    // Check if it's a local relative file URL
    if (fileUrl.startsWith('/uploads/')) {
      try {
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        const cleanPath = fileUrl.slice('/uploads/'.length);
        const filePath = path.join(process.cwd(), uploadDir, cleanPath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return true;
      } catch (err) {
        console.error(`Failed to delete local file: ${err.message}`);
        return false;
      }
    }

    try {
      let key;
      const s3Prefix = getS3Prefix();
      if (s3Prefix && fileUrl.startsWith(s3Prefix)) {
        key = fileUrl.slice(s3Prefix.length);
      } else {
        return false;
      }

      if (!key) return false;

      const command = new DeleteObjectCommand({
        Bucket: getBucket(),
        Key: key,
      });

      await getS3Client().send(command);
      return true;
    } catch (error) {
      console.error(`Failed to delete file from S3: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate a presigned URL for private file access (expires in seconds).
   * @param {string} fileUrl - The full S3 URL or local URL
   * @param {number} expiresIn - Seconds until expiry (default 3600 = 1 hour)
   * @returns {Promise<string>} Presigned URL
   */
  async getPresignedUrl(fileUrl, expiresIn = 3600) {
    if (!fileUrl) return '';
    if (fileUrl.startsWith('/uploads/')) return fileUrl;

    const s3Prefix = getS3Prefix();
    if (!s3Prefix) return fileUrl;

    const key = fileUrl.startsWith(s3Prefix) ? fileUrl.slice(s3Prefix.length) : null;
    if (!key) return fileUrl;

    const command = new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
    });

    try {
      return getSignedUrl(getS3Client(), command, { expiresIn });
    } catch (err) {
      console.error('Failed to sign S3 URL:', err.message);
      return fileUrl;
    }
  }
}

export default new StorageService();
