import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Einkaufslisten, Personen, Artikel } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [einkaufslisten, setEinkaufslisten] = useState<Einkaufslisten[]>([]);
  const [personen, setPersonen] = useState<Personen[]>([]);
  const [artikel, setArtikel] = useState<Artikel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [einkaufslistenData, personenData, artikelData] = await Promise.all([
        LivingAppsService.getEinkaufslisten(),
        LivingAppsService.getPersonen(),
        LivingAppsService.getArtikel(),
      ]);
      setEinkaufslisten(einkaufslistenData);
      setPersonen(personenData);
      setArtikel(artikelData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [einkaufslistenData, personenData, artikelData] = await Promise.all([
          LivingAppsService.getEinkaufslisten(),
          LivingAppsService.getPersonen(),
          LivingAppsService.getArtikel(),
        ]);
        setEinkaufslisten(einkaufslistenData);
        setPersonen(personenData);
        setArtikel(artikelData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

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

  return { einkaufslisten, setEinkaufslisten, personen, setPersonen, artikel, setArtikel, loading, error, fetchAll, einkaufslistenMap, personenMap };
}