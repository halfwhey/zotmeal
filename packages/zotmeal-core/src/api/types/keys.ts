export interface KeyPermissions {
  key: string;
  userID: number;
  username: string;
  access: {
    user?: {
      library?: boolean | undefined;
      files?: boolean | undefined;
      notes?: boolean | undefined;
      write?: boolean | undefined;
    } | undefined;
    groups?: Record<string, {
      library?: boolean | undefined;
      write?: boolean | undefined;
    }> | undefined;
  };
}
