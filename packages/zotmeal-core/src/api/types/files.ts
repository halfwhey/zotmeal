export interface FileUploadParams {
  md5: string;
  filename: string;
  filesize: number;
  mtime: number;
}

export interface FileUploadAuthorization {
  url: string;
  contentType: string;
  prefix: string;
  suffix: string;
  uploadKey: string;
}

export interface FileUploadExists {
  exists: 1;
}
