/**
 * TVMaze Metadata Search (§6.44 §13.4 — adapter seleccionado en BACKLOG).
 *
 * `GET https://api.tvmaze.com/search/shows?q=` (§53: allowlist api.tvmaze.com,
 * rate limit 5 req/s). Sólo metadata de series/películas listadas en TVMaze;
 * no descarga contenido — el MediaItem resultante queda en DRAFT (§21, §77).
 */

import type { DiscoveredItemInput, DiscoveryAdapter } from "../adapter";
import {
  DiscoveryUpstreamError,
  defaultHttpClient,
  type JsonHttpClient,
} from "../http";

const ALLOWED_HOSTS = ["api.tvmaze.com"] as const;
const PROVIDER = "tvmaze";
const DEFAULT_MAX_ITEMS = 20;
const ENDPOINT = "https://api.tvmaze.com/search/shows";

/**
 * Debe coincidir con `discovery_adapters.version` del seed (Fase A); el
 * runtime usa esta constante (decisión de código sobre metadatos).
 */
export const TVMAZE_METADATA_VERSION = "1.0.0";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrae `show` de cada entrada de `/search/shows`; payload inválido = §40. */
export function parseTvmazeSearch(payload: unknown): Record<string, unknown>[] {
  if (!Array.isArray(payload)) {
    throw new DiscoveryUpstreamError(
      "INVALID_EXTERNAL_PAYLOAD",
      "la respuesta de TVMaze no es un arreglo de resultados",
      false,
    );
  }
  return payload.map((entry, index) => {
    if (!isRecord(entry) || !isRecord(entry["show"])) {
      throw new DiscoveryUpstreamError(
        "INVALID_EXTERNAL_PAYLOAD",
        `la entrada ${index} de TVMaze no contiene un "show" válido`,
        false,
      );
    }
    return entry["show"];
  });
}

/** Un `show` de TVMaze → entrada común del orquestador (§3). */
export function showToItem(show: Record<string, unknown>): DiscoveredItemInput {
  const id =
    typeof show["id"] === "number" && Number.isInteger(show["id"])
      ? String(show["id"])
      : typeof show["id"] === "string"
        ? show["id"].trim()
        : "";
  const name = typeof show["name"] === "string" ? show["name"].trim() : "";
  if (id.length === 0) {
    throw new DiscoveryUpstreamError(
      "INVALID_EXTERNAL_PAYLOAD",
      "un show de TVMaze no tiene id",
      false,
    );
  }
  if (name.length === 0) {
    throw new DiscoveryUpstreamError(
      "INVALID_EXTERNAL_PAYLOAD",
      `el show de TVMaze ${id} no tiene nombre`,
      false,
    );
  }

  const externals = isRecord(show["externals"]) ? show["externals"] : {};
  const url = typeof show["url"] === "string" ? show["url"].trim() : "";
  const externalIds: DiscoveredItemInput["externalIds"] = [
    {
      namespace: "tvmaze",
      externalId: id,
      externalUrl: /^https?:\/\/\S+$/.test(url) ? url : null,
    },
  ];
  const imdb = typeof externals["imdb"] === "string" ? externals["imdb"].trim() : "";
  if (imdb.length > 0) {
    externalIds.push({ namespace: "imdb", externalId: imdb, externalUrl: null });
  }

  const image = isRecord(show["image"]) ? show["image"] : {};
  const runtime = show["runtime"];
  const summary = typeof show["summary"] === "string" ? show["summary"] : "";
  const premiered = typeof show["premiered"] === "string" ? show["premiered"] : "";

  return {
    provider: PROVIDER,
    externalId: id,
    raw: show,
    title: name,
    originalTitle: null,
    type: show["type"] === "Movie" ? "Movie" : "Series",
    releaseYear: null,
    releaseDate: premiered.length > 0 ? premiered : null,
    runtimeSeconds:
      typeof runtime === "number" && Number.isInteger(runtime) && runtime > 0
        ? runtime * 60
        : null,
    synopsis: summary.length > 0 ? stripHtml(summary) : null,
    posterUrl:
      typeof image["original"] === "string" && image["original"].length > 0
        ? image["original"]
        : null,
    backdropUrl: null,
    externalIds,
  };
}

export function createTvmazeMetadataAdapter(
  http: JsonHttpClient = defaultHttpClient,
): DiscoveryAdapter {
  return {
    id: "tvmaze_metadata",
    version: TVMAZE_METADATA_VERSION,
    provider: PROVIDER,
    capabilities: ["CONTENT_DISCOVERY", "REQUIRES_QUERY"],
    async discover(context) {
      if (context.query === null || context.query.trim().length === 0) {
        throw new DiscoveryUpstreamError(
          "INVALID_EXTERNAL_PAYLOAD",
          "tvmaze_metadata requiere un query de búsqueda",
          false,
        );
      }
      const url = new URL(ENDPOINT);
      url.searchParams.set("q", context.query);
      const payload = await http.fetchJson(url.toString(), {
        allowedHosts: ALLOWED_HOSTS,
        rateLimitKey: "tvmaze_metadata",
      });
      const shows = parseTvmazeSearch(payload);
      const cap = context.maxItems ?? DEFAULT_MAX_ITEMS;
      return shows.slice(0, cap).map(showToItem);
    },
  };
}

export const tvmazeMetadataAdapter = createTvmazeMetadataAdapter();
