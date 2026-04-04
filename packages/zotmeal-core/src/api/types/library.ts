export type LibraryContext =
  | { type: "user"; id: number }
  | { type: "group"; id: number };
