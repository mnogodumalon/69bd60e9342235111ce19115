import { useState, useMemo, useEffect } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichArtikel } from '@/lib/enrich';
import type { EnrichedArtikel } from '@/types/enriched';
import type { Einkaufslisten, Personen } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { EinkaufslistenDialog } from '@/components/dialogs/EinkaufslistenDialog';
import { ArtikelDialog } from '@/components/dialogs/ArtikelDialog';
import { PersonenDialog } from '@/components/dialogs/PersonenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  IconAlertCircle, IconPlus, IconShoppingCart, IconCheck, IconPackage,
  IconPencil, IconTrash, IconCalendar, IconUsers, IconList, IconChevronRight, IconX, IconHandStop,
} from '@tabler/icons-react';

export default function DashboardOverview() {
  const {
    einkaufslisten, artikel, personen,
    einkaufslistenMap, personenMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedArtikel = enrichArtikel(artikel, { einkaufslistenMap, personenMap });

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [editList, setEditList] = useState<Einkaufslisten | null>(null);
  const [artikelDialogOpen, setArtikelDialogOpen] = useState(false);
  const [editArtikel, setEditArtikel] = useState<EnrichedArtikel | null>(null);
  const [deleteListTarget, setDeleteListTarget] = useState<string | null>(null);
  const [deleteArtikelTarget, setDeleteArtikelTarget] = useState<string | null>(null);
  const [personenDialogOpen, setPersonenDialogOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<Personen | null>(null);
  const [newPersonenPopoverOpen, setNewPersonenPopoverOpen] = useState(false);
  const [newPersonenFields, setNewPersonenFields] = useState<{ vorname: string; nachname: string }>({ vorname: '', nachname: '' });
  const [savingNewPerson, setSavingNewPerson] = useState(false);
  const [personFilterKey, setPersonFilterKey] = useState<string>('alle');
  const [assignPopoverArtikelId, setAssignPopoverArtikelId] = useState<string | null>(null);

  // Auto-select newest list on first load
  useEffect(() => {
    if (einkaufslisten.length > 0 && selectedListId === null) {
      // Find most recent list by datum or createdat
      const sorted = [...einkaufslisten].sort((a, b) => {
        const dateA = a.fields.datum ?? a.createdat ?? '';
        const dateB = b.fields.datum ?? b.createdat ?? '';
        return dateB.localeCompare(dateA);
      });
      setSelectedListId(sorted[0].record_id);
    }
  }, [einkaufslisten, selectedListId]);

  const selectedList = useMemo(
    () => einkaufslisten.find(l => l.record_id === selectedListId) ?? null,
    [einkaufslisten, selectedListId]
  );

  const listArtikel = useMemo(
    () => enrichedArtikel.filter(a => {
      if (!selectedListId) return false;
      return extractRecordId(a.fields.einkaufsliste) === selectedListId;
    }),
    [enrichedArtikel, selectedListId]
  );

  // Sorted and filtered artikel: open items sorted by name, then done items at end sorted by name
  const sortedFilteredArtikel = useMemo(() => {
    let filtered = listArtikel;
    if (personFilterKey !== 'alle') {
      filtered = listArtikel.filter(a => {
        const personId = extractRecordId(a.fields.person);
        const person = personId ? personenMap.get(personId) : null;
        const kuerzel = person ? (person.fields.vorname?.[0] ?? person.fields.nachname?.[0] ?? '?').toUpperCase() : null;
        return kuerzel === personFilterKey;
      });
    }
    const offen = filtered.filter(a => a.fields.status?.key !== 'gekauft').sort((a, b) => {
      const na = (a.fields.artikelname ?? '').toLowerCase();
      const nb = (b.fields.artikelname ?? '').toLowerCase();
      return na.localeCompare(nb);
    });
    const done = filtered.filter(a => a.fields.status?.key === 'gekauft').sort((a, b) => {
      const na = (a.fields.artikelname ?? '').toLowerCase();
      const nb = (b.fields.artikelname ?? '').toLowerCase();
      return na.localeCompare(nb);
    });
    return [...offen, ...done];
  }, [listArtikel, personFilterKey, personenMap]);

  const listOffenCount = useMemo(
    () => listArtikel.filter(a => a.fields.status?.key !== 'gekauft').length,
    [listArtikel]
  );
  const listGekauftCount = useMemo(
    () => listArtikel.filter(a => a.fields.status?.key === 'gekauft').length,
    [listArtikel]
  );

  // Sorted personen by kuerzel (first letter of name) alphabetically
  const sortedPersonen = useMemo(
    () => [...personen].sort((a, b) => {
      const ka = (a.fields.vorname?.[0] ?? a.fields.nachname?.[0] ?? '?').toUpperCase();
      const kb = (b.fields.vorname?.[0] ?? b.fields.nachname?.[0] ?? '?').toUpperCase();
      return ka.localeCompare(kb);
    }),
    [personen]
  );

  // Unique kuerzel list for filter bar
  const personenKuerzel = useMemo(() => {
    const seen = new Set<string>();
    return sortedPersonen.map(p => {
      const k = (p.fields.vorname?.[0] ?? p.fields.nachname?.[0] ?? '?').toUpperCase();
      if (seen.has(k)) return null;
      seen.add(k);
      return k;
    }).filter(Boolean) as string[];
  }, [sortedPersonen]);

  // All hooks above — early returns below
  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  async function handleToggleStatus(a: EnrichedArtikel) {
    const newKey = a.fields.status?.key === 'gekauft' ? 'offen' : 'gekauft';
    const opt = LOOKUP_OPTIONS.artikel?.status?.find(o => o.key === newKey);
    await LivingAppsService.updateArtikelEntry(a.record_id, { status: opt?.key as any });
    fetchAll();
  }

  async function handleDeleteList() {
    if (!deleteListTarget) return;
    await LivingAppsService.deleteEinkaufslistenEntry(deleteListTarget);
    if (selectedListId === deleteListTarget) setSelectedListId(null);
    fetchAll();
    setDeleteListTarget(null);
  }

  async function handleDeleteArtikel() {
    if (!deleteArtikelTarget) return;
    await LivingAppsService.deleteArtikelEntry(deleteArtikelTarget);
    fetchAll();
    setDeleteArtikelTarget(null);
  }

  async function handleAssignPerson(artikelId: string, personId: string) {
    const url = createRecordUrl(APP_IDS.PERSONEN, personId);
    await LivingAppsService.updateArtikelEntry(artikelId, { person: url as any });
    fetchAll();
    setAssignPopoverArtikelId(null);
  }

  async function handleUnassignPerson(a: EnrichedArtikel) {
    await LivingAppsService.updateArtikelEntry(a.record_id, { person: null as any });
    fetchAll();
  }

  async function handleCreateNewPerson() {
    if (!newPersonenFields.vorname && !newPersonenFields.nachname) return;
    setSavingNewPerson(true);
    try {
      await LivingAppsService.createPersonenEntry({ vorname: newPersonenFields.vorname, nachname: newPersonenFields.nachname });
      fetchAll();
      setNewPersonenFields({ vorname: '', nachname: '' });
      setNewPersonenPopoverOpen(false);
    } finally {
      setSavingNewPerson(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
        {/* LEFT: Liste der Einkaufslisten */}
        <div className="rounded-[20px] bg-card shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <span className="font-semibold text-base">Einkaufslisten</span>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => { setEditList(null); setListDialogOpen(true); }}
            >
              <IconPlus size={14} className="shrink-0" />
              <span className="hidden sm:inline">Neue Liste</span>
            </Button>
          </div>
          <div className="divide-y divide-border">
            {einkaufslisten.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <IconList size={36} className="text-muted-foreground mb-3" stroke={1.5} />
                <p className="text-sm text-muted-foreground">Noch keine Einkaufslisten vorhanden.</p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => { setEditList(null); setListDialogOpen(true); }}
                >
                  <IconPlus size={14} className="mr-1" /> Liste erstellen
                </Button>
              </div>
            )}
            {einkaufslisten.map(list => {
              const listItems = enrichedArtikel.filter(a => {
                return extractRecordId(a.fields.einkaufsliste) === list.record_id;
              });
              const offen = listItems.filter(a => a.fields.status?.key !== 'gekauft').length;
              const total = listItems.length;
              const isSelected = selectedListId === list.record_id;
              return (
                <button
                  key={list.record_id}
                  onClick={() => setSelectedListId(isSelected ? null : list.record_id)}
                  className={`w-full text-left px-5 py-4 transition-colors group ${
                    isSelected ? 'bg-primary/8' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-medium text-sm truncate ${isSelected ? 'text-primary' : ''}`}>
                          {list.fields.listenname || 'Unbenannte Liste'}
                        </span>
                        {isSelected && <IconChevronRight size={14} className="text-primary shrink-0" />}
                      </div>
                      {list.fields.datum && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                          <IconCalendar size={11} className="shrink-0" />
                          <span>{formatDate(list.fields.datum)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        {total > 0 ? (
                          <>
                            <span className="text-xs text-muted-foreground">{total} Artikel</span>
                            {offen > 0 && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-amber-600 border-amber-300 bg-amber-50">
                                {offen} offen
                              </Badge>
                            )}
                            {offen === 0 && total > 0 && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-green-600 border-green-300 bg-green-50">
                                Erledigt
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Leer</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        className="p-1 rounded hover:bg-muted transition-colors"
                        onClick={() => { setEditList(list); setListDialogOpen(true); }}
                      >
                        <IconPencil size={13} className="text-muted-foreground" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-destructive/10 transition-colors"
                        onClick={() => setDeleteListTarget(list.record_id)}
                      >
                        <IconTrash size={13} className="text-destructive" />
                      </button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Artikel der ausgewählten Liste */}
        <div className="rounded-[20px] bg-card shadow-md overflow-hidden">
          {!selectedList ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <IconShoppingCart size={48} className="text-muted-foreground mb-4" stroke={1.5} />
              <h3 className="font-semibold text-base mb-1">Keine Liste ausgewählt</h3>
              <p className="text-sm text-muted-foreground">Wähle links eine Einkaufsliste aus, um die Artikel zu sehen.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border flex-wrap">
                <div className="min-w-0">
                  <h2 className="font-semibold text-base truncate">
                    {selectedList.fields.listenname || 'Unbenannte Liste'}
                  </h2>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {selectedList.fields.datum && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <IconCalendar size={11} className="shrink-0" />
                        {formatDate(selectedList.fields.datum)}
                      </span>
                    )}
                    {selectedList.fields.beschreibung && (
                      <span className="text-xs text-muted-foreground truncate max-w-xs">
                        {selectedList.fields.beschreibung}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {listGekauftCount}/{listArtikel.length} erledigt
                    </span>
                    {listOffenCount > 0 && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-amber-600 border-amber-300 bg-amber-50">
                        {listOffenCount} offen
                      </Badge>
                    )}
                    {listOffenCount === 0 && listArtikel.length > 0 && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-green-600 border-green-300 bg-green-50">
                        Alles erledigt!
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={() => { setEditArtikel(null); setArtikelDialogOpen(true); }}
                >
                  <IconPlus size={14} className="shrink-0" />
                  <span className="hidden sm:inline">Artikel hinzufügen</span>
                  <span className="sm:hidden">Hinzufügen</span>
                </Button>
              </div>

              {/* Progress bar */}
              {listArtikel.length > 0 && (
                <div className="px-5 pt-3 pb-1">
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${listArtikel.length > 0 ? (listGekauftCount / listArtikel.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Filter bar */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border flex-wrap">
                <button
                  onClick={() => setPersonFilterKey('alle')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    personFilterKey === 'alle'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Alle
                </button>
                {personenKuerzel.map(k => (
                  <button
                    key={k}
                    onClick={() => setPersonFilterKey(personFilterKey === k ? 'alle' : k)}
                    className={`w-7 h-7 rounded-full text-xs font-semibold transition-colors ${
                      personFilterKey === k
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {k}
                  </button>
                ))}
                {/* + New Person Popover */}
                <Popover open={newPersonenPopoverOpen} onOpenChange={setNewPersonenPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="w-7 h-7 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 flex items-center justify-center text-sm font-semibold transition-colors"
                    >
                      +
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-4" align="start">
                    <p className="text-sm font-medium mb-3">Neue Person anlegen</p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Vorname"
                        value={newPersonenFields.vorname}
                        onChange={e => setNewPersonenFields(f => ({ ...f, vorname: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        type="text"
                        placeholder="Nachname"
                        value={newPersonenFields.nachname}
                        onChange={e => setNewPersonenFields(f => ({ ...f, nachname: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        onKeyDown={e => { if (e.key === 'Enter') handleCreateNewPerson(); }}
                      />
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={savingNewPerson || (!newPersonenFields.vorname && !newPersonenFields.nachname)}
                        onClick={handleCreateNewPerson}
                      >
                        {savingNewPerson ? 'Speichern...' : 'Erstellen'}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="divide-y divide-border">
                {sortedFilteredArtikel.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                    <IconPackage size={36} className="text-muted-foreground mb-3" stroke={1.5} />
                    <p className="text-sm text-muted-foreground">Diese Liste hat noch keine Artikel.</p>
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => { setEditArtikel(null); setArtikelDialogOpen(true); }}
                    >
                      <IconPlus size={14} className="mr-1" /> Artikel hinzufügen
                    </Button>
                  </div>
                )}
                {sortedFilteredArtikel.map(a => {
                  const isGekauft = a.fields.status?.key === 'gekauft';
                  const personId = extractRecordId(a.fields.person);
                  const hasPerson = !!personId;
                  return (
                    <div
                      key={a.record_id}
                      className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${
                        isGekauft ? 'bg-muted/30' : 'hover:bg-muted/20'
                      }`}
                    >
                      {/* Checkbox toggle */}
                      <button
                        onClick={() => handleToggleStatus(a)}
                        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isGekauft
                            ? 'border-green-500 bg-green-500'
                            : 'border-muted-foreground/40 hover:border-primary'
                        }`}
                      >
                        {isGekauft && <IconCheck size={11} className="text-white" stroke={2.5} />}
                      </button>

                      {/* Item info */}
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium ${isGekauft ? 'line-through text-muted-foreground' : ''}`}>
                          {a.fields.artikelname || 'Unbenannter Artikel'}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {(a.fields.menge || a.fields.einheit) && (
                            <span className="text-xs text-muted-foreground">
                              {a.fields.menge ?? ''}{a.fields.menge && a.fields.einheit ? ' ' : ''}{a.fields.einheit?.label ?? ''}
                            </span>
                          )}
                          {a.personName && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <IconUsers size={10} className="shrink-0" />
                              {a.personName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Assign person button (only when no person assigned) */}
                      {!hasPerson && (
                        <Popover
                          open={assignPopoverArtikelId === a.record_id}
                          onOpenChange={open => setAssignPopoverArtikelId(open ? a.record_id : null)}
                        >
                          <PopoverTrigger asChild>
                            <button
                              className="shrink-0 p-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Person zuweisen"
                            >
                              <IconHandStop size={14} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-52 p-2" align="end">
                            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Wer soll das besorgen?</p>
                            {personen.length === 0 && (
                              <p className="text-xs text-muted-foreground px-1">Keine Personen vorhanden.</p>
                            )}
                            {personen.map(p => (
                              <button
                                key={p.record_id}
                                onClick={() => handleAssignPerson(a.record_id, p.record_id)}
                                className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-sm"
                              >
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-semibold text-primary">
                                    {(p.fields.vorname?.[0] ?? p.fields.nachname?.[0] ?? '?').toUpperCase()}
                                  </span>
                                </div>
                                <span className="truncate">
                                  {[p.fields.vorname, p.fields.nachname].filter(Boolean).join(' ') || 'Unbekannt'}
                                </span>
                              </button>
                            ))}
                          </PopoverContent>
                        </Popover>
                      )}

                      {/* Unassign person button (X) when person is assigned */}
                      {hasPerson && (
                        <button
                          onClick={() => handleUnassignPerson(a)}
                          className="shrink-0 p-1.5 rounded-lg bg-muted/50 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Person entfernen"
                        >
                          <IconX size={14} />
                        </button>
                      )}

                      {/* Actions */}
                      <div className="flex gap-1 shrink-0">
                        <button
                          className="p-1 rounded hover:bg-muted transition-colors"
                          onClick={() => { setEditArtikel(a); setArtikelDialogOpen(true); }}
                        >
                          <IconPencil size={13} className="text-muted-foreground" />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-destructive/10 transition-colors"
                          onClick={() => setDeleteArtikelTarget(a.record_id)}
                        >
                          <IconTrash size={13} className="text-destructive" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Personen overview */}
      {personen.length > 0 && (
        <div className="rounded-[20px] bg-card shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <span className="font-semibold text-base">Personen</span>
              <span className="ml-2 text-sm text-muted-foreground">({personen.length})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => { setEditPerson(null); setPersonenDialogOpen(true); }}
            >
              <IconPlus size={14} className="shrink-0" />
              <span className="hidden sm:inline">Neue Person</span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {sortedPersonen.map(p => {
              const count = enrichedArtikel.filter(a => {
                const pid = extractRecordId(a.fields.person);
                return pid === p.record_id;
              }).length;
              const kuerzel = (p.fields.vorname?.[0] ?? p.fields.nachname?.[0] ?? '?').toUpperCase();
              const fullName = [p.fields.vorname, p.fields.nachname].filter(Boolean).join(' ') || 'Unbekannt';
              return (
                <Popover key={p.record_id}>
                  <PopoverTrigger asChild>
                    <button
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-colors cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary">{kuerzel}</span>
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-medium truncate">{fullName}</p>
                        {count > 0 && (
                          <p className="text-xs text-muted-foreground">{count} Artikel</p>
                        )}
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3" align="start">
                    <p className="text-sm font-semibold mb-3">{fullName}</p>
                    <div className="space-y-2">
                      <button
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-sm text-left"
                        onClick={() => { setEditPerson(p); setPersonenDialogOpen(true); }}
                      >
                        <IconPencil size={13} className="shrink-0 text-muted-foreground" />
                        Bearbeiten
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <EinkaufslistenDialog
        open={listDialogOpen}
        onClose={() => { setListDialogOpen(false); setEditList(null); }}
        onSubmit={async (fields) => {
          if (editList) {
            await LivingAppsService.updateEinkaufslistenEntry(editList.record_id, fields);
          } else {
            await LivingAppsService.createEinkaufslistenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editList?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Einkaufslisten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Einkaufslisten']}
      />

      <ArtikelDialog
        open={artikelDialogOpen}
        onClose={() => { setArtikelDialogOpen(false); setEditArtikel(null); }}
        onSubmit={async (fields) => {
          if (editArtikel) {
            await LivingAppsService.updateArtikelEntry(editArtikel.record_id, fields);
          } else {
            await LivingAppsService.createArtikelEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editArtikel ? editArtikel.fields : (selectedListId ? {
          einkaufsliste: createRecordUrl(APP_IDS.EINKAUFSLISTEN, selectedListId),
        } : undefined)}
        einkaufslistenList={einkaufslisten}
        personenList={personen}
        enablePhotoScan={AI_PHOTO_SCAN['Artikel']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Artikel']}
      />

      <PersonenDialog
        open={personenDialogOpen}
        onClose={() => { setPersonenDialogOpen(false); setEditPerson(null); }}
        onSubmit={async (fields) => {
          if (editPerson) {
            await LivingAppsService.updatePersonenEntry(editPerson.record_id, fields);
          } else {
            await LivingAppsService.createPersonenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editPerson?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Personen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Personen']}
      />

      <ConfirmDialog
        open={!!deleteListTarget}
        title="Liste löschen"
        description="Soll diese Einkaufsliste wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
        onConfirm={handleDeleteList}
        onClose={() => setDeleteListTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteArtikelTarget}
        title="Artikel löschen"
        description="Soll dieser Artikel wirklich gelöscht werden?"
        onConfirm={handleDeleteArtikel}
        onClose={() => setDeleteArtikelTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <Skeleton className="h-80 rounded-[20px]" />
        <Skeleton className="h-80 rounded-[20px]" />
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}
