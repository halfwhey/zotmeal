export interface GroupData {
  id: number;
  version: number;
  name: string;
  owner: number;
  type: "Private" | "PublicOpen" | "PublicClosed";
  description: string;
  url: string;
  libraryEditing: "admins" | "members";
  libraryReading: "all" | "members";
  fileEditing: "admins" | "members" | "none";
  admins?: number[] | undefined;
  members?: number[] | undefined;
}
