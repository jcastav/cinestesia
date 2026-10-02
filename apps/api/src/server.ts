import "dotenv/config";
import cors from "@fastify/cors";
import type { ApiErrorResponse } from "@cinestesia/shared";
import Fastify from "fastify";
import { resolveRequestId } from "./lib/request-id";
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
    request.log.error(error);
    const body: ApiErrorResponse = {
      error: {
        code: "INTERNAL_ERROR",
        message: "Error interno del servidor",
        requestId: request.requestId,
      },
    };
    void reply.status(500).send(body);
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
    allowedHeaders: ["Content-Type", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
  });

  app.get("/v1/health", async () => ({ status: "ok" }));

  await registerCatalogRoutes(app);
  await registerMediaRoutes(app);

  const port = Number(process.env.PORT ?? 3001);

  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((error: unknown) => {
  console.error("API no pudo iniciarse:", error);
  process.exit(1);
});
