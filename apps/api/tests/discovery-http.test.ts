import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DiscoveryUpstreamError,
  USER_AGENT,
  createJsonHttpClient,
} from "../src/discovery/http";

const ALLOWED_HOSTS = ["api.tvmaze.com"];

function jsonResponse(
  body: string,
  status = 200,
  contentType = "application/json; charset=utf-8",
): Response {
  return new Response(body, {
    status,
    headers: { "content-type": contentType },
  });
}

function isUpstream(
  errorCode: string,
  retryable?: boolean,
): (error: unknown) => boolean {
  return (error: unknown) => {
    assert.ok(error instanceof DiscoveryUpstreamError, "debe ser upstream error");
    assert.equal(error.errorCode, errorCode);
    if (retryable !== undefined) {
      assert.equal(error.retryable, retryable);
    }
    return true;
  };
}

const noSleep = { sleep: async () => {} };

test("fetchJson sólo permite https y hosts de la allowlist, con headers de §53", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const http = createJsonHttpClient({
    fetchImpl: (async (
      url: Parameters<typeof fetch>[0],
      init?: RequestInit,
    ) => {
      calls.push({ url: String(url), init: init ?? {} });
      return jsonResponse(JSON.stringify({ hello: "world" }));
    }) as typeof fetch,
    ...noSleep,
  });

  const result = await http.fetchJson(
    "https://api.tvmaze.com/search/shows?q=x",
    { allowedHosts: ALLOWED_HOSTS },
  );
  assert.deepEqual(result, { hello: "world" });
  assert.equal(calls.length, 1);
  const firstCall = calls[0];
  assert.ok(firstCall);
  const { init } = firstCall;
  assert.equal(init.method, "GET");
  assert.equal(init.redirect, "error");
  const headers = init.headers as Record<string, string>;
  assert.equal(headers["user-agent"], USER_AGENT);
  assert.equal(headers["accept"], "application/json");

  await assert.rejects(
    http.fetchJson("http://api.tvmaze.com/x", { allowedHosts: ALLOWED_HOSTS }),
    isUpstream("DISCOVERY_ADAPTER_ERROR", false),
  );
  await assert.rejects(
    http.fetchJson("https://evil.test/x", { allowedHosts: ALLOWED_HOSTS }),
    isUpstream("DISCOVERY_ADAPTER_ERROR", false),
  );
  await assert.rejects(
    http.fetchJson("no-es-url", { allowedHosts: ALLOWED_HOSTS }),
    isUpstream("DISCOVERY_ADAPTER_ERROR", false),
  );
  await assert.rejects(
    http.fetchJson("https://user:pass@api.tvmaze.com/x", {
      allowedHosts: ALLOWED_HOSTS,
    }),
    isUpstream("DISCOVERY_ADAPTER_ERROR", false),
  );
  assert.equal(calls.length, 1, "los URLs rechazados no llegan a la red");
});

