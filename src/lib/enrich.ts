import type { EnrichedArtikel } from '@/types/enriched';
import type { Artikel, Einkaufslisten, Personen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface ArtikelMaps {
  einkaufslistenMap: Map<string, Einkaufslisten>;
  personenMap: Map<string, Personen>;
}

export function enrichArtikel(
  artikel: Artikel[],
  maps: ArtikelMaps
): EnrichedArtikel[] {
  return artikel.map(r => ({
    ...r,
    einkaufslisteName: resolveDisplay(r.fields.einkaufsliste, maps.einkaufslistenMap, 'listenname'),
    personName: resolveDisplay(r.fields.person, maps.personenMap, 'vorname', 'nachname'),
  }));
}
