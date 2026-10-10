import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

interface EnvConfig {
  // Server
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';

  // Database
  DATABASE_URL: string;

  // Authentication
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;

  // AWS S3 (optional - local disk storage is used when not configured)
  AWS_REGION?: string;
  AWS_S3_BUCKET?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;

  // Local file storage directory (used when S3 is not configured)
  UPLOAD_DIR: string;

  // SMTP (optional)
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
}

const requiredEnv = [
  'DATABASE_URL',
  'JWT_SECRET',
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(
      `❌ Missing required environment variable: ${key}`
    );
  }
}

export const config: EnvConfig = {
  // Server
  PORT: Number(process.env.PORT) || 5000,
  NODE_ENV:
    (process.env.NODE_ENV as 'development' | 'production' | 'test') ||
    'development',

  // Database
  DATABASE_URL: process.env.DATABASE_URL!,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!,

  // AWS S3 (optional)
  AWS_REGION: process.env.AWS_REGION,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,

  // Local file storage
  UPLOAD_DIR: path.resolve(
    __dirname,
    '../..',
    process.env.UPLOAD_DIR || 'uploads'
  ),

  // SMTP (optional)
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT
    ? Number(process.env.SMTP_PORT)
    : undefined,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,
};