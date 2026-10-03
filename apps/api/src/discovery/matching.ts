/**
 * Entity Matching Engine (§6.44 §22, §23, contrato §7).
 *
 * Estrategias ordenadas por confiabilidad, sin acceso a base de datos:
 * la búsqueda se inyecta vía `MatchingPort` (implementada con
 * `catalog/service.ts` — §44: Discovery no consulta tablas del catálogo
 * directamente).
 *
 * Nivel 1 — identidad externa exacta: `provider ≡ namespace` + `externalId`
 * (decisión v0.3 #5) → `MATCHED` con `EXTERNAL_ID_EXACT` / `HIGH`.
 *
 * Nivel 2 — identidad determinística: título normalizado + año + tipo →
 * exactamente 1 → `MATCHED` con `DETERMINISTIC` / `MEDIUM`; >1 → `AMBIGUOUS`;
 * 0 → `NO_MATCH`.
 *
 * Política conservadora SIN año (decisión Fase D, §23 «preguntar antes que
 * inventar»): con `releaseYear = null` no se afirma identidad aunque exista
 * una coincidencia de título+tipo (p. ej. The Thing 1982 vs 2011):
 * 1 coincidencia → `AMBIGUOUS`, 0 → `NO_MATCH`.
 *
 * Los niveles 3 (alias) y 4 (probabilístico) están fuera de v0.3 → BACKLOG.
 */

import type { MediaType } from "@cinestesia/shared";
import type { NormalizedContent } from "./normalize";

/** §6.44 §7/§22 — estrategia que resolvió el match. */
export type MatchStrategy = "EXTERNAL_ID_EXACT" | "DETERMINISTIC" | "TITLE_TYPE";

/** §6.44 §7 — Match Result con la evidencia persistible en el candidato. */
export interface CandidateMatch {
  result: "MATCHED" | "NO_MATCH" | "AMBIGUOUS";
  entityId: string | null;
  strategy: MatchStrategy | null;
  confidence: "HIGH" | "MEDIUM" | null;
}

/** Buscador inyectado (implementado en `catalog/service.ts`). */
export interface MatchingPort {
  findMediaItemByExternalId(
    namespace: string,
    externalId: string,
  ): Promise<{ id: string } | undefined>;
  findMediaItemsByTitleYearType(
    title: string,
    releaseYear: number | null,
    mediaType: MediaType,
  ): Promise<Array<{ id: string }>>;
}

function matched(
  entityId: string,
  strategy: MatchStrategy,
  confidence: "HIGH" | "MEDIUM",
): CandidateMatch {
  return { result: "MATCHED", entityId, strategy, confidence };
}

const AMBIGUOUS: CandidateMatch = {
  result: "AMBIGUOUS",
  entityId: null,
  strategy: null,
  confidence: null,
};

const NO_MATCH: CandidateMatch = {
  result: "NO_MATCH",
  entityId: null,
  strategy: null,
  confidence: null,
};

/** §6.44 §22 — ejecuta los niveles 1 → 2 en orden de confiabilidad. */
export async function matchCandidate(
  normalized: NormalizedContent,
  port: MatchingPort,
): Promise<CandidateMatch> {
  // Nivel 1 — external ID exacto (§22 §22.1): inequívoco por definición.
  const byExternalId = await port.findMediaItemByExternalId(
    normalized.provider,
    normalized.externalId,
  );
  if (byExternalId) {
    return matched(byExternalId.id, "EXTERNAL_ID_EXACT", "HIGH");
  }

  // Nivel 2 — título normalizado + año + tipo (§22 §22.2).
  const byTitle = await port.findMediaItemsByTitleYearType(
    normalized.title,
    normalized.releaseYear,
    normalized.mediaType,
  );
  if (byTitle.length === 0) {
    return NO_MATCH;
  }

  const first = byTitle[0];
  if (!first) {
    return NO_MATCH;
  }

  if (byTitle.length > 1) {
    return { ...AMBIGUOUS, strategy: strategyFor(normalized.releaseYear) };
  }

  if (normalized.releaseYear === null) {
    // Sin año no hay evidencia suficiente (§23): prefiere revisión humana.
    return { ...AMBIGUOUS, strategy: "TITLE_TYPE" };
  }

  return matched(first.id, "DETERMINISTIC", "MEDIUM");
}

function strategyFor(releaseYear: number | null): MatchStrategy {
  return releaseYear === null ? "TITLE_TYPE" : "DETERMINISTIC";
}
