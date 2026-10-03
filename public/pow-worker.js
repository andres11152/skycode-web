/* Resuelve el proof-of-work del login (ver src/lib/pow.ts) fuera del hilo
 * principal, para no congelar la interfaz.
 *
 * Entrada:  { salt: string, bits: number }
 * Salida:   { solution: string }   (el primer n tal que SHA-256(`${salt}:${n}`)
 *           tiene al menos `bits` bits en cero al inicio)
 *
 * SHA-256 síncrono y propio en vez de `crypto.subtle.digest`: esa API es
 * asíncrona y con unos ~5 µs de sobrecarga por llamada; para millones de
 * hashes por reto eso es 10-50x más lento. El mensaje (sal en base64url de 16
 * bytes = 22 caracteres + ":" + hasta 15 dígitos) siempre cabe en UN solo
 * bloque de 64 bytes, así que cada intento es una sola compresión.
 */
"use strict";

var K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

var W = new Uint32Array(64);
var BLOCK = new Uint8Array(64);

/* Devuelve el primer word (32 bits) del hash de BLOCK ya relleno con `length` bytes de mensaje,
 * junto con el segundo, para poder contar hasta 64 bits en cero. */
var h0 = 0;
var h1 = 0;

function compress(length) {
  var i;
  BLOCK[length] = 0x80;
  for (i = length + 1; i < 62; i++) BLOCK[i] = 0;
  var bitLength = length * 8;
  BLOCK[62] = (bitLength >>> 8) & 0xff;
  BLOCK[63] = bitLength & 0xff;

  for (i = 0; i < 16; i++) {
    W[i] = (BLOCK[i * 4] << 24) | (BLOCK[i * 4 + 1] << 16) | (BLOCK[i * 4 + 2] << 8) | BLOCK[i * 4 + 3];
  }
  for (i = 16; i < 64; i++) {
    var w15 = W[i - 15];
    var w2 = W[i - 2];
    var s0 = ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3);
    var s1 = ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);
    W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
  }

  var a = 0x6a09e667, b = 0xbb67ae85, c = 0x3c6ef372, d = 0xa54ff53a;
  var e = 0x510e527f, f = 0x9b05688c, g = 0x1f83d9ab, h = 0x5be0cd19;

  for (i = 0; i < 64; i++) {
    var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
    var ch = (e & f) ^ (~e & g);
    var t1 = (h + S1 + ch + K[i] + W[i]) | 0;
    var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
    var maj = (a & b) ^ (a & c) ^ (b & c);
    var t2 = (S0 + maj) | 0;
    h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
  }

  h0 = (0x6a09e667 + a) | 0;
  h1 = (0xbb67ae85 + b) | 0;
}

function leadingZeroBits(word0, word1) {
  if (word0 !== 0) return Math.clz32(word0);
  return 32 + Math.clz32(word1);
}

function solve(salt, bits) {
  var prefix = salt + ":";
  var length = prefix.length;
  for (var i = 0; i < length; i++) BLOCK[i] = prefix.charCodeAt(i);

  for (var n = 0; ; n++) {
    var digits = String(n);
    var total = length + digits.length;
    for (var j = 0; j < digits.length; j++) BLOCK[length + j] = digits.charCodeAt(j);
    compress(total);
    if (leadingZeroBits(h0, h1) >= bits) return digits;
  }
}

self.onmessage = function (event) {
  var data = event.data || {};
  if (typeof data.salt !== "string" || typeof data.bits !== "number") {
    self.postMessage({ error: "invalid_input" });
    return;
  }
  self.postMessage({ solution: solve(data.salt, data.bits) });
};
