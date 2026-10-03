import { CatalogError } from "./errors";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const MEDIA_TYPES = [
  "MOVIE",
  "SERIES",
  "DOCUMENTARY",
  "SHORT",
  "CONCERT",
  "CLIP",
  "SPECIAL",
  "OTHER",
] as const;

const PUBLICATION_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

const PRODUCTION_STATUSES = [
  "UPCOMING",
  "ONGOING",
  "ENDED",
  "UNKNOWN",
] as const;

const CREATE_FIELDS = new Set([
  "slug",
  "mediaType",
  "canonicalTitle",
  "originalTitle",
  "synopsis",
  "releaseDate",
  "releaseYear",
  "runtimeSeconds",
  "publicationStatus",
  "productionStatus",
  "posterUrl",
  "backdropUrl",
  "genres",
  "externalIds",
]);

const MAX_TEXT = 500;
const MAX_URL = 2000;

function invalid(message: string): never {
  throw new CatalogError("INVALID_ARGUMENT", message);
}

function assertObject(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    invalid("body debe ser un objeto JSON");
  }
  return raw as Record<string, unknown>;
}

function assertKnownFields(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    if (!CREATE_FIELDS.has(key)) {
      invalid(`campo desconocido: ${key}`);
    }
  }
}

function requireString(
  obj: Record<string, unknown>,
  field: string,
  maxLength: number,
): string {
  const value = obj[field];
  if (typeof value !== "string") {
    invalid(`${field} debe ser una cadena`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    invalid(`${field} debe tener entre 1 y ${maxLength} caracteres`);
  }
  return trimmed;
}

function optionalText(
  obj: Record<string, unknown>,
  field: string,
  maxLength: number,
): string | null | undefined {
  const value = obj[field];
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    invalid(`${field} debe ser una cadena o null`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    invalid(`${field} debe tener entre 1 y ${maxLength} caracteres o null`);
  }
  return trimmed;
}

function optionalHttpUrl(
  obj: Record<string, unknown>,
  field: string,
): string | null | undefined {
  const value = optionalText(obj, field, MAX_URL);
  if (value === undefined || value === null) return value;
  if (!/^https?:\/\/\S+$/.test(value)) {
    invalid(`${field} debe ser una URL http(s) válida`);
  }
  return value;
}

function optionalEnum<T extends string>(
  obj: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
): T | undefined {
  const value = obj[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    invalid(`${field} debe ser uno de: ${allowed.join(", ")}`);
  }
  return value as T;
}

function optionalDate(
  obj: Record<string, unknown>,
  field: string,
): string | null | undefined {
  const value = obj[field];
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    invalid(`${field} debe tener formato YYYY-MM-DD`);
  }

  // V8 hace rollover de fechas inexistentes (2023-02-29 → 2023-03-01):
  // se reconstruye la fecha para comprobar que los componentes cuadran.
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year!, month! - 1, day!));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month! - 1 ||
    parsed.getUTCDate() !== day
  ) {
    invalid(`${field} no es una fecha de calendario válida`);
  }

  return value;
}

function optionalInteger(
  obj: Record<string, unknown>,
  field: string,
  min: number,
  max: number,
): number | null | undefined {
  const value = obj[field];
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    invalid(`${field} debe ser un entero entre ${min} y ${max}`);
  }
  return value;
}

export interface AdminGenreInput {
  slug: string;
  name: string;
}

export interface AdminExternalIdInput {
  namespace: string;
  externalId: string;
  externalUrl?: string | null;
}

/** Campos listos para persistir en `media_items`. */
export interface MediaFields {
  slug?: string;
  mediaType?: string;
  canonicalTitle?: string;
  originalTitle?: string | null;
  synopsis?: string | null;
  releaseDate?: string | null;
  releaseYear?: number | null;
  runtimeSeconds?: number | null;
  publicationStatus?: string;
  productionStatus?: string | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
}

export interface ValidatedCreate {
  values: Required<Pick<MediaFields, "slug" | "mediaType" | "canonicalTitle">> &
    MediaFields;
  genres: AdminGenreInput[];
  externalIds: AdminExternalIdInput[];
}

export interface ValidatedPatch {
  values: MediaFields;
  genres?: AdminGenreInput[];
  externalIds?: AdminExternalIdInput[];
}

function nameFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeGenres(raw: unknown): AdminGenreInput[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    invalid("genres debe ser un arreglo de slugs");
  }

  const bySlug = new Map<string, AdminGenreInput>();
  for (const item of raw) {
    if (typeof item !== "string") {
      invalid("genres debe contener solo slugs (cadenas)");
    }
    const slug = item.trim();
    if (slug.length === 0 || slug.length > 100 || !SLUG_PATTERN.test(slug)) {
      invalid(
        `slug de género inválido: ${item} (minúsculas, dígitos y guiones)`,
      );
    }
    if (!bySlug.has(slug)) {
      bySlug.set(slug, { slug, name: nameFromSlug(slug) });
    }
  }

  return [...bySlug.values()];
}

