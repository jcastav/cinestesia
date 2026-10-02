# 9. SECURITY BASELINE & IMPLEMENTATION CHECKLIST

## 9.1. Propósito

Esta sección **no define la arquitectura de seguridad** — la arquitectura
está distribuida en los motores correspondientes de la Sección 6.

Sirve como **checklist de implementación** para asegurar que ningún control
crítico quede fuera del MVP.

Cada ítem referencia el motor donde se define su arquitectura completa.

## 9.2. Autenticación

- [ ] AuthSession como entidad → 6.39
- [ ] Password hashing (Argon2id) → 6.39
- [ ] Refresh token rotation → 6.39
- [ ] MFA para cuentas privilegiadas → 6.42
- [ ] Step-up authentication para operaciones críticas → 6.42
- [ ] Revocación de sesiones → 6.39

## 9.3. Autorización

- [ ] RBAC basado en permisos, no roles → 6.39, 6.42
- [ ] Object-level authorization (IDOR/BOLA) → 6.43
- [ ] Domain authorization en operaciones críticas → 6.43
- [ ] Authorization server-side siempre → 6.43

## 9.4. Transporte y Headers

- [ ] HTTPS obligatorio → 6.43
- [ ] HSTS → 6.43
- [ ] CORS explícito, no `*` en endpoints autenticados → 6.36, 6.43
- [ ] CSP por superficie (public/admin/player) → 6.43
- [ ] Security headers (nosniff, frame-ancestors, etc.) → 6.43

## 9.5. Media Access Control

- [ ] Opaque resource IDs en Gateway → 6.36
- [ ] Short-lived playback tokens → 6.36
- [ ] Token scope limitado a PlaybackSession → 6.36
- [ ] Sin URLs arbitrarias aceptadas por Gateway → 6.36
- [ ] Key rotation con `kid` → 6.36

## 9.6. Egress / SSRF

- [ ] SSRF guards en Source Resolver → 6.35
- [ ] SSRF guards en Media Gateway → 6.36
- [ ] SSRF guards en Health Checker → 6.41
- [ ] Egress policies en Discovery/Ingestion → (por definir)
- [ ] URL validation, DNS rebinding protection, redirect validation → 6.43
- [ ] Timeouts y response size limits → 6.43

## 9.7. Secrets Management

- [ ] Secret Manager dedicado → 6.43
- [ ] Sin secretos en frontend → 6.43
- [ ] Sin secretos en logs → 6.43
- [ ] Redacción estructurada → 6.43
- [ ] Rotación documentada → 6.43

## 9.8. Abuse Prevention

- [ ] Rate limiting por endpoint (dimensiones correctas) → 6.43
- [ ] Progressive enforcement (no ban permanente por señal débil) → 6.43
- [ ] CAPTCHA contextual, no universal → 6.43
- [ ] IP como señal, no identidad → 6.43
- [ ] Challenge providers opcionales → 6.43

## 9.9. Application Security

- [ ] Input validation en frontera → 6.43
- [ ] Parameterized queries (nunca concatenación) → 6.43
- [ ] Mass assignment protection (DTOs explícitos) → 6.42, 6.43
- [ ] XSS prevention (output encoding + CSP) → 6.43
- [ ] CSRF cuando cookies → 6.43
- [ ] Content-type validation → 6.43
- [ ] Error handling sin filtrar detalles internos → 6.43

## 9.10. Administrative Security

- [ ] MFA obligatorio → 6.42
- [ ] Step-up para acciones críticas → 6.42
- [ ] Audit obligatorio para mutaciones → 6.42
- [ ] Least privilege → 6.42
- [ ] Optional network restrictions (VPN/Zero Trust) → 6.42
- [ ] Session timeout más estricto → 6.42

## 9.11. Supply Chain

- [ ] Dependency scanning en CI → 6.43
- [ ] Secret scanning (git history) → 6.43
- [ ] Container security (non-root, minimal images) → 6.43
- [ ] Lockfiles → 6.43

## 9.12. Security Observability

- [ ] Security events normalizados → 6.43
- [ ] Alertas por patrones, no por evento individual → 6.43
- [ ] Correlación con `requestId`/`traceId` → 6.43
- [ ] Distinción preventive/detective/responsive → 6.43

## 9.13. Reglas maestras (referencia)

1. Security es transversal, no un servicio central.
2. Ninguna señal aislada (IP, UA, fingerprint) es identidad.
3. AuthN ≠ AuthZ ≠ AuthSession ≠ PlaybackSession.
4. Toda request server-side a externo cruza frontera de confianza.
5. El navegador nunca es frontera de confianza.
6. Controles de abuso proporcionales a la superficie.
7. Secretos fuera de frontend, logs y config admin ordinaria.
8. Defense in Depth.
9. Challenges auxiliares ≠ dependencias críticas.
10. La seguridad se mide y prueba, no se declara.