import { describe, it, expect, mock, beforeEach } from "bun:test";
import { HttpClient } from "../src/api/http.js";
import { FilesEndpoint } from "../src/api/endpoints/files.js";

const mockFetch = mock<typeof fetch>();
globalThis.fetch = mockFetch as unknown as typeof fetch;

function makeResponse(
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: new Headers({
      "Content-Type": "application/json",
      "Last-Modified-Version": "10",
      ...headers,
    }),
  });
}

function make204Response(): Response {
  return new Response(null, {
    status: 204,
    headers: new Headers({ "Last-Modified-Version": "11" }),
  });
}

describe("FilesEndpoint", () => {
  let http: HttpClient;
  let files: FilesEndpoint;

  beforeEach(() => {
    mockFetch.mockReset();
    http = new HttpClient({ apiKey: "key" });
    files = new FilesEndpoint(http, "/users/12345");
  });

  it("getDownloadUrl() returns correct URL", () => {
    const url = files.getDownloadUrl("ITEM1");
    expect(url).toContain("/users/12345/items/ITEM1/file");
    expect(url).toStartWith("https://");
  });

  it("getViewUrl() returns correct URL", () => {
    const url = files.getViewUrl("ITEM1");
    expect(url).toContain("/users/12345/items/ITEM1/file/view");
    expect(url).toStartWith("https://");
  });

  it("getUploadAuthorization() posts with If-None-Match for new upload", async () => {
    const authResponse = {
      url: "https://s3.amazonaws.com/...",
      contentType: "application/pdf",
      prefix: "prefix",
      suffix: "suffix",
      uploadKey: "upload123",
    };
    mockFetch.mockResolvedValueOnce(makeResponse(authResponse));

    const result = await files.getUploadAuthorization("ITEM1", {
      md5: "abc123",
      filename: "test.pdf",
      filesize: 1024,
      mtime: 1000000,
    });

    expect(result).toEqual(authResponse);

    const call = mockFetch.mock.calls[0]!;
    expect(call[1]?.method).toBe("POST");

    const url = call[0] as string;
    expect(url).toContain("/users/12345/items/ITEM1/file");

    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["If-None-Match"]).toBe("*");
    expect(headers["If-Match"]).toBeUndefined();
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");

    const body = call[1]?.body as string;
    expect(body).toContain("md5=abc123");
    expect(body).toContain("filename=test.pdf");
  });

  it("getUploadAuthorization() posts with If-Match for existing file", async () => {
    const authResponse = {
      url: "https://s3.amazonaws.com/...",
      contentType: "application/pdf",
      prefix: "prefix",
      suffix: "suffix",
      uploadKey: "upload123",
    };
    mockFetch.mockResolvedValueOnce(makeResponse(authResponse));

    const result = await files.getUploadAuthorization(
      "ITEM1",
      {
        md5: "newmd5",
        filename: "test.pdf",
        filesize: 2048,
        mtime: 2000000,
      },
      "oldmd5",
    );

    expect(result).toEqual(authResponse);

    const call = mockFetch.mock.calls[0]!;
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["If-Match"]).toBe("oldmd5");
    expect(headers["If-None-Match"]).toBeUndefined();
  });

  it("registerUpload() posts form-encoded body with correct headers for new upload", async () => {
    mockFetch.mockResolvedValueOnce(make204Response());

    await files.registerUpload("ITEM1", "upload123");

    const call = mockFetch.mock.calls[0]!;
    expect(call[1]?.method).toBe("POST");

    const url = call[0] as string;
    expect(url).toContain("/users/12345/items/ITEM1/file");

    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(headers["If-None-Match"]).toBe("*");

    const body = call[1]?.body as string;
    expect(body).toBe("upload=upload123");
  });

  it("registerUpload() posts with If-Match for existing file", async () => {
    mockFetch.mockResolvedValueOnce(make204Response());

    await files.registerUpload("ITEM1", "upload123", "existingmd5");

    const call = mockFetch.mock.calls[0]!;
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["If-Match"]).toBe("existingmd5");
    expect(headers["If-None-Match"]).toBeUndefined();
  });
});
