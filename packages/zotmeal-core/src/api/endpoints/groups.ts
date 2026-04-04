import type { HttpClient } from "../http.js";
import type { GroupData } from "../types/groups.js";
import type { ApiResponse } from "../types/responses.js";
import { paginate, type PaginatedInfo } from "../pagination.js";

export class GroupsEndpoint {
  constructor(private readonly http: HttpClient) {}

  async get(groupId: number): Promise<ApiResponse<GroupData>> {
    const { data } = await this.http.get<ApiResponse<GroupData>>(
      `/groups/${groupId}`,
    );
    return data;
  }

  listForUser(
    userId: number,
  ): AsyncGenerator<ApiResponse<GroupData>, PaginatedInfo> {
    return paginate<ApiResponse<GroupData>>(
      this.http,
      `/users/${userId}/groups`,
    );
  }
}
