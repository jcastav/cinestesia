import type { ApiSuccessResponse, DiscoveryRunDto } from "@cinestesia/shared";
import type { FastifyInstance } from "fastify";
import { DiscoveryError } from "../discovery/errors";
import { createRun, getRun, listRuns } from "../discovery/service";
import { requireAdmin } from "../lib/auth";
import { sendError } from "../lib/errors";

/**
 * Discovery & Ingestion Admin API (§6.44 §60) — corren bajo el mismo token
 * estático de Catalog Admin (decisión v0.2/Fase C): no hay usuarios ni UI; el
 * operador pega el token en su cliente (decisión 3 aprobada, BACKLOG).
 */
export async function registerAdminDiscoveryRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post(
    "/v1/admin/discovery/runs",
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const result = await createRun(request.body, (message, error) =>
          request.log.error(error, message),
        );

        const body: ApiSuccessResponse<CreateRunResultBody> = {
          data: result,
          requestId: request.requestId,
        };

        return reply.status(202).send(body);
      } catch (error) {
        if (error instanceof DiscoveryError) {
          return sendError(reply, request.requestId, error.code, error.message);
        }
        throw error;
      }
    },
  );

  app.get(
    "/v1/admin/discovery/runs",
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const query = request.query as { page?: string; limit?: string };
        const { runs, meta } = await listRuns(query.page, query.limit);

        const body: ApiSuccessResponse<DiscoveryRunDto[]> = {
          data: runs,
          meta,
          requestId: request.requestId,
        };

        return reply.status(200).send(body);
      } catch (error) {
        if (error instanceof DiscoveryError) {
          return sendError(reply, request.requestId, error.code, error.message);
        }
        throw error;
      }
    },
  );

  app.get<{ Params: { runId: string } }>(
    "/v1/admin/discovery/runs/:runId",
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const run = await getRun(request.params.runId);

        const body: ApiSuccessResponse<DiscoveryRunDto> = {
          data: run,
          requestId: request.requestId,
        };

        return reply.status(200).send(body);
      } catch (error) {
        if (error instanceof DiscoveryError) {
          return sendError(reply, request.requestId, error.code, error.message);
        }
        throw error;
      }
    },
  );
}

type CreateRunResultBody = { runId: string; status: "QUEUED" };
