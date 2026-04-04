import type { HttpClient } from "../http.js";
import type { KeyPermissions } from "../types/keys.js";

export class KeysEndpoint {
  constructor(private readonly http: HttpClient) {}

  async getCurrent(): Promise<KeyPermissions> {
    const { data } = await this.http.get<KeyPermissions>("/keys/current");
    return data;
  }

  async get(key: string): Promise<KeyPermissions> {
    const { data } = await this.http.get<KeyPermissions>(`/keys/${key}`);
    return data;
  }
}
