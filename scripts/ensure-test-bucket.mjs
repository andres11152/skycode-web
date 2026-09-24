#!/usr/bin/env node
// Uso: node --env-file=.env.test scripts/ensure-test-bucket.mjs
//
// Crea el bucket del doble S3 desechable (MinIO, ver docker-compose.test.yml)
// si todavía no existe — a diferencia de Postgres, MinIO no trae ningún
// bucket por defecto. Idempotente: si el bucket ya existe (corridas
// repetidas contra el mismo contenedor sin `test:db:down`), no hace nada.
// Se dispara solo vía los hooks `pretest:integration`/`pretest:e2e` de
// package.json — nunca hace falta correrlo a mano.

import { S3Client, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

const endpoint = process.env.R2_ENDPOINT;
const bucket = process.env.R2_BUCKET_NAME;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

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

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
} catch {
  await client.send(new CreateBucketCommand({ Bucket: bucket }));
  console.log(`Bucket de prueba "${bucket}" creado en ${endpoint}.`);
}
