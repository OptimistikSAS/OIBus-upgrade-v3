export type Instant = string;
export type Timezone = string;

export const LANGUAGES = ['fr', 'en'];
export type Language = (typeof LANGUAGES)[number];

export interface BaseEntity {
  id: string;
  creationDate?: Instant;
  lastEditInstant?: Instant;
}

export interface Page<T> {
  /**
   * The content of the page
   */
  content: Array<T>;
  /**
   * The total number of elements
   */
  totalElements: number;

  /**
   * The size of the page, i.e. the max size of the array of elements
   */
  size: number;

  /**
   * The number of the page, starting at 0
   */
  number: number;

  /**
   * The total number of pages (which can be 0)
   */
  totalPages: number;
}

export const ALL_CSV_CHARACTERS = ['DOT', 'SEMI_COLON', 'COLON', 'COMMA', 'NON_BREAKING_SPACE', 'SLASH', 'TAB', 'PIPE'] as const;
export type CsvCharacter = (typeof ALL_CSV_CHARACTERS)[number];
