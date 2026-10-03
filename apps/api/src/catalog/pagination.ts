import { CatalogError } from "./errors";

/** §8.48 — colecciones con page/limit; nunca respuestas ilimitadas. */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 50;

function parsePositiveInt(
  raw: string | undefined,
  fallback: number,
  name: string,
  max?: number,
): number {
  if (raw === undefined || raw === "") {
    return fallback;
  }

  if (!/^\d+$/.test(raw)) {
    throw new CatalogError(
      "INVALID_ARGUMENT",
      `${name} debe ser un entero positivo`,
    );
  }

  const value = Number(raw);

  if (value < 1) {
    throw new CatalogError(
      "INVALID_ARGUMENT",
      `${name} debe ser un entero positivo`,
    );
  }

  if (max !== undefined && value > max) {
    throw new CatalogError(
      "INVALID_ARGUMENT",
      `${name} no puede superar ${max}`,
    );
  }

  return value;
}

export function parsePageParams(
  pageRaw?: string,
  limitRaw?: string,
): { page: number; limit: number } {
  const page = parsePositiveInt(pageRaw, DEFAULT_PAGE, "page");
  const limit = parsePositiveInt(limitRaw, DEFAULT_LIMIT, "limit", MAX_LIMIT);
  return { page, limit };
}
