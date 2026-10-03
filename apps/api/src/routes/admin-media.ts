import type { ApiSuccessResponse, MediaDetail } from "@cinestesia/shared";
import type { FastifyInstance } from "fastify";
import { CatalogError, createMedia, updateMedia } from "../catalog/service";
import { requireAdmin } from "../lib/auth";
import { sendError } from "../lib/errors";

/**
 * Catalog Admin API (§8.35) — fachada de comandos `catalog.write`.
 * Creación/edición de contenido con token estático (decisión v0.2 aprobada);
 * no da acceso directo a la base de datos (§8.35).
 */
export async function registerAdminMediaRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post(
    "/v1/admin/media",
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const detail = await createMedia(request.body);

        const body: ApiSuccessResponse<MediaDetail> = {
          data: detail,
          requestId: request.requestId,
        };

        return reply.status(201).send(body);
      } catch (error) {
        if (error instanceof CatalogError) {
          return sendError(reply, request.requestId, error.code, error.message);
        }
        throw error;
      }
    },
  );

  app.patch<{ Params: { mediaId: string } }>(
    "/v1/admin/media/:mediaId",
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const detail = await updateMedia(request.params.mediaId, request.body);

        const body: ApiSuccessResponse<MediaDetail> = {
          data: detail,
          requestId: request.requestId,
        };

        return reply.status(200).send(body);
      } catch (error) {
        if (error instanceof CatalogError) {
          return sendError(reply, request.requestId, error.code, error.message);
        }
        throw error;
      }
    },
  );
}
