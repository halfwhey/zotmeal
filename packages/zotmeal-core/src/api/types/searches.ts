export interface SearchCondition {
  condition: string;
  operator: string;
  value: string;
}

export interface SearchData {
  key: string;
  version: number;
  name: string;
  conditions: SearchCondition[];
}
