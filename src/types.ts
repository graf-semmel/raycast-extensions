export interface IconCatalog {
  categories: Category[];
}

export type Category = {
  name: string;
  icons: string[] | RecentIcon[];
};

export type RecentIcon = {
  category: string;
  name: string;
};

