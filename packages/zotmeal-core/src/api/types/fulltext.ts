export interface FullTextContent {
  content: string;
  indexedPages?: number | undefined;
  totalPages?: number | undefined;
  indexedChars?: number | undefined;
}

export interface FullTextVersions {
  [itemKey: string]: number;
}
