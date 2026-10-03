/**
 * Validación de las solicitudes admin de Discovery (§6.44 §60, §8.48).
 * Módulo puro: sin base de datos ni red, apto para tests unitarios.
 */

import { SLUG_PATTERN } from "../catalog/validation";
import type { NormalizedContent } from "./normalize";
import { DiscoveryError } from "./errors";

const RUN_FIELDS = ["adapterId", "mode", "query", "maxItems"];
const MAX_QUERY_LENGTH = 100_000;
const MAX_MAX_ITEMS = 250;
const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 50;
const MAX_PAGE = 1_000_000;

export interface CreateRunRequest {
  adapterId: string;
  mode: "FULL";
  query: string | null;
  maxItems: number | null;
}

export interface RunListRequest {
  page: number;
  limit: number;
}

export function invalidArgument(message: string): DiscoveryError {
  return new DiscoveryError("INVALID_ARGUMENT", message);
}

export function parseRunRequest(body: unknown): CreateRunRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw invalidArgument("el body debe ser un objeto JSON");
  }
  const record = body as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!RUN_FIELDS.includes(key)) {
      throw invalidArgument(`campo desconocido en el body: ${key}`);
    }
  }

  const adapterIdRaw = record["adapterId"];
  if (typeof adapterIdRaw !== "string") {
    throw invalidArgument(
      "adapterId es obligatorio (cadena de 1 a 100 caracteres)",
    );
  }
  const adapterId = adapterIdRaw.trim();
  if (adapterId.length === 0 || adapterId.length > 100) {
    throw invalidArgument(
      "adapterId es obligatorio (cadena de 1 a 100 caracteres)",
    );
  }

  const modeRaw = record["mode"] ?? "FULL";
  if (modeRaw !== "FULL") {
    throw invalidArgument(
      `mode "${String(modeRaw)}" no soportado; en v0.3 sólo se ejecuta FULL`,
    );
  }

  const queryRaw = record["query"];
  let query: string | null = null;
  if (queryRaw !== undefined && queryRaw !== null) {
    if (typeof queryRaw !== "string") {
      throw invalidArgument("query debe ser una cadena");
    }
    const trimmed = queryRaw.trim();
    if (trimmed.length > MAX_QUERY_LENGTH) {
      throw invalidArgument(`query excede ${MAX_QUERY_LENGTH} caracteres`);
    }
    query = trimmed.length > 0 ? trimmed : null;
  }

  const maxItemsRaw = record["maxItems"];
  let maxItems: number | null = null;
  if (maxItemsRaw !== undefined && maxItemsRaw !== null) {
    if (
      typeof maxItemsRaw !== "number" ||
      !Number.isInteger(maxItemsRaw) ||
      maxItemsRaw < 1 ||
      maxItemsRaw > MAX_MAX_ITEMS
    ) {
      throw invalidArgument(
        `maxItems debe ser un entero entre 1 y ${MAX_MAX_ITEMS}`,
      );
    }
    maxItems = maxItemsRaw;
  }

  return { adapterId, mode: "FULL", query, maxItems };
}

function parseListParam(
  raw: string | undefined,
  fallback: number,
  name: string,
  max: number,
): number {
  if (raw === undefined || raw === "") {
    return fallback;
  }
  if (!/^\d+$/.test(raw)) {
    throw invalidArgument(`${name} debe ser un entero positivo`);
  }
  const value = Number(raw);
  if (value < 1 || value > max) {
    throw invalidArgument(`${name} debe estar entre 1 y ${max}`);
  }
  return value;
}

/** §8.48 — colecciones con page/limit; nunca respuestas ilimitadas. */
export function parseRunListParams(
  pageRaw?: string,
  limitRaw?: string,
): RunListRequest {
  return {
    page: parseListParam(pageRaw, 1, "page", MAX_PAGE),
    limit: parseListParam(limitRaw, DEFAULT_LIST_LIMIT, "limit", MAX_LIST_LIMIT),
  };
}

/* ------------------------------------------------------------------ *
 * §6.44 §28 — Validation Engine (reglas de dominio antes de incorporar).
 * Módulo puro sobre el contenido ya normalizado (§19): distingue
 * ERROR / WARNING / INFO; sólo un ERROR bloquea la ingesta.
 * ------------------------------------------------------------------ */

export type ValidationLevel = "ERROR" | "WARNING" | "INFO";

export interface ValidationIssue {
  level: ValidationLevel;
  code: string;
  message: string;
}

