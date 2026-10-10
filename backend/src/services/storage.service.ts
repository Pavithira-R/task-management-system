import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { isS3Configured } from '../config/s3';
import { S3Service } from './s3.service';
import { AppError } from '../utils/AppError';

const DOWNLOAD_TOKEN_PURPOSE = 'attachment-download';

interface DownloadTokenPayload {
  purpose: string;
  key: string;
  name: string;
  type: string;
}

/**
 * Stores attachment files in AWS S3 when it is configured,
 * otherwise on local disk under UPLOAD_DIR.
 */
export class StorageService {
  public static get driver(): 's3' | 'local' {
    return isS3Configured ? 's3' : 'local';
  }

  // Resolves a storage key to an absolute path, refusing anything outside UPLOAD_DIR
  private static resolveLocalPath(storageKey: string): string {
    const root = path.resolve(config.UPLOAD_DIR);
    const filePath = path.resolve(root, storageKey);
    if (filePath !== root && !filePath.startsWith(root + path.sep)) {
      throw new AppError('Invalid storage key', 400);
    }
    return filePath;
  }

  public static async uploadFile(fileBuffer: Buffer, mimeType: string, storageKey: string): Promise<void> {
    if (isS3Configured) {
      return S3Service.uploadFile(fileBuffer, mimeType, storageKey);
    }

    const filePath = this.resolveLocalPath(storageKey);
    try {
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, fileBuffer);
    } catch (error: any) {
      console.error('Local Upload Error:', error);
      throw new AppError('Failed to save uploaded file', 500);
    }
  }

  public static async deleteFile(storageKey: string): Promise<void> {
    if (isS3Configured) {
      return S3Service.deleteFile(storageKey);
    }

    const filePath = this.resolveLocalPath(storageKey);
    try {
      await fs.promises.unlink(filePath);
    } catch (error: any) {
      // A file that is already gone should not block deleting its record
      if (error.code !== 'ENOENT') {
        console.error('Local Delete Error:', error);
        throw new AppError('Failed to delete file', 500);
      }
    }
  }

  /**
   * Returns a time-limited download URL.
   * S3: a pre-signed S3 URL. Local: a signed link to GET /api/attachments/files/:token.
   */
  public static async getDownloadUrl(
    storageKey: string,
    originalFilename: string,
    mimeType: string | null,
    expiresIn: number = 3600
  ): Promise<string> {
    if (isS3Configured) {
      return S3Service.getSignedDownloadUrl(storageKey, originalFilename, expiresIn);
    }

    const payload: DownloadTokenPayload = {
      purpose: DOWNLOAD_TOKEN_PURPOSE,
      key: storageKey,
      name: originalFilename,
      type: mimeType || 'application/octet-stream',
    };
    const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn });
    return `/api/attachments/files/${token}`;
  }

  // Validates a local download token and returns the file to stream
  public static resolveDownloadToken(token: string): { filePath: string; filename: string; mimeType: string } {
    let payload: DownloadTokenPayload;
    try {
      payload = jwt.verify(token, config.JWT_SECRET) as DownloadTokenPayload;
    } catch {
      throw new AppError('Download link is invalid or has expired', 401);
    }

    if (payload.purpose !== DOWNLOAD_TOKEN_PURPOSE || !payload.key) {
      throw new AppError('Download link is invalid or has expired', 401);
    }

    const filePath = this.resolveLocalPath(payload.key);
    if (!fs.existsSync(filePath)) {
      throw new AppError('File not found', 404);
    }

    return { filePath, filename: payload.name, mimeType: payload.type };
  }
}
