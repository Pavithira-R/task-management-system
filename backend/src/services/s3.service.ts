import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, s3BucketName } from '../config/s3';
import { AppError } from '../utils/AppError';

export class S3Service {
  /**
   * Uploads a file to S3
   * @param fileBuffer The file content as a Buffer
   * @param mimeType The file's MIME type
   * @param storageKey The target object key in S3
   * @returns Resolves when the upload is complete
   */
  public static async uploadFile(fileBuffer: Buffer, mimeType: string, storageKey: string): Promise<void> {
    if (!s3Client || !s3BucketName) {
      throw new AppError('S3 storage is not configured', 500);
    }

    const command = new PutObjectCommand({
      Bucket: s3BucketName,
      Key: storageKey,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    try {
      await s3Client.send(command);
    } catch (error: any) {
      console.error('S3 Upload Error:', error);
      throw new AppError('Failed to upload file to S3', 500);
    }
  }

  /**
   * Deletes a file from S3
   * @param storageKey The object key in S3
   * @returns Resolves when the deletion is complete
   */
  public static async deleteFile(storageKey: string): Promise<void> {
    if (!s3Client || !s3BucketName) {
      throw new AppError('S3 storage is not configured', 500);
    }

    const command = new DeleteObjectCommand({
      Bucket: s3BucketName,
      Key: storageKey,
    });

    try {
      await s3Client.send(command);
    } catch (error: any) {
      console.error('S3 Delete Error:', error);
      throw new AppError('Failed to delete file from S3', 500);
    }
  }

  /**
   * Generates a pre-signed URL to download a file from S3
   * @param storageKey The object key in S3
   * @param originalFilename The original filename to be used in Content-Disposition
   * @param expiresIn The URL expiration time in seconds (default 3600)
   * @returns The pre-signed URL
   */
  public static async getSignedDownloadUrl(storageKey: string, originalFilename: string, expiresIn: number = 3600): Promise<string> {
    if (!s3Client || !s3BucketName) {
      throw new AppError('S3 storage is not configured', 500);
    }

    const command = new GetObjectCommand({
      Bucket: s3BucketName,
      Key: storageKey,
      ResponseContentDisposition: `attachment; filename="${originalFilename}"`,
    });

    try {
      const url = await getSignedUrl(s3Client, command, { expiresIn });
      return url;
    } catch (error: any) {
      console.error('S3 Pre-signed URL Error:', error);
      throw new AppError('Failed to generate download URL', 500);
    }
  }
}
