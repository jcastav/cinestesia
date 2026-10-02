import type { ApiSuccessResponse, FeaturedContent } from "@cinestesia/shared";
import type { FastifyInstance } from "fastify";
import { db, schema } from "../db";
import { toMediaSummary } from "../lib/media-mapper";

const FEATURED_LIMIT = 20;

export async function registerCatalogRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/v1/catalog/featured", async (request, reply) => {
    const rows = await db
      .select()
      .from(schema.mediaItems)
      .orderBy(schema.mediaItems.createdAt)
      .limit(FEATURED_LIMIT);

    const body: ApiSuccessResponse<FeaturedContent> = {
      data: {
        sections: [
          {
            id: "featured",
            title: "Destacados",
            items: rows.map(toMediaSummary),
          },
        ],
      },
      requestId: request.requestId,
    };

    return reply.send(body);
  });
}
