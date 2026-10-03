import type { MediaType } from "@cinestesia/shared";
import type { CandidateExternalId, DiscoveredItemInput } from "./adapter";
import { DiscoveryError } from "./errors";

/**
 * Normalización del candidato descubierto (§6.44 §19, contratos §2).
 *
 * Fase B de v0.3: motor puro, sin red ni base de datos. Transforma la entrada
 * común de un adapter (contrato conceptual §3) en `normalized_data` y deriva el
 * slug base para la creación de MediaItem (Fase D). Los campos inválidos no
 * abortan el candidato salvo la identidad (provider/externalId/title): se
 * descartan, se registra el motivo en `issues` (AGENTS §6: no ocultar errores)
 * y la validación editorial completa vive en la Fase D (§28).
 *
 * Límites alineados con `catalog/validation.ts` para que la Fase D pueda crear
 * el MediaItem sin sobreescribir reglas:
 * - title/originalTitle ≤ 500, synopsis ≤ 5000 (MAX_TEXT / 5000)
 * - releaseYear entero 1..9999, runtimeSeconds entero 1..2147483647
 * - URLs http(s) con el mismo patrón que optionalHttpUrl
 * - namespace ≤ 64, externalId ≤ 255 (§7.27), únicos por (namespace, externalId)
 * - slug ≤ 100 y patrón ^[a-z0-9]+(-[a-z0-9]+)*$ (SLUG_PATTERN)
 */

const MAX_TEXT = 500;
const MAX_SYNOPSIS = 5000;
const MAX_SLUG = 100;
const MAX_PROVIDER = 100;
const MAX_EXTERNAL_ID = 255;
const MAX_NAMESPACE = 64;
const MAX_YEAR = 9999;
const MAX_RUNTIME = 2147483647;
const HTTP_URL = /^https?:\/\/\S+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** §6.44 §19 — contenido normalizado persistido en `normalized_data` (jsonb). */
export type NormalizedContent = {
  provider: string;
  externalId: string;
  title: string;
  originalTitle: string | null;
  mediaType: MediaType;
  releaseYear: number | null;
  releaseDate: string | null;
  runtimeSeconds: number | null;
  synopsis: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  externalIds: CandidateExternalId[];
  slugBase: string;
  issues: string[];
};

const MEDIA_TYPES: Record<string, MediaType> = {
  movie: "MOVIE",
  film: "MOVIE",
  pelicula: "MOVIE",
  series: "SERIES",
  serie: "SERIES",
  tv_show: "SERIES",
  tvshow: "SERIES",
  show: "SERIES",
  documentary: "DOCUMENTARY",
  documental: "DOCUMENTARY",
  short: "SHORT",
  short_film: "SHORT",
  cortometraje: "SHORT",
  concert: "CONCERT",
  concierto: "CONCERT",
  clip: "CLIP",
  special: "SPECIAL",
  especial: "SPECIAL",
};

/** §7.27 — slug derivado del título (sin acentos, minúsculas, guiones simples). */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function describe(value: unknown): string {
  return typeof value === "string" ? `"${value}"` : String(value);
}

function requireText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string") {
    throw new DiscoveryError("INVALID_ARGUMENT", `${field} debe ser una cadena`);
  }
  const cleaned = collapse(value);
  if (cleaned.length === 0) {
    throw new DiscoveryError("INVALID_ARGUMENT", `${field} es obligatorio`);
  }
  if (cleaned.length > max) {
    throw new DiscoveryError(
      "INVALID_ARGUMENT",
      `${field} excede ${max} caracteres`,
    );
  }
  return cleaned;
}

function optionalText(
  value: unknown,
  field: string,
  issues: string[],
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    issues.push(`${field} inválido (no es cadena); se descartó`);
    return null;
  }
  const cleaned = collapse(value);
  return cleaned.length === 0 ? null : cleaned;
}

