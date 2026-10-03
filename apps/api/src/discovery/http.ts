/**
 * Fetch externo delimitado para Discovery (§6.44 §52, §53, §38).
 *
 * Invariantes:
 * - Sólo https y sólo hosts en la allowlist del adapter (SSRF, §53).
 * - `redirect: "error"`: una redirección no puede salirse de la allowlist.
 * - Timeout por intento (10s) y deadline total (30s) por petición.
 * - Tamaño máximo de respuesta (1MB) y content-type JSON.
 * - Reintentos ≤ 3 sólo ante errores transitorios (timeout, red, HTTP 5xx,
 *   429) con backoff 250ms·2^n + jitter ≤ 100ms (§38).
 * - Rate limit por adapter (5 req/s por defecto, §52).
 * - Sin secretos ni logs de payload (§54): este módulo nunca registra body.
 */

export type UpstreamErrorCode =
  | "DISCOVERY_ADAPTER_ERROR"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_RATE_LIMIT"
  | "INVALID_EXTERNAL_PAYLOAD";

/** §40 — error de proveedor clasificado; `retryable` decide reintento (§38). */
export class DiscoveryUpstreamError extends Error {
  readonly errorCode: UpstreamErrorCode;
  readonly retryable: boolean;

  constructor(errorCode: UpstreamErrorCode, message: string, retryable: boolean) {
    super(message);
    this.name = "DiscoveryUpstreamError";
    this.errorCode = errorCode;
    this.retryable = retryable;
  }
}

export interface HttpPolicy {
  allowedHosts: readonly string[];
  timeoutMs?: number;
  maxBytes?: number;
  maxAttempts?: number;
  totalDeadlineMs?: number;
  requestsPerSecond?: number;
  rateLimitKey?: string;
}

export interface JsonHttpClient {
  fetchJson(url: string, policy: HttpPolicy): Promise<unknown>;
}

export interface HttpDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
}

export const USER_AGENT = "Cinestesia-Discovery/0.3.0";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 1_048_576;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_TOTAL_DEADLINE_MS = 30_000;
const DEFAULT_REQUESTS_PER_SECOND = 5;
const BACKOFF_BASE_MS = 250;
const BACKOFF_JITTER_MS = 100;

function assertAllowedUrl(url: string, allowedHosts: readonly string[]): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new DiscoveryUpstreamError(
      "DISCOVERY_ADAPTER_ERROR",
      `URL inválida: ${url}`,
      false,
    );
  }
  if (parsed.protocol !== "https:") {
    throw new DiscoveryUpstreamError(
      "DISCOVERY_ADAPTER_ERROR",
      `sólo se permite https: ${url}`,
      false,
    );
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new DiscoveryUpstreamError(
      "DISCOVERY_ADAPTER_ERROR",
      "URL con credenciales no permitida",
      false,
    );
  }
  if (!allowedHosts.includes(parsed.hostname)) {
    throw new DiscoveryUpstreamError(
      "DISCOVERY_ADAPTER_ERROR",
      `host "${parsed.hostname}" fuera de la allowlist del adapter`,
      false,
    );
  }
  return parsed;
}

function classifyFetchError(error: unknown): DiscoveryUpstreamError {
  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return new DiscoveryUpstreamError(
        "UPSTREAM_TIMEOUT",
        `timeout del proveedor: ${error.message}`,
        true,
      );
    }
    if (error instanceof TypeError) {
      return new DiscoveryUpstreamError(
        "DISCOVERY_ADAPTER_ERROR",
        `error de red: ${error.message}`,
        true,
      );
    }
    return new DiscoveryUpstreamError(
      "DISCOVERY_ADAPTER_ERROR",
      error.message,
      true,
    );
  }
  return new DiscoveryUpstreamError(
    "DISCOVERY_ADAPTER_ERROR",
    String(error),
    true,
  );
}

