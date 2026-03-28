import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Env, getEnv } from '../env.js';

export interface PutObjectInput {
  key: string;
  body: Uint8Array;
  contentType: string;
}

export interface StorageService {
  putObject: (input: PutObjectInput) => Promise<{ key: string }>;
  getObjectUrl: (key: string, expiresInSeconds?: number) => Promise<string>;
  deleteObject: (key: string) => Promise<void>;
}

function createS3Client(env: Env, endpoint: string) {
  return new S3Client({
    endpoint,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY
    }
  });
}

function createStorageService(): StorageService {
  const env = getEnv();
  const objectClient = createS3Client(env, env.S3_ENDPOINT);
  const publicObjectClient = createS3Client(env, env.S3_PUBLIC_ENDPOINT);

  return {
    async putObject(input) {
      await objectClient.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType
        })
      );

      return { key: input.key };
    },

    async getObjectUrl(key, expiresInSeconds = 3600) {
      return getSignedUrl(
        publicObjectClient,
        new GetObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key
        }),
        {
          expiresIn: expiresInSeconds
        }
      );
    },

    async deleteObject(key) {
      await objectClient.send(
        new DeleteObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key
        })
      );
    }
  };
}

let storageService: StorageService | undefined;

export function getStorageService() {
  if (!storageService) {
    storageService = createStorageService();
  }

  return storageService;
}
