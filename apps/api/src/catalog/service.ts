import type {
  ApiErrorCode,
  MediaDetail,
  MediaSummary,
} from "@cinestesia/shared";
import { UUID_PATTERN } from "../lib/uuid";
import { toMediaDetail, toMediaSummary } from "./mapper";
import * as repository from "./repository";

export class CatalogError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "CatalogError";
    this.code = code;
  }
}

export async function getFeatured(): Promise<MediaSummary[]> {
  const rows = await repository.findFeaturedMedia();
  return rows.map(toMediaSummary);
}

export async function getMediaDetail(
  identifier: string,
): Promise<MediaDetail> {
  if (!UUID_PATTERN.test(identifier)) {
    throw new CatalogError(
      "INVALID_ARGUMENT",
      "mediaId debe ser un identificador válido",
    );
  }

  const row = await repository.findMediaById(identifier);

  if (!row) {
    throw new CatalogError(
      "MEDIA_NOT_FOUND",
      "No existe el contenido solicitado",
    );
  }

  return toMediaDetail(row);
}
