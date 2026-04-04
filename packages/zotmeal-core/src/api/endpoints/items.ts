import type { HttpClient } from "../http.js";
import type { ItemData } from "../types/items.js";
import type { ApiResponse, MultiWriteResponse } from "../types/responses.js";
import type { ItemQueryParams, Format } from "../types/params.js";
import { paginate, type PaginatedInfo } from "../pagination.js";

export class ItemsEndpoint {
  constructor(
    private readonly http: HttpClient,
    private readonly prefix: string,
  ) {}

  async get(key: string): Promise<ApiResponse<ItemData>> {
    const { data } = await this.http.get<ApiResponse<ItemData>>(
      `${this.prefix}/items/${key}`,
    );
    return data;
  }

  list(
    params?: ItemQueryParams,
  ): AsyncGenerator<ApiResponse<ItemData>, PaginatedInfo> {
    return paginate<ApiResponse<ItemData>>(
      this.http,
      `${this.prefix}/items`,
      params as Record<string, string | number | boolean | string[] | undefined>,
    );
  }

  listTop(
    params?: ItemQueryParams,
  ): AsyncGenerator<ApiResponse<ItemData>, PaginatedInfo> {
    return paginate<ApiResponse<ItemData>>(
      this.http,
      `${this.prefix}/items/top`,
      params as Record<string, string | number | boolean | string[] | undefined>,
    );
  }

  listTrash(
    params?: ItemQueryParams,
  ): AsyncGenerator<ApiResponse<ItemData>, PaginatedInfo> {
    return paginate<ApiResponse<ItemData>>(
      this.http,
      `${this.prefix}/items/trash`,
      params as Record<string, string | number | boolean | string[] | undefined>,
    );
  }

  async create(items: Partial<ItemData>[]): Promise<MultiWriteResponse> {
    const { data } = await this.http.post<MultiWriteResponse>(
      `${this.prefix}/items`,
      items,
    );
    return data;
  }

  async update(
    key: string,
    data: Partial<ItemData>,
    version: number,
  ): Promise<void> {
    await this.http.patch(`${this.prefix}/items/${key}`, data, version);
  }

  listChildren(
    key: string,
    params?: ItemQueryParams,
  ): AsyncGenerator<ApiResponse<ItemData>, PaginatedInfo> {
    return paginate<ApiResponse<ItemData>>(
      this.http,
      `${this.prefix}/items/${key}/children`,
      params as Record<string, string | number | boolean | string[] | undefined>,
    );
  }

  async delete(key: string, version: number): Promise<void> {
    await this.http.delete(`${this.prefix}/items/${key}`, version);
  }

  async deleteMany(keys: string[], version: number): Promise<void> {
    await this.http.request("DELETE", `${this.prefix}/items`, {
      params: { itemKey: keys.join(",") },
      headers: { "If-Unmodified-Since-Version": String(version) },
    });
  }

  async export(
    params: ItemQueryParams & { format: Exclude<Format, "json" | "atom"> },
  ): Promise<string> {
    const { data } = await this.http.request<string>("GET", `${this.prefix}/items`, {
      params: params as unknown as Record<string, string | number | boolean | string[] | undefined>,
      headers: { Accept: "text/plain" },
    });
    return data;
  }
}
