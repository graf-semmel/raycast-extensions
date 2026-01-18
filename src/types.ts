export type Icon = {
  readonly name: string;
  readonly category: string;
};

export type Category = {
  readonly name: string;
  readonly icons: readonly Icon[];
};

export interface IconCatalog {
  readonly categories: readonly Category[];
}

// Raw format from catalogue.json before conversion
export interface RawCatalog {
  readonly categories: ReadonlyArray<{
    readonly name: string;
    readonly icons: readonly string[];
  }>;
}
