import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Einkaufslisten, Artikel, Personen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [einkaufslisten, setEinkaufslisten] = useState<Einkaufslisten[]>([]);
  const [artikel, setArtikel] = useState<Artikel[]>([]);
  const [personen, setPersonen] = useState<Personen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [einkaufslistenData, artikelData, personenData] = await Promise.all([
        LivingAppsService.getEinkaufslisten(),
        LivingAppsService.getArtikel(),
        LivingAppsService.getPersonen(),
      ]);
      setEinkaufslisten(einkaufslistenData);
      setArtikel(artikelData);
      setPersonen(personenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const einkaufslistenMap = useMemo(() => {
    const m = new Map<string, Einkaufslisten>();
    einkaufslisten.forEach(r => m.set(r.record_id, r));
    return m;
  }, [einkaufslisten]);

  const personenMap = useMemo(() => {
    const m = new Map<string, Personen>();
    personen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [personen]);

  return { einkaufslisten, setEinkaufslisten, artikel, setArtikel, personen, setPersonen, loading, error, fetchAll, einkaufslistenMap, personenMap };
}