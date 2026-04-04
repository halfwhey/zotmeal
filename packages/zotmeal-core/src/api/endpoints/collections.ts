import type { HttpClient } from "../http.js";
import type { CollectionData } from "../types/collections.js";
import type { ItemData } from "../types/items.js";
import type { ApiResponse, MultiWriteResponse } from "../types/responses.js";
import type { CollectionQueryParams, ItemQueryParams } from "../types/params.js";
import { paginate, type PaginatedInfo } from "../pagination.js";

export class CollectionsEndpoint {
  constructor(
    private readonly http: HttpClient,
    private readonly prefix: string,
  ) {}

  async get(key: string): Promise<ApiResponse<CollectionData>> {
    const { data } = await this.http.get<ApiResponse<CollectionData>>(
      `${this.prefix}/collections/${key}`,
    );
    return data;
  }

  list(
    params?: CollectionQueryParams,
  ): AsyncGenerator<ApiResponse<CollectionData>, PaginatedInfo> {
    return paginate<ApiResponse<CollectionData>>(
      this.http,
      `${this.prefix}/collections`,
      params as Record<string, string | number | boolean | string[] | undefined>,
    );
  }

  listTop(
    params?: CollectionQueryParams,
  ): AsyncGenerator<ApiResponse<CollectionData>, PaginatedInfo> {
    return paginate<ApiResponse<CollectionData>>(
      this.http,
      `${this.prefix}/collections/top`,
      params as Record<string, string | number | boolean | string[] | undefined>,
    );
  }

  items(
    key: string,
    params?: ItemQueryParams,
  ): AsyncGenerator<ApiResponse<ItemData>, PaginatedInfo> {
    return paginate<ApiResponse<ItemData>>(
      this.http,
      `${this.prefix}/collections/${key}/items`,
      params as Record<string, string | number | boolean | string[] | undefined>,
    );
  }

  itemsTop(
    key: string,
    params?: ItemQueryParams,
  ): AsyncGenerator<ApiResponse<ItemData>, PaginatedInfo> {
    return paginate<ApiResponse<ItemData>>(
      this.http,
      `${this.prefix}/collections/${key}/items/top`,
      params as Record<string, string | number | boolean | string[] | undefined>,
    );
  }

  async create(
    collections: Partial<CollectionData>[],
  ): Promise<MultiWriteResponse> {
    const { data } = await this.http.post<MultiWriteResponse>(
      `${this.prefix}/collections`,
      collections,
    );
    return data;
  }

  async update(
    key: string,
    data: Partial<CollectionData>,
    version: number,
  ): Promise<void> {
    await this.http.patch(`${this.prefix}/collections/${key}`, data, version);
  }

  async delete(key: string, version: number): Promise<void> {
    await this.http.delete(`${this.prefix}/collections/${key}`, version);
  }

  async deleteMany(keys: string[], version: number): Promise<void> {
    await this.http.request("DELETE", `${this.prefix}/collections`, {
      params: { collectionKey: keys.join(",") },
      headers: { "If-Unmodified-Since-Version": String(version) },
    });
  }
}
