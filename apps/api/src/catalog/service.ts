import type {
  MediaDetail,
  MediaSummary,
  MediaType,
  SeasonEpisodes,
} from "@cinestesia/shared";
import type { MediaItemRow } from "../db/schema";
import { UUID_PATTERN } from "../lib/uuid";
import { CatalogError } from "./errors";
import * as mapper from "./mapper";
import { parsePageParams } from "./pagination";
import * as repository from "./repository";
import {
  validateCreate,
  validatePatch,
  type AdminExternalIdInput,
} from "./validation";

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

/**
 * §6.44 §46 — variante admin: devuelve el detalle con cualquier
 * `publicationStatus` (DRAFT/ARCHIVED) para que el operador pueda ver el
 * contenido ingerido antes de publicarlo. Ruta `GET /v1/admin/media/:mediaId`.
 */
export async function getAdminMediaDetail(
  identifier: string,
): Promise<MediaDetail> {
  const row = await resolveMedia(identifier);
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

/* ------------------------------------------------------------------ *
 * Application Service de Discovery/Ingestion (§6.44 §44, §7.27).
 *
 * Discovery & Ingestion consume el catálogo SOLO por estas funciones:
 * son el contrato de aplicación que conserva la frontera (§44) — el SQL
 * de `media_items`/`media_external_ids` vive únicamente en
 * `catalog/repository.ts` (AGENTS §5, Boundary Rule §39).
 * ------------------------------------------------------------------ */

/** Clave de comparación de títulos: minúsculas, sin acentos, espacios colapsados. */
export function normalizeTitleKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** §6.44 §22 Nivel 1 — entidad conocida por (namespace ≡ provider) + externalId. */
export async function findMediaItemByExternalId(
  namespace: string,
  externalId: string,
): Promise<MediaItemRow | undefined> {
  return repository.findMediaItemByExternalId(namespace, externalId);
}

/**
 * §6.44 §22 Nivel 2 — entidades por título normalizado + año + tipo.
 * `releaseYear === null` busca sólo por título+tipo (el matching decide la
 * política conservadora); compara `canonicalTitle` y `originalTitle`.
 */
export async function findMediaItemsByTitleYearType(
  title: string,
  releaseYear: number | null,
  mediaType: MediaType,
): Promise<MediaItemRow[]> {
  const rows = await repository.findMediaItemsByTypeAndYear(
    mediaType,
    releaseYear,
  );
  const key = normalizeTitleKey(title);
  if (key.length === 0) {
    return [];
  }
  return rows.filter((row) => {
    if (normalizeTitleKey(row.canonicalTitle) === key) {
      return true;
    }
    return (
      row.originalTitle !== null &&
      normalizeTitleKey(row.originalTitle) === key
    );
  });
}

/** Borrador canónico de ingesta (§6.44 §46: SIEMPRE `publicationStatus = DRAFT`). */
export interface IngestionDraft {
  slugBase: string;
  canonicalTitle: string;
  originalTitle?: string | null;
  mediaType: MediaType;
  synopsis?: string | null;
  releaseDate?: string | null;
  releaseYear?: number | null;
  runtimeSeconds?: number | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  /** Identidad primaria del candidato: su conflicto aborta la ingesta. */
  primaryExternalId: AdminExternalIdInput;
  externalIds: AdminExternalIdInput[];
}

const MAX_SLUG_ATTEMPTS = 50;

/**
 * §6.44 §44/§46 — crea el `MediaItem` de un candidato NO_MATCH como DRAFT,
 * reutilizando las reglas de `validateCreate` (defensa en profundidad) y con:
 * - resolución de slug único (`base`, `base-2`, …) sin pisar contenido existente;
 * - identidad primaria ya presente en el catálogo → CONFLICT (debería haber
 *   resuelto en Nivel 1; es una colisión de carrera a revisar);
 * - externalIds secundarios ya enlazados a otra entidad → se omiten (no se roban).
 */
export async function createMediaItemFromIngestion(
  draft: IngestionDraft,
): Promise<MediaItemRow> {
  const input = validateCreate({
    slug: draft.slugBase,
    mediaType: draft.mediaType,
    canonicalTitle: draft.canonicalTitle,
    publicationStatus: "DRAFT",
    originalTitle: draft.originalTitle ?? undefined,
    synopsis: draft.synopsis ?? undefined,
    releaseDate: draft.releaseDate ?? undefined,
    releaseYear: draft.releaseYear ?? undefined,
    runtimeSeconds: draft.runtimeSeconds ?? undefined,
    posterUrl: draft.posterUrl ?? undefined,
    backdropUrl: draft.backdropUrl ?? undefined,
    externalIds: draft.externalIds,
  });

  const primary = input.externalIds.find(
    (item) =>
      item.namespace === draft.primaryExternalId.namespace &&
      item.externalId === draft.primaryExternalId.externalId,
  );

  return executeWrite(async (tx) => {
    let slug = input.values.slug;
    for (let attempt = 2; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
      const existing = await repository.findMediaBySlugWithin(tx, slug);
      if (!existing) {
        break;
      }
      if (attempt === MAX_SLUG_ATTEMPTS) {
        throw new CatalogError(
          "CONFLICT",
          `No se encontró un slug libre para ${draft.canonicalTitle}`,
        );
      }
      slug = `${input.values.slug}-${attempt}`;
    }

    const linkable: AdminExternalIdInput[] = [];
    for (const external of input.externalIds) {
      const conflict = await repository.findExternalIdWithin(
        tx,
        external.namespace,
        external.externalId,
      );
      if (!conflict) {
        linkable.push(external);
        continue;
      }
      if (external === primary) {
        throw new CatalogError(
          "CONFLICT",
          `externalId ya registrado: ${external.namespace}/${external.externalId}`,
        );
      }
    }

    const created = await repository.insertMedia(tx, {
      ...input.values,
      slug,
      publicationStatus: "DRAFT",
    });
    await repository.replaceExternalIds(tx, created.id, linkable);
    return created;
  });
}

/**
 * §6.44 §44 — enlaza externalIds de un candidato MATCHED a la entidad ya
 * existente (Nivel 1 ya tiene la identidad primaria enlazada; Nivel 2 la
 * añade). Los ids ya registrados por otra entidad se omiten sin robarlos.
 */
export async function linkExternalIdsFromIngestion(
  mediaId: string,
  externalIds: AdminExternalIdInput[],
): Promise<{ linked: number; skipped: number }> {
  return executeWrite(async (tx) => {
    let linked = 0;
    let skipped = 0;
    for (const external of externalIds) {
      const existing = await repository.findExternalIdWithin(
        tx,
        external.namespace,
        external.externalId,
      );
      if (existing) {
        skipped++;
        continue;
      }
      await repository.insertExternalIdWithin(tx, mediaId, external);
      linked++;
    }
    return { linked, skipped };
  });
}
