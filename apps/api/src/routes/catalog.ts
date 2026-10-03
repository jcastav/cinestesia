import type { ApiSuccessResponse, FeaturedContent } from "@cinestesia/shared";
import type { FastifyInstance } from "fastify";
import { getFeatured } from "../catalog/service";

export async function registerCatalogRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/v1/catalog/featured", async (request, reply) => {
    const items = await getFeatured();

    const body: ApiSuccessResponse<FeaturedContent> = {
      data: {
        sections: [
          {
            id: "featured",
            title: "Destacados",
            items,
          },
        ],
      },
      requestId: request.requestId,
    };

    return reply.send(body);
  });
}
