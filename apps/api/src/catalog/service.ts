import type {
  MediaDetail,
  MediaSummary,
  SeasonEpisodes,
} from "@cinestesia/shared";
import type { MediaItemRow } from "../db/schema";
import { UUID_PATTERN } from "../lib/uuid";
import { CatalogError } from "./errors";
import * as mapper from "./mapper";
import { parsePageParams } from "./pagination";
import * as repository from "./repository";
import { validateCreate, validatePatch } from "./validation";

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

async function buildDetail(row: MediaItemRow): Promise<MediaDetail> {
  const [genres, seasons] = await Promise.all([
    repository.findGenreNamesForMedia(row.id),
    repository.findSeasonsForMedia(row.id),
  ]);

  return mapper.toMediaDetail(row, genres, seasons);
}

async function executeWrite<T>(
  fn: (tx: repository.Transaction) => Promise<T>,
): Promise<T> {
  try {
    return await repository.runTransaction(fn);
  } catch (error) {
    if (repository.isUniqueViolation(error)) {
      throw new CatalogError(
        "CONFLICT",
        "Conflicto de unicidad: el recurso ya existe",
      );
    }
    throw error;
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

  return buildDetail(row);
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

export async function createMedia(raw: unknown): Promise<MediaDetail> {
  const input = validateCreate(raw);

  const row = await executeWrite(async (tx) => {
    const existing = await repository.findMediaBySlugWithin(
      tx,
      input.values.slug,
    );
    if (existing) {
      throw new CatalogError("CONFLICT", "Ya existe contenido con ese slug");
    }

    for (const external of input.externalIds) {
      const conflict = await repository.findExternalIdWithin(
        tx,
        external.namespace,
        external.externalId,
      );
      if (conflict) {
        throw new CatalogError(
          "CONFLICT",
          `externalId ya registrado: ${external.namespace}/${external.externalId}`,
        );
      }
    }

    const created = await repository.insertMedia(tx, input.values);
    await repository.replaceGenres(tx, created.id, input.genres);
    await repository.replaceExternalIds(tx, created.id, input.externalIds);
    return created;
  });

  return buildDetail(row);
}

export async function updateMedia(
  identifier: string,
  raw: unknown,
): Promise<MediaDetail> {
  if (!identifier || identifier.length > MAX_IDENTIFIER_LENGTH) {
    throw new CatalogError(
      "INVALID_ARGUMENT",
      "mediaId debe ser un identificador válido",
    );
  }

  const input = validatePatch(raw);

  const row = await executeWrite(async (tx) => {
    const existing = UUID_PATTERN.test(identifier)
      ? await repository.findMediaByIdWithin(tx, identifier)
      : await repository.findMediaBySlugWithin(tx, identifier);

    if (!existing) {
      throw new CatalogError(
        "MEDIA_NOT_FOUND",
        "No existe el contenido solicitado",
      );
    }

    if (
      input.values.slug !== undefined &&
      input.values.slug !== existing.slug
    ) {
      const conflict = await repository.findMediaBySlugWithin(
        tx,
        input.values.slug,
      );
      if (conflict) {
        throw new CatalogError("CONFLICT", "Ya existe contenido con ese slug");
      }
    }

    if (input.externalIds !== undefined) {
      for (const external of input.externalIds) {
        const conflict = await repository.findExternalIdWithin(
          tx,
          external.namespace,
          external.externalId,
        );
        if (conflict && conflict.mediaItemId !== existing.id) {
          throw new CatalogError(
            "CONFLICT",
            `externalId ya registrado por otro contenido: ${external.namespace}/${external.externalId}`,
          );
        }
      }
    }

    const updated = await repository.updateMedia(tx, existing.id, {
      ...input.values,
      version: existing.version + 1,
    });

    if (input.genres !== undefined) {
      await repository.replaceGenres(tx, existing.id, input.genres);
    }
    if (input.externalIds !== undefined) {
      await repository.replaceExternalIds(tx, existing.id, input.externalIds);
    }

    return updated;
  });

  return buildDetail(row);
}
