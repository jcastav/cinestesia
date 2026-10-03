import type {
  MediaDetail,
  MediaSummary,
  SeasonEpisodes,
} from "@cinestesia/shared";
import { UUID_PATTERN } from "../lib/uuid";
import { CatalogError } from "./errors";
import * as mapper from "./mapper";
import { parsePageParams } from "./pagination";
import * as repository from "./repository";

export { CatalogError } from "./errors";

const MAX_IDENTIFIER_LENGTH = 255;

async function resolveMedia(identifier: string) {
  if (!identifier || identifier.length > MAX_IDENTIFIER_LENGTH) {
    throw new CatalogError(
      "INVALID_ARGUMENT",
      "mediaId debe ser un identificador válido",
    );
  }

  const row = UUID_PATTERN.test(identifier)
    ? await repository.findMediaById(identifier)
    : await repository.findMediaBySlug(identifier);

  if (!row) {
    throw new CatalogError(
      "MEDIA_NOT_FOUND",
      "No existe el contenido solicitado",
    );
  }

  return row;
}

function assertPubliclyVisible(publicationStatus: string): void {
  if (publicationStatus !== "PUBLISHED") {
    throw new CatalogError(
      "MEDIA_NOT_FOUND",
      "No existe el contenido solicitado",
    );
  }
}

export async function getFeatured(): Promise<MediaSummary[]> {
  const rows = await repository.findFeaturedMedia();
  return rows.map(mapper.toMediaSummary);
}

export async function getCatalog(
  pageRaw?: string,
  limitRaw?: string,
): Promise<{ items: MediaSummary[]; meta: { page: number; limit: number; total: number } }> {
  const { page, limit } = parsePageParams(pageRaw, limitRaw);
  const { rows, total } = await repository.listPublishedMedia(page, limit);
  return {
    items: rows.map(mapper.toMediaSummary),
    meta: { page, limit, total },
  };
}

export async function getMediaDetail(
  identifier: string,
): Promise<MediaDetail> {
  const row = await resolveMedia(identifier);
  assertPubliclyVisible(row.publicationStatus);

  const [genres, seasons] = await Promise.all([
    repository.findGenreNamesForMedia(row.id),
    repository.findSeasonsForMedia(row.id),
  ]);

  return mapper.toMediaDetail(row, genres, seasons);
}

export async function getSeasonEpisodes(
  identifier: string,
  seasonNumberRaw: string,
): Promise<SeasonEpisodes> {
  if (!/^\d+$/.test(seasonNumberRaw) || Number(seasonNumberRaw) < 1) {
    throw new CatalogError(
      "INVALID_ARGUMENT",
      "seasonNumber debe ser un entero positivo",
    );
  }

  const seasonNumber = Number(seasonNumberRaw);
  const row = await resolveMedia(identifier);
  assertPubliclyVisible(row.publicationStatus);

  const season = await repository.findSeason(row.id, seasonNumber);

  if (!season) {
    throw new CatalogError(
      "SEASON_NOT_FOUND",
      "No existe la temporada solicitada",
    );
  }

  const episodes = await repository.findPublishedEpisodesForSeason(season.id);
  return mapper.toSeasonEpisodes(season, episodes);
}
