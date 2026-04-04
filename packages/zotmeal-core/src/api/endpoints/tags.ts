import type { HttpClient } from "../http.js";
import type { TagData } from "../types/tags.js";
import type { TagQueryParams } from "../types/params.js";
import { paginate, type PaginatedInfo } from "../pagination.js";

export class TagsEndpoint {
  constructor(
    private readonly http: HttpClient,
    private readonly prefix: string,
  ) {}

  list(
    params?: TagQueryParams,
  ): AsyncGenerator<TagData, PaginatedInfo> {
    return paginate<TagData>(
      this.http,
      `${this.prefix}/tags`,
      params as Record<string, string | number | boolean | string[] | undefined>,
    );
  }

  async delete(tag: string, version: number): Promise<void> {
    await this.http.request("DELETE", `${this.prefix}/tags`, {
      params: { tag },
      headers: { "If-Unmodified-Since-Version": String(version) },
    });
  }
}
