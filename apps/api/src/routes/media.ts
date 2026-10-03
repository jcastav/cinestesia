import type {
  ApiSuccessResponse,
  MediaDetail,
  MediaSummary,
  PlaybackReference,
  SeasonEpisodes,
  SourceList,
} from "@cinestesia/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import * as catalogRepository from "../catalog/repository";
import {
  CatalogError,
  getCatalog,
  getMediaDetail,
  getSeasonEpisodes,
} from "../catalog/service";
import { db, schema } from "../db";
import { sendError } from "../lib/errors";
import { toSourceSummary } from "../lib/source-mapper";
import { UUID_PATTERN } from "../lib/uuid";

async function findActiveSource(mediaId: string) {
  return db.query.sources.findFirst({
    where: and(
      eq(schema.sources.mediaItemId, mediaId),
      eq(schema.sources.isActive, true),
    ),
  });
}

export async function registerMediaRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/media", async (request, reply) => {
    const query = request.query as { page?: string; limit?: string };

    try {
      const { items, meta } = await getCatalog(query.page, query.limit);

      const body: ApiSuccessResponse<MediaSummary[]> = {
        data: items,
        meta,
        requestId: request.requestId,
      };

      return reply.send(body);
    } catch (error) {
      if (error instanceof CatalogError) {
        return sendError(reply, request.requestId, error.code, error.message);
      }
      throw error;
    }
  });

  app.get<{ Params: { mediaId: string } }>(
    "/v1/media/:mediaId",
    async (request, reply) => {
      const { mediaId } = request.params;

      try {
        const detail = await getMediaDetail(mediaId);

        const body: ApiSuccessResponse<MediaDetail> = {
          data: detail,
          requestId: request.requestId,
        };

        return reply.send(body);
      } catch (error) {
        if (error instanceof CatalogError) {
          return sendError(reply, request.requestId, error.code, error.message);
        }
        throw error;
      }
    },
  );

  app.get<{ Params: { mediaId: string; seasonNumber: string } }>(
    "/v1/media/:mediaId/seasons/:seasonNumber",
    async (request, reply) => {
      const { mediaId, seasonNumber } = request.params;

      try {
        const seasonEpisodes = await getSeasonEpisodes(
          mediaId,
          seasonNumber,
        );

        const body: ApiSuccessResponse<SeasonEpisodes> = {
          data: seasonEpisodes,
          requestId: request.requestId,
        };

        return reply.send(body);
      } catch (error) {
        if (error instanceof CatalogError) {
          return sendError(reply, request.requestId, error.code, error.message);
        }
        throw error;
      }
    },
  );

  app.get<{ Params: { mediaId: string } }>(
    "/v1/media/:mediaId/sources",
    async (request, reply) => {
      const { mediaId } = request.params;

      if (!UUID_PATTERN.test(mediaId)) {
        return sendError(
          reply,
          request.requestId,
          "INVALID_ARGUMENT",
          "mediaId debe ser un identificador válido",
        );
      }

      const media = await catalogRepository.findMediaById(mediaId);

      if (!media) {
        return sendError(
          reply,
          request.requestId,
          "MEDIA_NOT_FOUND",
          "No existe el contenido solicitado",
        );
      }

      const rows = await db
        .select()
        .from(schema.sources)
        .where(eq(schema.sources.mediaItemId, mediaId));

      const body: ApiSuccessResponse<SourceList> = {
        data: { sources: rows.map(toSourceSummary) },
        requestId: request.requestId,
      };

      return reply.send(body);
    },
  );

  app.get<{ Params: { mediaId: string } }>(
    "/v1/media/:mediaId/playback",
    async (request, reply) => {
      const { mediaId } = request.params;

      if (!UUID_PATTERN.test(mediaId)) {
        return sendError(
          reply,
          request.requestId,
          "INVALID_ARGUMENT",
          "mediaId debe ser un identificador válido",
        );
      }

      const source = await findActiveSource(mediaId);

      if (!source) {
        return sendError(
          reply,
          request.requestId,
          "SOURCE_NOT_FOUND",
          "No existe una fuente activa para el contenido solicitado",
        );
      }

      const body: ApiSuccessResponse<PlaybackReference> = {
        data: { mediaId, playbackUrl: source.playbackUrl },
        requestId: request.requestId,
      };

      return reply.send(body);
    },
  );
}
