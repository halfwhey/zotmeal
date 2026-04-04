import type { HttpClient } from "../http.js";
import type { FullTextContent, FullTextVersions } from "../types/fulltext.js";

export class FullTextEndpoint {
  constructor(
    private readonly http: HttpClient,
    private readonly prefix: string,
  ) {}

  async get(key: string): Promise<FullTextContent> {
    const response = await this.http.get<FullTextContent>(
      `${this.prefix}/items/${key}/fulltext`,
    );
    return response.data;
  }

  async set(
    key: string,
    content: FullTextContent,
    version: number,
  ): Promise<void> {
    await this.http.put(
      `${this.prefix}/items/${key}/fulltext`,
      content,
      version,
    );
  }

  async listVersions(since?: number): Promise<FullTextVersions> {
    const params: Record<string, number> | undefined =
      since !== undefined ? { since } : undefined;
    const response = await this.http.get<FullTextVersions>(
      `${this.prefix}/fulltext`,
      params,
    );
    return response.data;
  }
}
