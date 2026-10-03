import type { ApiSuccessResponse, MediaDetail } from "@cinestesia/shared";
import type { FastifyInstance } from "fastify";
import {
  CatalogError,
  createMedia,
  getAdminMediaDetail,
  updateMedia,
} from "../catalog/service";
import { requireAdmin } from "../lib/auth";
import { sendError } from "../lib/errors";

/**
 * Catalog Admin API (§8.35) — fachada de comandos `catalog.write`.
 * Creación/edición de contenido con token estático (decisión v0.2 aprobada);
 * no da acceso directo a la base de datos (§8.35).
 * `GET /v1/admin/media/:mediaId` (Fase D de v0.3) permite ver también el
 * detalle de candidatos ingeridos con `publicationStatus = DRAFT` (§6.44 §46),
 * invisibles para el público en `GET /v1/media/:mediaId`.
 */
export async function registerAdminMediaRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get<{ Params: { mediaId: string } }>(
    "/v1/admin/media/:mediaId",
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const detail = await getAdminMediaDetail(request.params.mediaId);

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
