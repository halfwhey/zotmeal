import {
  ZoteroError,
  AuthenticationError,
  NotFoundError,
  VersionConflictError,
  RateLimitError,
} from "./types/errors.js";

const DEFAULT_BASE_URL = "https://api.zotero.org";
const MAX_RETRIES = 3;

export interface HttpClientConfig {
  apiKey: string;
  baseUrl?: string | undefined;
}

export interface HttpResponse<T> {
  data: T;
  version: number;
  headers: Headers;
}

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: HttpClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  }

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      "Zotero-API-Version": "3",
      "Zotero-API-Key": this.apiKey,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  private async handleResponse<T>(response: Response): Promise<HttpResponse<T>> {
    const version = Number(response.headers.get("Last-Modified-Version") ?? 0);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      this.throwTypedError(response.status, body);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { data: undefined as T, version, headers: response.headers };
    }

    const contentType = response.headers.get("Content-Type") ?? "";
    const data = contentType.includes("application/json")
      ? ((await response.json()) as T)
      : ((await response.text()) as T);
    return { data, version, headers: response.headers };
  }

  private throwTypedError(status: number, body: string): never {
    switch (status) {
      case 403:
        throw new AuthenticationError(body || "Forbidden", body);
      case 404:
        throw new NotFoundError(body || "Not Found", body);
      case 412:
        throw new VersionConflictError(body || "Precondition Failed", body);
      case 429:
        throw new RateLimitError(0, body || "Too Many Requests", body);
      default:
        throw new ZoteroError(body || `HTTP ${status}`, status, body);
    }
  }

  async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      headers?: Record<string, string>;
      params?: Record<string, string | number | boolean | string[] | undefined>;
    },
  ): Promise<HttpResponse<T>> {
    const url = new URL(path, this.baseUrl);

    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          // Zotero uses OR for multiple tag values: tag=X || tag=Y
          for (const v of value) {
            url.searchParams.append(key, v);
          }
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers = this.buildHeaders(options?.headers);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: options?.body
          ? typeof options.body === "string"
            ? options.body
            : JSON.stringify(options.body)
          : null,
      });

      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? 1);
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      return this.handleResponse<T>(response);
    }

    // Should not reach here, but satisfy TypeScript
    throw new RateLimitError(0, "Rate limit exceeded after retries");
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | string[] | undefined>): Promise<HttpResponse<T>> {
    return this.request<T>("GET", path, params ? { params } : undefined);
  }

  async post<T>(path: string, body: unknown): Promise<HttpResponse<T>> {
    return this.request<T>("POST", path, { body });
  }

  async put<T>(path: string, body: unknown, version?: number): Promise<HttpResponse<T>> {
    const headers: Record<string, string> = {};
    if (version !== undefined) {
      headers["If-Unmodified-Since-Version"] = String(version);
    }
    return this.request<T>("PUT", path, { body, headers });
  }

  async patch<T>(path: string, body: unknown, version: number): Promise<HttpResponse<T>> {
    return this.request<T>("PATCH", path, {
      body,
      headers: { "If-Unmodified-Since-Version": String(version) },
    });
  }

  async delete(path: string, version: number): Promise<HttpResponse<void>> {
    return this.request<void>("DELETE", path, {
      headers: { "If-Unmodified-Since-Version": String(version) },
    });
  }

  /** Build full URL for a path (used by pagination) */
  buildUrl(path: string, params?: Record<string, string | number | boolean | string[] | undefined>): string {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          for (const v of value) {
            url.searchParams.append(key, v);
          }
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  /** Make a request to a full URL (used by pagination for next page) */
  async getUrl<T>(url: string): Promise<HttpResponse<T>> {
    const headers = this.buildHeaders();

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch(url, { method: "GET", headers });

      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? 1);
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      return this.handleResponse<T>(response);
    }

    throw new RateLimitError(0, "Rate limit exceeded after retries");
  }

  /**
   * Conditional GET with `If-Modified-Since-Version` header.
   * Returns the response if the resource has been modified since the given version,
   * or `null` if the server responds with 304 Not Modified.
   */
  async getIfModified<T>(
    path: string,
    sinceVersion: number,
    params?: Record<string, string | number | boolean | string[] | undefined>,
  ): Promise<HttpResponse<T> | null> {
    const url = new URL(path, this.baseUrl);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          for (const v of value) {
            url.searchParams.append(key, v);
          }
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers = this.buildHeaders({
      "If-Modified-Since-Version": String(sinceVersion),
    });

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch(url.toString(), { method: "GET", headers });

      if (response.status === 304) {
        return null;
      }

      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? 1);
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      return this.handleResponse<T>(response);
    }

    throw new RateLimitError(0, "Rate limit exceeded after retries");
  }
}
