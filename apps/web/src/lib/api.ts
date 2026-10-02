import type {
  ApiSuccessResponse,
  FeaturedContent,
  MediaDetail,
  PlaybackReference,
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

async function request<T>(path: string): Promise<T> {
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

  const body = (await response.json()) as ApiSuccessResponse<T>;
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
