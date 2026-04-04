import type { HttpClient } from "../http.js";
import type { DeletedContent } from "../types/deleted.js";

export class DeletedEndpoint {
  constructor(
    private readonly http: HttpClient,
    private readonly prefix: string,
  ) {}

  async list(since: number): Promise<DeletedContent> {
    const { data } = await this.http.get<DeletedContent>(
      `${this.prefix}/deleted`,
      { since },
    );
    return data;
  }
}
