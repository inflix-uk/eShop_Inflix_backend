export interface SortOption {
  name: string;
  key: string;
  sortFunc: (a: any, b: any) => number;
}
