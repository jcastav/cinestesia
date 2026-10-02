import { randomUUID } from "node:crypto";

const INCOMING_ID = /^[A-Za-z0-9_.-]{1,128}$/;

export function resolveRequestId(incoming?: string): string {
  if (incoming && INCOMING_ID.test(incoming)) {
    return incoming;
  }
  return `req_${randomUUID().replaceAll("-", "")}`;
}