test("reintenta ante 429 y 5xx con backoff y devuelve el JSON final", async () => {
  let attempts = 0;
  const http = createJsonHttpClient({
    fetchImpl: (async () => {
      attempts++;
      if (attempts === 1) return jsonResponse("{}", 429);
      if (attempts === 2) return jsonResponse("{}", 503);
      return jsonResponse('{"ok":true}');
    }) as typeof fetch,
    ...noSleep,
  });

  const result = await http.fetchJson("https://api.tvmaze.com/x", {
    allowedHosts: ALLOWED_HOSTS,
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(attempts, 3);
});

test("4xx del proveedor no se reintenta", async () => {
  let attempts = 0;
  const http = createJsonHttpClient({
    fetchImpl: (async () => {
      attempts++;
      return jsonResponse("{}", 404);
    }) as typeof fetch,
    ...noSleep,
  });

  await assert.rejects(
    http.fetchJson("https://api.tvmaze.com/x", { allowedHosts: ALLOWED_HOSTS }),
    isUpstream("DISCOVERY_ADAPTER_ERROR", false),
  );
  assert.equal(attempts, 1);
});

test("5xx persistente agota los 3 intentos y termina como error reintenable", async () => {
  let attempts = 0;
  const http = createJsonHttpClient({
    fetchImpl: (async () => {
      attempts++;
      return jsonResponse("{}", 500);
    }) as typeof fetch,
    ...noSleep,
  });

  await assert.rejects(
    http.fetchJson("https://api.tvmaze.com/x", { allowedHosts: ALLOWED_HOSTS }),
    isUpstream("DISCOVERY_ADAPTER_ERROR", true),
  );
  assert.equal(attempts, 3);
});

test("respuestas no JSON (content-type o cuerpo) son INVALID_EXTERNAL_PAYLOAD", async () => {
  let attempts = 0;
  const http = createJsonHttpClient({
    fetchImpl: (async () => {
      attempts++;
      return jsonResponse("<html></html>", 200, "text/html");
    }) as typeof fetch,
    ...noSleep,
  });
  await assert.rejects(
    http.fetchJson("https://api.tvmaze.com/x", { allowedHosts: ALLOWED_HOSTS }),
    isUpstream("INVALID_EXTERNAL_PAYLOAD", false),
  );
  assert.equal(attempts, 1);

  attempts = 0;
  const badJson = createJsonHttpClient({
    fetchImpl: (async () => {
      attempts++;
      return jsonResponse("no es json");
    }) as typeof fetch,
    ...noSleep,
  });
  await assert.rejects(
    badJson.fetchJson("https://api.tvmaze.com/x", {
      allowedHosts: ALLOWED_HOSTS,
    }),
    isUpstream("INVALID_EXTERNAL_PAYLOAD", false),
  );
  assert.equal(attempts, 1);
});

test("respuestas que superan maxBytes se rechazan sin consumir todo", async () => {
  const http = createJsonHttpClient({
    fetchImpl: (async () =>
      jsonResponse(
        JSON.stringify({ payload: "x".repeat(64) }),
      )) as typeof fetch,
    ...noSleep,
  });

  await assert.rejects(
    http.fetchJson("https://api.tvmaze.com/x", {
      allowedHosts: ALLOWED_HOSTS,
      maxBytes: 16,
    }),
    isUpstream("INVALID_EXTERNAL_PAYLOAD", false),
  );
});

test("timeouts del proveedor se clasifican UPSTREAM_TIMEOUT y se reintentan", async () => {
  let attempts = 0;
  const http = createJsonHttpClient({
    fetchImpl: (async () => {
      attempts++;
      throw new DOMException("The operation timed out", "TimeoutError");
    }) as typeof fetch,
    ...noSleep,
  });

  await assert.rejects(
    http.fetchJson("https://api.tvmaze.com/x", { allowedHosts: ALLOWED_HOSTS }),
    isUpstream("UPSTREAM_TIMEOUT", true),
  );
  assert.equal(attempts, 3);
});

test("errores de red (TypeError) se reintentan y pueden recuperarse", async () => {
  let attempts = 0;
  const http = createJsonHttpClient({
    fetchImpl: (async () => {
      attempts++;
      if (attempts === 1) throw new TypeError("fetch failed");
      return jsonResponse('{"ok":true}');
    }) as typeof fetch,
    ...noSleep,
  });

  const result = await http.fetchJson("https://api.tvmaze.com/x", {
    allowedHosts: ALLOWED_HOSTS,
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(attempts, 2);
});

test("el deadline total corta los reintentos aunque queden intentos", async () => {
  let clock = 0;
  let attempts = 0;
  const http = createJsonHttpClient({
    fetchImpl: (async () => {
      attempts++;
      clock += 15_000;
      return jsonResponse("{}", 500);
    }) as typeof fetch,
    sleep: async (ms: number) => {
      clock += ms;
    },
    now: () => clock,
    random: () => 0,
  });

  await assert.rejects(
    http.fetchJson("https://api.tvmaze.com/x", { allowedHosts: ALLOWED_HOSTS }),
    isUpstream("DISCOVERY_ADAPTER_ERROR", true),
  );
  assert.equal(attempts, 2, "el tercer intento excede el deadline de 30s");
});
