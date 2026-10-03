/**
 * Validación de las solicitudes admin de Discovery (§6.44 §60, §8.48).
 * Módulo puro: sin base de datos ni red, apto para tests unitarios.
 */

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
