export interface Tag {
  tag: string;
  type?: number | undefined;
}

export interface Links {
  self?: { href: string; type: string } | undefined;
  alternate?: { href: string; type: string } | undefined;
  up?: { href: string; type: string } | undefined;
  enclosure?:
    | { href: string; type: string; title: string; length: number }
    | undefined;
}

export interface LibraryInfo {
  type: string;
  id: number;
  name: string;
  links: Links;
}

export interface ItemBase {
  key: string;
  version: number;
  tags: Tag[];
  collections: string[];
  relations: Record<string, string | string[]>;
  dateAdded: string;
  dateModified: string;
}
