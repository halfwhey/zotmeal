import { HttpClient } from "./http.js";
import type { LibraryContext } from "./types/library.js";
import { ItemsEndpoint } from "./endpoints/items.js";
import { CollectionsEndpoint } from "./endpoints/collections.js";
import { TagsEndpoint } from "./endpoints/tags.js";
import { SearchesEndpoint } from "./endpoints/searches.js";
import { FilesEndpoint } from "./endpoints/files.js";
import { FullTextEndpoint } from "./endpoints/fulltext.js";
import { DeletedEndpoint } from "./endpoints/deleted.js";
import { GroupsEndpoint } from "./endpoints/groups.js";
import { KeysEndpoint } from "./endpoints/keys.js";

export interface ZoteroClientConfig {
  apiKey: string;
  library: LibraryContext;
  baseUrl?: string | undefined;
}

export class ZoteroClient {
  readonly items: ItemsEndpoint;
  readonly collections: CollectionsEndpoint;
  readonly tags: TagsEndpoint;
  readonly searches: SearchesEndpoint;
  readonly files: FilesEndpoint;
  readonly fulltext: FullTextEndpoint;
  readonly deleted: DeletedEndpoint;
  readonly groups: GroupsEndpoint;
  readonly keys: KeysEndpoint;

  private readonly http: HttpClient;
  private readonly prefix: string;

  constructor(config: ZoteroClientConfig) {
    this.http = new HttpClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
    });

    this.prefix =
      config.library.type === "user"
        ? `/users/${config.library.id}`
        : `/groups/${config.library.id}`;

    this.items = new ItemsEndpoint(this.http, this.prefix);
    this.collections = new CollectionsEndpoint(this.http, this.prefix);
    this.tags = new TagsEndpoint(this.http, this.prefix);
    this.searches = new SearchesEndpoint(this.http, this.prefix);
    this.files = new FilesEndpoint(this.http, this.prefix);
    this.fulltext = new FullTextEndpoint(this.http, this.prefix);
    this.deleted = new DeletedEndpoint(this.http, this.prefix);
    this.groups = new GroupsEndpoint(this.http);
    this.keys = new KeysEndpoint(this.http);
  }
}
