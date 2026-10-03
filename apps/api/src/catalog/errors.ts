import type { ApiErrorCode } from "@cinestesia/shared";

export class CatalogError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "CatalogError";
    this.code = code;
  }
}
