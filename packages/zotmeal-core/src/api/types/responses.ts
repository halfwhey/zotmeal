import type { LibraryInfo, Links } from "./common.js";

export interface ApiResponse<T> {
  data: T;
  key: string;
  version: number;
  library: LibraryInfo;
  links: Links;
  meta: Record<string, unknown>;
}

export interface MultiWriteResponse {
  success: Record<string, string>;
  unchanged: Record<string, string>;
  failed: Record<string, { code: number; message: string }>;
  successful: Record<string, unknown>;
}
