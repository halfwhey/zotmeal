export type SortField =
  | "dateAdded"
  | "dateModified"
  | "title"
  | "creator"
  | "itemType"
  | "date"
  | "publisher"
  | "publicationTitle"
  | "journalAbbreviation"
  | "language"
  | "accessDate"
  | "libraryCatalog"
  | "callNumber"
  | "rights"
  | "addedBy"
  | "numItems";
export type SortDirection = "asc" | "desc";
export type Format =
  | "json"
  | "atom"
  | "bib"
  | "bibtex"
  | "bookmarks"
  | "coins"
  | "csljson"
  | "mods"
  | "refer"
  | "rdf_bibliontology"
  | "rdf_dc"
  | "rdf_zotero"
  | "ris"
  | "tei"
  | "wikipedia";

export interface QueryParams {
  limit?: number | undefined;
  start?: number | undefined;
  sort?: SortField | undefined;
  direction?: SortDirection | undefined;
  format?: Format | undefined;
  itemType?: string | undefined;
  q?: string | undefined;
  qmode?: "titleCreatorYear" | "everything" | undefined;
  tag?: string | string[] | undefined;
  since?: number | undefined;
  includeTrashed?: boolean | undefined;
}

export interface ItemQueryParams extends QueryParams {
  itemKey?: string | undefined;
}

export interface CollectionQueryParams extends QueryParams {}
export interface TagQueryParams {
  limit?: number | undefined;
  start?: number | undefined;
  sort?: "title" | "numItems" | undefined;
  direction?: SortDirection | undefined;
  q?: string | undefined;
  since?: number | undefined;
}
