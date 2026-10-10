import { S3Client } from '@aws-sdk/client-s3';
import { config } from './env';

const {
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_S3_BUCKET,
} = config;

// S3 is optional: when any setting is missing, attachments are stored on local disk instead.
export const isS3Configured = Boolean(
  AWS_REGION && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_S3_BUCKET
);

export const s3Client: S3Client | null = isS3Configured
  ? new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID!,
        secretAccessKey: AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null;

export const s3BucketName = AWS_S3_BUCKET;
