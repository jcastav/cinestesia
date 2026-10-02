import type { ApiErrorCode, ApiErrorResponse } from "@cinestesia/shared";
import type { FastifyReply } from "fastify";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  MEDIA_NOT_FOUND: 404,
  SOURCE_NOT_FOUND: 404,
  SOURCE_UNAVAILABLE: 503,
  INVALID_ARGUMENT: 400,
  INTERNAL_ERROR: 500,
};

export function sendError(
  reply: FastifyReply,
  requestId: string,
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>,
): FastifyReply {
  const body: ApiErrorResponse = {
    error: { code, message, requestId, ...(details ? { details } : {}) },
  };
  return reply.status(STATUS_BY_CODE[code] ?? 500).send(body);
}