function truncate(
  value: string | null,
  max: number,
  field: string,
  issues: string[],
): string | null {
  if (value === null || value.length <= max) return value;
  issues.push(`${field} excede ${max} caracteres; se truncó`);
  return value.slice(0, max);
}

function mapMediaType(value: unknown, issues: string[]): MediaType {
  if (value === null || value === undefined || value === "") {
    issues.push("type ausente; se usa OTHER");
    return "OTHER";
  }
  if (typeof value !== "string") {
    issues.push("type inválido (no es cadena); se usa OTHER");
    return "OTHER";
  }
  const key = collapse(value)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const mapped = MEDIA_TYPES[key];
  if (mapped === undefined) {
    issues.push(`type desconocido ${describe(value)}; se usa OTHER`);
    return "OTHER";
  }
  return mapped;
}

function normalizeDates(
  yearValue: unknown,
  dateValue: unknown,
  issues: string[],
): { releaseYear: number | null; releaseDate: string | null } {
  let releaseDate: string | null = null;
  if (dateValue !== null && dateValue !== undefined && dateValue !== "") {
    const raw = typeof dateValue === "string" ? dateValue.trim() : "";
    if (!ISO_DATE.test(raw) || Number.isNaN(Date.parse(raw))) {
      issues.push(`releaseDate inválida descartada: ${describe(dateValue)}`);
    } else {
      releaseDate = raw;
    }
  }

  let releaseYear: number | null = null;
  if (yearValue !== null && yearValue !== undefined && yearValue !== "") {
    let parsed: number;
    if (typeof yearValue === "number") {
      parsed = yearValue;
    } else if (
      typeof yearValue === "string" &&
      /^\d{1,4}$/.test(yearValue.trim())
    ) {
      parsed = Number(yearValue.trim());
    } else {
      parsed = Number.NaN;
    }
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_YEAR) {
      issues.push(`releaseYear inválido descartado: ${describe(yearValue)}`);
    } else {
      releaseYear = parsed;
    }
  }

  if (releaseYear === null && releaseDate !== null) {
    releaseYear = Number(releaseDate.slice(0, 4));
  }
  if (
    releaseYear !== null &&
    releaseDate !== null &&
    Number(releaseDate.slice(0, 4)) !== releaseYear
  ) {
    issues.push(
      `releaseYear ${releaseYear} no coincide con releaseDate ${releaseDate}`,
    );
  }

  return { releaseYear, releaseDate };
}

function normalizeRuntime(value: unknown, issues: string[]): number | null {
  if (value === null || value === undefined || value === "") return null;
  let parsed: number;
  if (typeof value === "number") {
    parsed = value;
  } else if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    parsed = Number(value.trim());
  } else {
    parsed = Number.NaN;
  }
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_RUNTIME) {
    issues.push(`runtimeSeconds inválido descartado: ${describe(value)}`);
    return null;
  }
  return parsed;
}

function normalizeUrl(
  value: unknown,
  field: string,
  issues: string[],
): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !HTTP_URL.test(value.trim())) {
    issues.push(`${field} inválida descartada: ${describe(value)}`);
    return null;
  }
  return value.trim();
}

function normalizeExternalIds(
  value: unknown,
  issues: string[],
): CandidateExternalId[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    issues.push("externalIds inválido (no es arreglo); se descartó");
    return [];
  }
  const seen = new Set<string>();
  const result: CandidateExternalId[] = [];
  for (const entry of value) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      issues.push(`externalId inválido descartado: ${describe(entry)}`);
      continue;
    }
    const record = entry as Record<string, unknown>;
    const namespace =
      typeof record["namespace"] === "string"
        ? collapse(record["namespace"])
        : "";
    const externalId =
      typeof record["externalId"] === "string"
        ? collapse(record["externalId"])
        : "";
    if (
      namespace.length === 0 ||
      namespace.length > MAX_NAMESPACE ||
      externalId.length === 0 ||
      externalId.length > MAX_EXTERNAL_ID
    ) {
      issues.push(
        `externalId inválido descartado: ${namespace || "?"}/${externalId || "?"}`,
      );
      continue;
    }
    const key = JSON.stringify([namespace, externalId]);
    if (seen.has(key)) {
      issues.push(`externalId duplicado descartado: ${namespace}/${externalId}`);
      continue;
    }
    seen.add(key);
    const externalUrl = normalizeUrl(
      record["externalUrl"],
      "externalUrl",
      issues,
    );
    result.push({ namespace, externalId, externalUrl });
  }
  return result;
}

