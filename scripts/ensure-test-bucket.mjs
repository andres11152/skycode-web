#!/usr/bin/env node
// Uso: node --env-file=.env.test scripts/ensure-test-bucket.mjs
//
// Crea los buckets del doble S3 desechable (MinIO, ver docker-compose.test.yml)
// si todavía no existen — a diferencia de Postgres, MinIO no trae ningún
// bucket por defecto. Idempotente: si un bucket ya existe (corridas
// repetidas contra el mismo contenedor sin `test:db:down`), no hace nada.
// Se dispara solo vía los hooks `pretest:integration`/`pretest:e2e` de
// package.json — nunca hace falta correrlo a mano. Dos buckets sobre el
// mismo MinIO (documentos y backups de base de datos) — en test comparten
// credenciales de MinIO por simplicidad; en producción son buckets y
// tokens de API completamente separados (ver lib/backupStorage.ts).

import { S3Client, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

async function ensureBucket(client, bucket, endpoint) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`Bucket de prueba "${bucket}" creado en ${endpoint}.`);
  }
}

const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;
const backupsBucket = process.env.R2_BACKUPS_BUCKET_NAME;

if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
  console.error("Faltan variables R2_* en el entorno. Corre con --env-file=.env.test.");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

await ensureBucket(client, bucket, endpoint);
if (backupsBucket) await ensureBucket(client, backupsBucket, endpoint);
