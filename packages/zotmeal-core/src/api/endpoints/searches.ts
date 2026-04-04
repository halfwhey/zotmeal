import type { HttpClient } from "../http.js";
import type { SearchData } from "../types/searches.js";
import type { ApiResponse, MultiWriteResponse } from "../types/responses.js";
import type { QueryParams } from "../types/params.js";
import { paginate, type PaginatedInfo } from "../pagination.js";

export class SearchesEndpoint {
  constructor(
    private readonly http: HttpClient,
    private readonly prefix: string,
  ) {}

  async get(key: string): Promise<ApiResponse<SearchData>> {
    const { data } = await this.http.get<ApiResponse<SearchData>>(
      `${this.prefix}/searches/${key}`,
    );
    return data;
  }

  list(
    params?: QueryParams,
  ): AsyncGenerator<ApiResponse<SearchData>, PaginatedInfo> {
    return paginate<ApiResponse<SearchData>>(
      this.http,
      `${this.prefix}/searches`,
      params as Record<string, string | number | boolean | string[] | undefined>,
    );
  }

  async create(searches: Partial<SearchData>[]): Promise<MultiWriteResponse> {
    const { data } = await this.http.post<MultiWriteResponse>(
      `${this.prefix}/searches`,
      searches,
    );
    return data;
  }

  async update(
    key: string,
    data: Partial<SearchData>,
    version: number,
  ): Promise<void> {
    await this.http.patch(`${this.prefix}/searches/${key}`, data, version);
  }

  async delete(key: string, version: number): Promise<void> {
    await this.http.delete(`${this.prefix}/searches/${key}`, version);
  }

  async deleteMany(keys: string[], version: number): Promise<void> {
    await this.http.request("DELETE", `${this.prefix}/searches`, {
      params: { searchKey: keys.join(",") },
      headers: { "If-Unmodified-Since-Version": String(version) },
    });
  }
}
