# Blindaje de la autenticación

Resumen operativo de las defensas del login y de las demás superficies que
aceptan credenciales (`/api/auth/login`, `/login/verify-2fa`, `forgot-password`,
`reset-password`, `/api/team/accept`), qué cubren y — igual de importante — qué
**no** cubren. El detalle de diseño y las razones están en los comentarios de
cada módulo; esto es el mapa.

## Capas (de la más barata a la más cara; cada una corta al primer fallo)

| # | Capa | Dónde | Qué frena |
|---|------|-------|-----------|
| 0 | Token bucket por IP en memoria | `proxy.ts` + `lib/loadShed.ts` | Inundaciones: se descartan (429) **antes** de tocar el handler o la base |
| 1 | Origen same-origin estricto | `lib/requestOrigin.ts` | CSRF y scripts sueltos (curl): exige `Origin` propio o `Sec-Fetch-Site: same-origin` |
| 2 | Forma del cuerpo | `lib/readJsonBody.ts` | 415 (tipo), 413 (>8 KB, leído en streaming), 400 (JSON roto) — nunca 500 |
| 3 | Bloqueo duro por IP | `lib/authShield.ts` | ≥ 20 fallos en 15 min → 429 + `Retry-After` |
| 4 | Honeypot | `components/auth/AuthShieldFields.tsx` | Bots que rellenan todos los campos; respuesta idéntica a "credenciales inválidas" |
| 5 | Proof-of-work | `lib/pow.ts`, `public/pow-worker.js`, `usePowChallenge` | Credential stuffing: cada intento cuesta CPU, y más con cada fallo |
| 6 | Bloqueo duro por par correo+IP | `lib/authShield.ts` | ≥ 8 fallos del mismo correo desde la misma IP |
| 7 | Piso de duración (450 ms) | `withMinimumDuration` | Oráculo de timing (correo inexistente vs bcrypt vs scrypt) y fuerza bruta |
| 8 | Hash scrypt (32 MiB, ~180 ms) | `lib/passwordHash.ts` | Cracking offline; corre en el pool de hilos, no bloquea el event loop |
| 9 | 2FA TOTP con límites propios | `lib/authService.ts` | Contraseña robada |
| 10 | Avisos al dueño | `lib/securityAlerts.ts` | Dispositivo nuevo, ráfaga de fallos |

### Por qué el proof-of-work es adaptativo y la cuenta nunca se bloquea
La dificultad (16 → 24 bits) sube con los fallos recientes de la **IP** o del
**correo atacado** (existan o no: sin oráculo de enumeración). Un ataque
distribuido contra una cuenta (cientos de IPs) no puede bloquear a la víctima
—el bloqueo duro es solo por IP y por par correo+IP—: solo encarece cada
intento (~1 s a 20 bits, ~15 s a 24 bits en un escritorio) para el atacante y
para la víctima legítima, que paga ese costo una vez en su propio navegador.

## Contraseñas
- **scrypt** `N=2^15, r=8, p=3` (recomendación OWASP). Los hashes **bcrypt**
  anteriores siguen verificando y se **re-hashean solos** en el siguiente login
  exitoso (`needsRehash`).
- Los códigos de respaldo de 2FA siguen en bcrypt (alta entropía, 8 por cuenta;
  8 × scrypt por verificación sería lentitud sin beneficio).
- **Have I Been Pwned** por k-anonimato (solo 5 hex del SHA-1; `Add-Padding`)
  al crear/cambiar/resetear contraseña. **Falla abierto**: si HIBP no responde
  se acepta (bloquear sería un DoS contra los propios usuarios).

## Sesión
- Cookie `__Host-skycode_session` en producción (Secure, `Path=/`, sin `Domain`,
  HttpOnly, SameSite=Lax). El primer despliegue cierra las sesiones abiertas una
  sola vez (el nombre cambió).
- Expiración por **inactividad** (`SESSION_IDLE_HOURS`, 12 por defecto) además
  de los 7 días absolutos (migración `0038_session_idle.sql`).
- Rutas de auth con `Cache-Control: private, no-store`; `COOP`/`CORP`
  `same-origin`; `worker-src 'self'`.

## SQL injection
Todo valor del usuario llega a Postgres como parámetro (`$1…`). Las únicas
interpolaciones `${}` dentro de consultas son fragmentos internos (constantes
`*_SELECT`, listas de columnas, números de placeholder) y están congeladas en
`src/lib/sqlSafety.test.ts`: una interpolación nueva rompe el CI hasta que se
justifique.

## Cómo verificar
```bash
npm test && npm run test:integration && npm run test:e2e   # incluye e2e/auth-shield.e2e.test.ts
# Simulación de ataque contra un servidor LOCAL (se niega a atacar hosts remotos):
(set -a; source .env.test; set +a; unset AUTH_POW_MIN_AGE_MS AUTH_MIN_DURATION_MS; \
  export SKYCODE_E2E=1; npx next build && npx next start -p 4199) &
node scripts/auth-attack-sim.mjs http://localhost:4199
```

## Lo que esto NO cubre (decisiones de infraestructura)

1. **DDoS volumétrico (capa 3/4 y capa 7 masiva).** Ningún código de aplicación
   en Node lo absorbe: el ancho de banda y las conexiones se agotan antes de
   llegar al proceso. Lo que sí hace la app es que un flood pequeño/mediano
   sea barato de descartar (token bucket sin tocar la base). Para el resto:
   - Poner **Cloudflare** (plan gratuito) delante de Render: proxy naranja,
     **Bot Fight Mode**, y una *rate limiting rule* sobre `/api/auth/*`.
   - Restringir el origen en Render a las IPs de Cloudflare y activar
     `TRUST_CLOUDFLARE=true` (la app entonces lee `CF-Connecting-IP`). **No** lo
     actives sin lo primero: la cabecera sería falsificable y los límites por
     IP quedarían evadibles.
2. **El proof-of-work sube el costo de los bots; no detiene a granjas de
   personas** ni a un atacante con mucho cómputo. La interfaz
   `verifyHumanChallenge` (`lib/authShield.ts`) es el punto donde sumar una
   segunda capa (p. ej. Cloudflare Turnstile) sin tocar las rutas.
3. **Phishing y robo de sesión por malware del dispositivo**: 2FA y los avisos
   de dispositivo nuevo ayudan, pero no los eliminan. Llaves de seguridad
   (WebAuthn/passkeys) serían el siguiente salto.
4. **Infraestructura**: usuario de Postgres con mínimo privilegio, rotación
   periódica de `JWT_SECRET` (cierra todas las sesiones) y monitoreo externo
   (Sentry/Render) son configuración fuera del código.
5. **CSP con `'unsafe-inline'` en `script-src`** (hoy necesario para la
   hidratación de Next.js y el script de idioma): migrar a nonces reduciría el
   impacto de un XSS, pero es un cambio transversal fuera de este alcance.
