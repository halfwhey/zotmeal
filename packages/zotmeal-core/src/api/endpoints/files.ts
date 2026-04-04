import type { HttpClient } from "../http.js";
import type {
  FileUploadParams,
  FileUploadAuthorization,
  FileUploadExists,
} from "../types/files.js";

export class FilesEndpoint {
  constructor(
    private readonly http: HttpClient,
    private readonly prefix: string,
  ) {}

  /** Returns the full API URL for downloading the file attached to an item. */
  getDownloadUrl(key: string): string {
    return this.http.buildUrl(`${this.prefix}/items/${key}/file`);
  }

  /** Returns the full API URL for viewing the file attached to an item. */
  getViewUrl(key: string): string {
    return this.http.buildUrl(`${this.prefix}/items/${key}/file/view`);
  }

  /**
   * Request upload authorization for a file attachment.
   *
   * Pass `existingMd5` when replacing an existing file (sends `If-Match`).
   * Omit it for new uploads (sends `If-None-Match: *`).
   *
   * Returns either a {@link FileUploadAuthorization} with S3 upload details,
   * or a {@link FileUploadExists} if the file already exists on the server.
   */
  async getUploadAuthorization(
    key: string,
    params: FileUploadParams,
    existingMd5?: string | undefined,
  ): Promise<FileUploadAuthorization | FileUploadExists> {
    const conditionHeader: Record<string, string> = existingMd5
      ? { "If-Match": existingMd5 }
      : { "If-None-Match": "*" };

    const body = `md5=${encodeURIComponent(params.md5)}&filename=${encodeURIComponent(params.filename)}&filesize=${params.filesize}&mtime=${params.mtime}`;

    const { data } = await this.http.request<
      FileUploadAuthorization | FileUploadExists
    >("POST", `${this.prefix}/items/${key}/file`, {
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...conditionHeader,
      },
    });

    return data;
  }

  /**
   * Register a completed upload with the Zotero server.
   *
   * Pass `existingMd5` when replacing an existing file (sends `If-Match`).
   * Omit it for new uploads (sends `If-None-Match: *`).
   */
  async registerUpload(
    key: string,
    uploadKey: string,
    existingMd5?: string | undefined,
  ): Promise<void> {
    const conditionHeader: Record<string, string> = existingMd5
      ? { "If-Match": existingMd5 }
      : { "If-None-Match": "*" };

    await this.http.request<void>("POST", `${this.prefix}/items/${key}/file`, {
      body: `upload=${uploadKey}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...conditionHeader,
      },
    });
  }
}
