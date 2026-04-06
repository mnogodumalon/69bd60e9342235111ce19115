import type { Artikel } from './app';

export type EnrichedArtikel = Artikel & {
  einkaufslisteName: string;
  personName: string;
};