/** §6.44 §19 — RAW → NORMALIZADO. Tira `DiscoveryError` con INVALID_ARGUMENT. */
export function normalizeContent(input: DiscoveredItemInput): NormalizedContent {
  const issues: string[] = [];

  if (
    input.raw === null ||
    typeof input.raw !== "object" ||
    Array.isArray(input.raw)
  ) {
    throw new DiscoveryError(
      "INVALID_ARGUMENT",
      "raw debe ser un objeto con el payload original del adapter",
    );
  }

  const provider = requireText(input.provider, "provider", MAX_PROVIDER);
  const externalId = requireText(input.externalId, "externalId", MAX_EXTERNAL_ID);

  if (typeof input.title !== "string") {
    throw new DiscoveryError("INVALID_ARGUMENT", "title debe ser una cadena");
  }
  const cleanedTitle = collapse(input.title);
  if (cleanedTitle.length === 0) {
    throw new DiscoveryError("INVALID_ARGUMENT", "title es obligatorio");
  }
  const title = truncate(cleanedTitle, MAX_TEXT, "title", issues);
  if (title === null) {
    throw new DiscoveryError("INVALID_ARGUMENT", "title es obligatorio");
  }

  const slugBase = slugify(title);
  if (slugBase.length === 0) {
    throw new DiscoveryError(
      "INVALID_ARGUMENT",
      `title ${describe(input.title)} no produce un slug válido`,
    );
  }
  const slug =
    slugBase.length > MAX_SLUG
      ? slugBase.slice(0, MAX_SLUG).replace(/-+$/, "")
      : slugBase;
  if (slug !== slugBase) {
    issues.push(`slugBase excede ${MAX_SLUG} caracteres; se truncó`);
  }

  const { releaseYear, releaseDate } = normalizeDates(
    input.releaseYear,
    input.releaseDate,
    issues,
  );

  return {
    provider,
    externalId,
    title,
    originalTitle: truncate(
      optionalText(input.originalTitle, "originalTitle", issues),
      MAX_TEXT,
      "originalTitle",
      issues,
    ),
    mediaType: mapMediaType(input.type, issues),
    releaseYear,
    releaseDate,
    runtimeSeconds: normalizeRuntime(input.runtimeSeconds, issues),
    synopsis: truncate(
      optionalText(input.synopsis, "synopsis", issues),
      MAX_SYNOPSIS,
      "synopsis",
      issues,
    ),
    posterUrl: normalizeUrl(input.posterUrl, "posterUrl", issues),
    backdropUrl: normalizeUrl(input.backdropUrl, "backdropUrl", issues),
    externalIds: normalizeExternalIds(input.externalIds, issues),
    slugBase: slug,
    issues,
  };
}

/**
 * Identidad persistible (Fase C): si la normalización falla, un candidato con
 * identidad estable se guarda en `FAILED` con su error; sin ella solo queda el
 * error del run (no existe fila posible — §6.44 §67 exige provider/externalId).
 */
export function hasStableIdentity(input: DiscoveredItemInput): boolean {
  return (
    typeof input.provider === "string" &&
    input.provider.trim().length > 0 &&
    input.provider.trim().length <= MAX_PROVIDER &&
    typeof input.externalId === "string" &&
    input.externalId.trim().length > 0 &&
    input.externalId.trim().length <= MAX_EXTERNAL_ID
  );
}