async function readCapped(
  response: Response,
  maxBytes: number,
): Promise<string> {
  if (response.body === null) {
    return "";
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value === undefined) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new DiscoveryUpstreamError(
        "INVALID_EXTERNAL_PAYLOAD",
        `respuesta supera el límite de ${maxBytes} bytes`,
        false,
      );
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export function createJsonHttpClient(deps: HttpDeps = {}): JsonHttpClient {
  const doFetch = deps.fetchImpl ?? fetch;
  const sleep =
    deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = deps.now ?? Date.now;
  const random = deps.random ?? Math.random;
  const nextSlotByKey = new Map<string, number>();

  async function acquireRateSlot(key: string, requestsPerSecond: number) {
    const intervalMs = 1000 / requestsPerSecond;
    const waitMs = (nextSlotByKey.get(key) ?? 0) - now();
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    nextSlotByKey.set(key, now() + intervalMs);
  }

  async function fetchJson(url: string, policy: HttpPolicy): Promise<unknown> {
    const parsed = assertAllowedUrl(url, policy.allowedHosts);
    const timeoutMs = policy.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxBytes = policy.maxBytes ?? DEFAULT_MAX_BYTES;
    const maxAttempts = policy.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const totalDeadlineMs = policy.totalDeadlineMs ?? DEFAULT_TOTAL_DEADLINE_MS;
    const requestsPerSecond =
      policy.requestsPerSecond ?? DEFAULT_REQUESTS_PER_SECOND;
    const rateKey = policy.rateLimitKey ?? parsed.hostname;
    const startedAt = now();
    let lastError: DiscoveryUpstreamError | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (attempt > 1) {
        const backoffMs =
          BACKOFF_BASE_MS * 2 ** (attempt - 2) +
          Math.floor(random() * BACKOFF_JITTER_MS);
        if (now() - startedAt + backoffMs >= totalDeadlineMs) {
          break;
        }
        await sleep(backoffMs);
      }
      await acquireRateSlot(rateKey, requestsPerSecond);
      try {
        const response = await doFetch(parsed.toString(), {
          method: "GET",
          redirect: "error",
          headers: {
            accept: "application/json",
            "user-agent": USER_AGENT,
          },
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.status === 429) {
          lastError = new DiscoveryUpstreamError(
            "UPSTREAM_RATE_LIMIT",
            "el proveedor respondió 429 (rate limit)",
            true,
          );
          continue;
        }
        if (response.status >= 500) {
          lastError = new DiscoveryUpstreamError(
            "DISCOVERY_ADAPTER_ERROR",
            `el proveedor respondió HTTP ${response.status}`,
            true,
          );
          continue;
        }
        if (!response.ok) {
          throw new DiscoveryUpstreamError(
            "DISCOVERY_ADAPTER_ERROR",
            `el proveedor rechazó la petición con HTTP ${response.status}`,
            false,
          );
        }
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.toLowerCase().includes("json")) {
          throw new DiscoveryUpstreamError(
            "INVALID_EXTERNAL_PAYLOAD",
            `content-type no JSON: ${contentType || "(vacío)"}`,
            false,
          );
        }
        const text = await readCapped(response, maxBytes);
        try {
          return JSON.parse(text) as unknown;
        } catch {
          throw new DiscoveryUpstreamError(
            "INVALID_EXTERNAL_PAYLOAD",
            "el cuerpo de la respuesta no es JSON válido",
            false,
          );
        }
      } catch (error) {
        if (error instanceof DiscoveryUpstreamError) {
          if (!error.retryable) {
            throw error;
          }
          lastError = error;
          continue;
        }
        lastError = classifyFetchError(error);
      }
    }

    throw (
      lastError ??
      new DiscoveryUpstreamError(
        "DISCOVERY_ADAPTER_ERROR",
        "el proveedor no respondió dentro del deadline total",
        true,
      )
    );
  }

  return { fetchJson };
}

/** Instancia por defecto (sólo red real; los tests inyectan dependencias). */
export const defaultHttpClient = createJsonHttpClient();