/** Primer cine conocido: años anteriores son error de dominio (§28). */
const MIN_RELEASE_YEAR = 1888;
const MAX_RELEASE_YEAR = 9999;
const MAX_TITLE = 500;
const MAX_PROVIDER = 100;
const MAX_EXTERNAL_ID = 255;
const MAX_SLUG = 100;
const MAX_RUNTIME = 2147483647;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const MEDIA_TYPES: readonly string[] = [
  "MOVIE",
  "SERIES",
  "DOCUMENTARY",
  "SHORT",
  "CONCERT",
  "CLIP",
  "SPECIAL",
  "OTHER",
];

function issue(
  level: ValidationLevel,
  code: string,
  message: string,
): ValidationIssue {
  return { level, code, message };
}

/**
 * §6.44 §28 — reglas mínimas de dominio sobre `normalized_data`.
 * La normalización (§19) ya garantiza límites y saneamiento; aquí se
 * validan las reglas de negocio que §19 deliberadamente no impone
 * (año ≥ 1888, identidad completa, slug utilizable) y se trasladan los
 * `issues` de normalización como WARNING (visibles en Review Queue, E1).
 */
export function validateNormalizedContent(
  normalized: NormalizedContent,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (
    typeof normalized.title !== "string" ||
    normalized.title.trim().length === 0
  ) {
    issues.push(issue("ERROR", "TITLE_REQUIRED", "title es obligatorio"));
  } else if (normalized.title.length > MAX_TITLE) {
    issues.push(
      issue(
        "ERROR",
        "TITLE_TOO_LONG",
        `title excede ${MAX_TITLE} caracteres`,
      ),
    );
  }

  if (!MEDIA_TYPES.includes(normalized.mediaType)) {
    issues.push(
      issue("ERROR", "TYPE_INVALID", `type inválido: ${normalized.mediaType}`),
    );
  }

  if (normalized.releaseYear === null) {
    issues.push(
      issue(
        "WARNING",
        "YEAR_MISSING",
        "releaseYear ausente; el matching no podrá afirmar identidad por año",
      ),
    );
  } else if (
    !Number.isInteger(normalized.releaseYear) ||
    normalized.releaseYear < MIN_RELEASE_YEAR ||
    normalized.releaseYear > MAX_RELEASE_YEAR
  ) {
    issues.push(
      issue(
        "ERROR",
        "YEAR_OUT_OF_RANGE",
        `releaseYear ${normalized.releaseYear} fuera de rango (${MIN_RELEASE_YEAR}..${MAX_RELEASE_YEAR})`,
      ),
    );
  }

  if (
    typeof normalized.provider !== "string" ||
    normalized.provider.trim().length === 0 ||
    normalized.provider.length > MAX_PROVIDER ||
    typeof normalized.externalId !== "string" ||
    normalized.externalId.trim().length === 0 ||
    normalized.externalId.length > MAX_EXTERNAL_ID
  ) {
    issues.push(
      issue(
        "ERROR",
        "EXTERNAL_ID_INVALID",
        "provider/externalId incompletos o fuera de límite",
      ),
    );
  }

  if (
    typeof normalized.slugBase !== "string" ||
    normalized.slugBase.length === 0 ||
    normalized.slugBase.length > MAX_SLUG ||
    !SLUG_PATTERN.test(normalized.slugBase)
  ) {
    issues.push(
      issue("ERROR", "SLUG_INVALID", "slugBase no es un slug válido"),
    );
  }

  if (
    normalized.runtimeSeconds !== null &&
    (!Number.isInteger(normalized.runtimeSeconds) ||
      normalized.runtimeSeconds < 1 ||
      normalized.runtimeSeconds > MAX_RUNTIME)
  ) {
    issues.push(
      issue("ERROR", "RUNTIME_INVALID", "runtimeSeconds fuera de rango"),
    );
  }

  if (
    normalized.releaseDate !== null &&
    (!ISO_DATE.test(normalized.releaseDate) ||
      Number.isNaN(Date.parse(normalized.releaseDate)))
  ) {
    issues.push(
      issue("ERROR", "DATE_INVALID", `releaseDate inválida: ${normalized.releaseDate}`),
    );
  }

  for (const notice of normalized.issues) {
    issues.push(issue("WARNING", "NORMALIZATION_ISSUE", notice));
  }

  if (normalized.synopsis === null || normalized.synopsis.length === 0) {
    issues.push(issue("INFO", "SYNOPSIS_MISSING", "sinopsis ausente"));
  }

  return issues;
}

/** Un sólo ERROR bloquea la ingesta (§28: WARNING/INFO no bloquean). */
export function hasBlockingIssues(issues: ValidationIssue[]): boolean {
  return issues.some((entry) => entry.level === "ERROR");
}

/** Resumen compacto para `ingestion_errors.message` (§40). */
export function blockingSummary(issues: ValidationIssue[]): string {
  return issues
    .filter((entry) => entry.level === "ERROR")
    .map((entry) => `${entry.code}: ${entry.message}`)
    .join("; ");
}
