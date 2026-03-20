import type { Artikel, Einkaufslisten, Personen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';

interface ArtikelViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Artikel | null;
  onEdit: (record: Artikel) => void;
  einkaufslistenList: Einkaufslisten[];
  personenList: Personen[];
}

export function ArtikelViewDialog({ open, onClose, record, onEdit, einkaufslistenList, personenList }: ArtikelViewDialogProps) {
  function getEinkaufslistenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return einkaufslistenList.find(r => r.record_id === id)?.fields.listenname ?? '—';
  }

  function getPersonenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return personenList.find(r => r.record_id === id)?.fields.vorname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Artikel anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Artikelname</Label>
            <p className="text-sm">{record.fields.artikelname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Menge</Label>
            <p className="text-sm">{record.fields.menge ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Einheit</Label>
            <Badge variant="secondary">{record.fields.einheit?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Badge variant="secondary">{record.fields.status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Einkaufsliste</Label>
            <p className="text-sm">{getEinkaufslistenDisplayName(record.fields.einkaufsliste)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Person</Label>
            <p className="text-sm">{getPersonenDisplayName(record.fields.person)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}