function normalizeExternalIds(raw: unknown): AdminExternalIdInput[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    invalid("externalIds debe ser un arreglo");
  }

  const seen = new Set<string>();
  const result: AdminExternalIdInput[] = [];

  for (const item of raw) {
    const obj = assertObject(item);
    for (const key of Object.keys(obj)) {
      if (!["namespace", "externalId", "externalUrl"].includes(key)) {
        invalid(`campo desconocido en externalIds: ${key}`);
      }
    }
    if (obj["namespace"] === undefined || obj["externalId"] === undefined) {
      invalid("cada externalId requiere namespace y externalId");
    }

    const namespace = requireString(obj, "namespace", 64);
    const externalId = requireString(obj, "externalId", 255);
    const externalUrl = optionalHttpUrl(obj, "externalUrl");

    const key = `${namespace}\u0000${externalId}`;
    if (seen.has(key)) {
      invalid(`externalId duplicado en el body: ${namespace}/${externalId}`);
    }
    seen.add(key);

    result.push({
      namespace,
      externalId,
      ...(externalUrl !== undefined ? { externalUrl } : {}),
    });
  }

  return result;
}

export function validateCreate(raw: unknown): ValidatedCreate {
  const obj = assertObject(raw);
  assertKnownFields(obj);

  if (
    obj["slug"] === undefined ||
    obj["mediaType"] === undefined ||
    obj["canonicalTitle"] === undefined
  ) {
    invalid("slug, mediaType y canonicalTitle son obligatorios");
  }

  const slug = requireString(obj, "slug", 255);
  if (!SLUG_PATTERN.test(slug)) {
    invalid("slug inválido (minúsculas, dígitos y guiones sin repetir)");
  }

  const mediaType = optionalEnum(obj, "mediaType", MEDIA_TYPES);
  if (mediaType === undefined) {
    invalid("mediaType es obligatorio");
  }

  const canonicalTitle = requireString(obj, "canonicalTitle", MAX_TEXT);

  const publicationStatus =
    optionalEnum(obj, "publicationStatus", PUBLICATION_STATUSES) ?? "DRAFT";

  const values: ValidatedCreate["values"] = {
    slug,
    mediaType,
    canonicalTitle,
    publicationStatus,
    originalTitle: optionalText(obj, "originalTitle", MAX_TEXT),
    synopsis: optionalText(obj, "synopsis", 5000),
    releaseDate: optionalDate(obj, "releaseDate"),
    releaseYear: optionalInteger(obj, "releaseYear", 1, 9999),
    runtimeSeconds: optionalInteger(obj, "runtimeSeconds", 1, 2147483647),
    productionStatus: optionalEnum(obj, "productionStatus", PRODUCTION_STATUSES),
    posterUrl: optionalHttpUrl(obj, "posterUrl"),
    backdropUrl: optionalHttpUrl(obj, "backdropUrl"),
  };

  return {
    values,
    genres: normalizeGenres(obj["genres"]),
    externalIds: normalizeExternalIds(obj["externalIds"]),
  };
}

export function validatePatch(raw: unknown): ValidatedPatch {
  const obj = assertObject(raw);
  assertKnownFields(obj);

  if (Object.keys(obj).length === 0) {
    invalid("body sin campos para actualizar");
  }

  const values: MediaFields = {};

  if (obj["slug"] !== undefined) {
    const slug = requireString(obj, "slug", 255);
    if (!SLUG_PATTERN.test(slug)) {
      invalid("slug inválido (minúsculas, dígitos y guiones sin repetir)");
    }
    values.slug = slug;
  }
  if (obj["mediaType"] !== undefined) {
    const mediaType = optionalEnum(obj, "mediaType", MEDIA_TYPES);
    if (mediaType === undefined) {
      invalid("mediaType no puede ser null");
    }
    values.mediaType = mediaType;
  }
  if (obj["canonicalTitle"] !== undefined) {
    values.canonicalTitle = requireString(obj, "canonicalTitle", MAX_TEXT);
  }
  if (obj["publicationStatus"] !== undefined) {
    const status = optionalEnum(obj, "publicationStatus", PUBLICATION_STATUSES);
    if (status === undefined) {
      invalid("publicationStatus no puede ser null");
    }
    values.publicationStatus = status;
  }

  values.originalTitle = optionalText(obj, "originalTitle", MAX_TEXT);
  values.synopsis = optionalText(obj, "synopsis", 5000);
  values.releaseDate = optionalDate(obj, "releaseDate");
  values.releaseYear = optionalInteger(obj, "releaseYear", 1, 9999);
  values.runtimeSeconds = optionalInteger(obj, "runtimeSeconds", 1, 2147483647);
  values.productionStatus = optionalEnum(
    obj,
    "productionStatus",
    PRODUCTION_STATUSES,
  );
  values.posterUrl = optionalHttpUrl(obj, "posterUrl");
  values.backdropUrl = optionalHttpUrl(obj, "backdropUrl");

  for (const key of Object.keys(values)) {
    if (values[key as keyof MediaFields] === undefined) {
      delete values[key as keyof MediaFields];
    }
  }

  return {
    values,
    ...(obj["genres"] !== undefined
      ? { genres: normalizeGenres(obj["genres"]) }
      : {}),
    ...(obj["externalIds"] !== undefined
      ? { externalIds: normalizeExternalIds(obj["externalIds"]) }
      : {}),
  };
}
