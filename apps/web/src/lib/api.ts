import type {
  ApiSuccessResponse,
  FeaturedContent,
  MediaDetail,
  MediaSummary,
  PageMeta,
  PlaybackReference,
  SeasonEpisodes,
} from "@cinestesia/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

async function requestEnvelope<T>(
  path: string,
): Promise<ApiSuccessResponse<T>> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  } catch (error) {
    console.error(`No se pudo contactar con la API en ${path}:`, error);
    throw new ApiRequestError(0, "No se pudo contactar con el servidor");
  }

  if (!response.ok) {
    let code = "INTERNAL_ERROR";
    try {
      const body = (await response.json()) as {
        error?: { code?: string; message?: string };
      };
      code = body.error?.code ?? code;
      console.error(`API ${path} respondió ${response.status}: ${code}`);
    } catch (parseError) {
      console.error(`API ${path} respondió ${response.status}:`, parseError);
    }
    throw new ApiRequestError(response.status, code);
  }

  return (await response.json()) as ApiSuccessResponse<T>;
}

async function request<T>(path: string): Promise<T> {
  const body = await requestEnvelope<T>(path);
  return body.data;
}

export function getFeatured(): Promise<FeaturedContent> {
  return request<FeaturedContent>("/v1/catalog/featured");
}

export function getMedia(mediaId: string): Promise<MediaDetail> {
  return request<MediaDetail>(`/v1/media/${mediaId}`);
}

export function getPlayback(mediaId: string): Promise<PlaybackReference> {
  return request<PlaybackReference>(`/v1/media/${mediaId}/playback`);
}

export function getSeason(
  mediaId: string,
  seasonNumber: number,
): Promise<SeasonEpisodes> {
  return request<SeasonEpisodes>(
    `/v1/media/${mediaId}/seasons/${seasonNumber}`,
  );
}

export async function getCatalog(
  page?: number,
  limit?: number,
): Promise<{ items: MediaSummary[]; meta: PageMeta }> {
  const params = new URLSearchParams();
  if (page !== undefined) params.set("page", String(page));
  if (limit !== undefined) params.set("limit", String(limit));

  const query = params.toString();
  const body = await requestEnvelope<MediaSummary[]>(
    `/v1/media${query ? `?${query}` : ""}`,
  );

  const meta = body.meta as PageMeta | undefined;
  if (
    !meta ||
    typeof meta.page !== "number" ||
    typeof meta.limit !== "number" ||
    typeof meta.total !== "number"
  ) {
    console.error("GET /v1/media respondió sin meta de paginación válida");
    throw new ApiRequestError(500, "INTERNAL_ERROR");
  }

  return { items: body.data, meta };
}
