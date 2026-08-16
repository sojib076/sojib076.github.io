import 'server-only';
import { createHash, createHmac } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Product image storage.
 *
 * Two adapters ship: local disk (fine for a single VPS, and the default so the
 * app runs with zero cloud setup) and any S3-compatible bucket — AWS S3,
 * Cloudflare R2, DigitalOcean Spaces, MinIO. The S3 adapter signs its own
 * requests, so no multi-megabyte SDK ends up in the deployment.
 */

export interface ObjectStorage {
  readonly name: string;
  /** Stores bytes under a key and returns the public URL. */
  put(key: string, body: Buffer, contentType: string): Promise<string>;
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function assertUploadable(contentType: string, size: number): string | null {
  if (!ALLOWED_TYPES.has(contentType)) return 'Only JPG, PNG, WebP or AVIF images are allowed.';
  if (size > MAX_IMAGE_BYTES) return 'Image must be smaller than 5 MB.';
  return null;
}

/** Collision-proof, cache-friendly key: products/2026/ab12cd34.webp */
export function buildImageKey(originalName: string, prefix = 'products'): string {
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const random = crypto.randomUUID().split('-')[0];
  const year = new Date().getUTCFullYear();
  return `${prefix}/${year}/${Date.now().toString(36)}${random}${ext}`;
}

class LocalDiskStorage implements ObjectStorage {
  readonly name = 'local';

  async put(key: string, body: Buffer): Promise<string> {
    const target = path.join(process.cwd(), 'public', 'uploads', key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
    return `/uploads/${key}`;
  }
}

type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
};

class S3Storage implements ObjectStorage {
  readonly name = 's3';

  constructor(private readonly config: S3Config) {}

  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    const { endpoint, region, bucket, accessKeyId, secretAccessKey, publicBaseUrl } = this.config;

    const url = new URL(`${endpoint.replace(/\/$/, '')}/${bucket}/${key}`);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = createHash('sha256').update(body).digest('hex');

    const headers: Record<string, string> = {
      host: url.host,
      'content-type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    };

    const signedHeaders = Object.keys(headers).sort().join(';');
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((name) => `${name}:${headers[name]}\n`)
      .join('');

    const canonicalRequest = [
      'PUT',
      url.pathname,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const scope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const signingKey = ['aws4_request'].reduce(
      (key, part) => createHmac('sha256', key).update(part).digest(),
      [dateStamp, region, 's3'].reduce(
        (key, part) => createHmac('sha256', key).update(part).digest(),
        Buffer.from(`AWS4${secretAccessKey}`) as Buffer,
      ),
    );

    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...headers,
        authorization:
          `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, ` +
          `SignedHeaders=${signedHeaders}, Signature=${signature}`,
      },
      body: new Uint8Array(body),
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${await response.text()}`);
    }

    return `${publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }
}

let cached: ObjectStorage | null = null;

export function getStorage(): ObjectStorage {
  if (cached) return cached;

  const {
    S3_ENDPOINT,
    S3_BUCKET,
    S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY,
    S3_REGION,
    S3_PUBLIC_URL,
  } = process.env;

  if (S3_ENDPOINT && S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY) {
    cached = new S3Storage({
      endpoint: S3_ENDPOINT,
      bucket: S3_BUCKET,
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
      region: S3_REGION ?? 'us-east-1',
      publicBaseUrl: S3_PUBLIC_URL ?? `${S3_ENDPOINT.replace(/\/$/, '')}/${S3_BUCKET}`,
    });
  } else {
    cached = new LocalDiskStorage();
  }

  return cached;
}
