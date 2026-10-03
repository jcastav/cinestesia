import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { CatalogError } from "../catalog/errors";

/**
 * Guardia de la Admin API (capacidad `catalog.write`, §8.76).
 *
 * Decisión humana v0.2: token estático único `ADMIN_API_TOKEN` comparado en
 * tiempo constante. RBAC real (§8.76) → v0.6/v0.8 (BACKLOG). El token nunca
 * se registra en logs (AGENTS §6).
 */
function tokenMatches(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function requireAdmin(
  request: FastifyRequest,
): Promise<void> {
  const expected = process.env.ADMIN_API_TOKEN;

  if (!expected) {
    request.log.error(
      "ADMIN_API_TOKEN no está definido; la Admin API queda bloqueada",
    );
    throw new CatalogError("INTERNAL_ERROR", "Administración no configurada");
  }

  const header = request.headers.authorization;
  const match =
    typeof header === "string" ? /^Bearer\s+(\S+)$/i.exec(header) : null;

  if (!match?.[1]) {
    throw new CatalogError(
      "UNAUTHORIZED",
      "Credencial administrativa requerida",
    );
  }

  if (!tokenMatches(match[1], expected)) {
    throw new CatalogError(
      "UNAUTHORIZED",
      "Credencial administrativa inválida",
    );
  }
}
