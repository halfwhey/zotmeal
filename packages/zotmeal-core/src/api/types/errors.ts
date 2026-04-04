export class ZoteroError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response?: unknown,
  ) {
    super(message);
    this.name = "ZoteroError";
  }
}

export class AuthenticationError extends ZoteroError {
  constructor(message = "Forbidden", response?: unknown) {
    super(message, 403, response);
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends ZoteroError {
  constructor(message = "Not Found", response?: unknown) {
    super(message, 404, response);
    this.name = "NotFoundError";
  }
}

export class VersionConflictError extends ZoteroError {
  constructor(message = "Precondition Failed", response?: unknown) {
    super(message, 412, response);
    this.name = "VersionConflictError";
  }
}

export class RateLimitError extends ZoteroError {
  constructor(
    public readonly retryAfter: number,
    message = "Too Many Requests",
    response?: unknown,
  ) {
    super(message, 429, response);
    this.name = "RateLimitError";
  }
}
