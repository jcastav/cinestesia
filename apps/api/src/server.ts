import "dotenv/config";
import cors from "@fastify/cors";
import type { ApiErrorResponse } from "@cinestesia/shared";
import Fastify from "fastify";
import { CatalogError } from "./catalog/errors";
import { DiscoveryError } from "./discovery/errors";
import { recoverOrphanedRuns } from "./discovery/repository";
import { sendError } from "./lib/errors";
import { resolveRequestId } from "./lib/request-id";
import { registerAdminDiscoveryRoutes } from "./routes/admin-discovery";
import { registerAdminMediaRoutes } from "./routes/admin-media";
import { registerCatalogRoutes } from "./routes/catalog";
import { registerMediaRoutes } from "./routes/media";

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  app.decorateRequest("requestId", "");

  app.addHook("onRequest", async (request, reply) => {
    const incoming = request.headers["x-request-id"];
    request.requestId = resolveRequestId(
      typeof incoming === "string" ? incoming : undefined,
    );
    void reply.header("X-Request-Id", request.requestId);
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof CatalogError) {
      request.log.error(
        { code: error.code },
        `Error de dominio del Catalog: ${error.message}`,
      );
      return sendError(reply, request.requestId, error.code, error.message);
    }

    if (error instanceof DiscoveryError) {
      request.log.error(
        { code: error.code },
        `Error de dominio de Discovery: ${error.message}`,
      );
      return sendError(reply, request.requestId, error.code, error.message);
    }

    const statusCode = (error as { statusCode?: number }).statusCode;
    if (
      typeof statusCode === "number" &&
      statusCode >= 400 &&
      statusCode < 500
    ) {
      request.log.error(error);
      return sendError(
        reply,
        request.requestId,
        "INVALID_ARGUMENT",
        "Solicitud inválida",
      );
    }

    request.log.error(error);
    const body: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "Error interno del servidor",
        requestId: request.requestId,
      },
    };
    return reply.status(500).send(body);
  });

  app.setNotFoundHandler((request, reply) => {
    const body: ApiErrorResponse = {
      error: {
        code: "INVALID_ARGUMENT",
        message: "Ruta no encontrada",
        requestId: request.requestId,
      },
    };
    void reply.status(404).send(body);
  });

  await app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
  });

  app.get("/v1/health", async () => ({ status: "ok" }));

  await registerCatalogRoutes(app);
  await registerMediaRoutes(app);
  await registerAdminMediaRoutes(app);
  await registerAdminDiscoveryRoutes(app);

  const recovered = await recoverOrphanedRuns();
  if (recovered > 0) {
    app.log.warn(
      { runs: recovered },
      "Discovery Runs huérfanos marcados como FAILED al iniciar",
    );
  }

  const port = Number(process.env.PORT ?? 3001);

  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((error: unknown) => {
  console.error("API no pudo iniciarse:", error);
  process.exit(1);
});
