import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import { memoryStorage } from 'multer';
import * as dotenv from 'dotenv';

dotenv.config();

const hasS3Credentials = !!(
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET_NAME
);

export const s3Client = hasS3Credentials
  ? new S3Client({
      region: process.env.AWS_REGION as string,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    })
  : null;

export const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';

console.log('AWS S3 Configuration:', {
  hasS3Credentials,
  REGION: process.env.AWS_REGION,
  BUCKET: process.env.AWS_S3_BUCKET_NAME,
});

/**
 * Factory function to create S3 or Memory storage based on credentials availability
 */
export function createS3Storage(keyPrefix: string) {
  if (!hasS3Credentials || !s3Client) {
    console.warn(
      'S3 credentials not available. Using in-memory storage (data will be lost on restart)',
    );
    return memoryStorage();
  }

  return multerS3({
    s3: s3Client as any,
    bucket: AWS_S3_BUCKET_NAME,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const sanitized = file.originalname
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '');
      cb(null, `${keyPrefix}/${Date.now()}-${sanitized}`);
    },
  });
}
