import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Cliente de R2 dedicado a backups de base de datos — **deliberadamente
 * separado** de `lib/storage.ts` (documentos de clientes): usa su propio
 * bucket y sus propias credenciales (`R2_BACKUPS_*`, nunca `R2_*` a
 * secas). Un backup de la base contiene TODO — incluidos
 * `users.password_hash`/`totp_secret` — así que un token de API filtrado
 * para el bucket de documentos no debe dar acceso a los backups, y
 * viceversa. Mismo patrón de endpoint/`forcePathStyle` que `storage.ts`
 * (Cloudflare R2 real vs. MinIO en tests vía `R2_BACKUPS_ENDPOINT`).
 */

const BACKUPS_BUCKET = process.env.R2_BACKUPS_BUCKET_NAME;
const BACKUPS_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const BACKUPS_ACCESS_KEY_ID = process.env.R2_BACKUPS_ACCESS_KEY_ID;
const BACKUPS_SECRET_ACCESS_KEY = process.env.R2_BACKUPS_SECRET_ACCESS_KEY;
const BACKUPS_ENDPOINT = process.env.R2_BACKUPS_ENDPOINT;

let cachedClient: S3Client | null = null;

function getBackupsR2Client(): S3Client {
  if (cachedClient) return cachedClient;

  const endpoint = BACKUPS_ENDPOINT ?? (BACKUPS_ACCOUNT_ID ? `https://${BACKUPS_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

  if (!endpoint || !BACKUPS_ACCESS_KEY_ID || !BACKUPS_SECRET_ACCESS_KEY || !BACKUPS_BUCKET) {
    throw new Error(
      "Backup de base de datos (Cloudflare R2) no configurado. Defina R2_ACCOUNT_ID, R2_BACKUPS_ACCESS_KEY_ID, R2_BACKUPS_SECRET_ACCESS_KEY y R2_BACKUPS_BUCKET_NAME."
    );
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: Boolean(BACKUPS_ENDPOINT),
    credentials: { accessKeyId: BACKUPS_ACCESS_KEY_ID, secretAccessKey: BACKUPS_SECRET_ACCESS_KEY },
  });
  return cachedClient;
}

export async function uploadBackupObject(key: string, body: Buffer): Promise<void> {
  await getBackupsR2Client().send(
    new PutObjectCommand({ Bucket: BACKUPS_BUCKET, Key: key, Body: body, ContentType: "application/gzip" })
  );
}

export async function downloadBackupObject(key: string): Promise<Buffer> {
  const res = await getBackupsR2Client().send(new GetObjectCommand({ Bucket: BACKUPS_BUCKET, Key: key }));
  const bytes = await res.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

/** Claves ordenadas de más antigua a más reciente (orden alfabético == cronológico, ver el formato de nombre en `databaseBackup.ts`). */
export async function listBackupKeys(): Promise<string[]> {
  const res = await getBackupsR2Client().send(new ListObjectsV2Command({ Bucket: BACKUPS_BUCKET }));
  return (res.Contents ?? [])
    .map((obj) => obj.Key)
    .filter((key): key is string => Boolean(key))
    .sort();
}

export async function deleteBackupObject(key: string): Promise<void> {
  await getBackupsR2Client().send(new DeleteObjectCommand({ Bucket: BACKUPS_BUCKET, Key: key }));
}
