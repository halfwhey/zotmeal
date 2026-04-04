export interface CollectionData {
  key: string;
  version: number;
  name: string;
  parentCollection: string | false;
  relations: Record<string, string | string[]>;
}
