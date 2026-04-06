// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Einkaufslisten {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    listenname?: string;
    beschreibung?: string;
    datum?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export interface Personen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
  };
}

export interface Artikel {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    artikelname?: string;
    menge?: number;
    einheit?: LookupValue;
    status?: LookupValue;
    einkaufsliste?: string; // applookup -> URL zu 'Einkaufslisten' Record
    person?: string; // applookup -> URL zu 'Personen' Record
  };
}

export const APP_IDS = {
  EINKAUFSLISTEN: '69bd60d5919ca5f05dca2818',
  PERSONEN: '69bd60d0fbc782bfece9bd53',
  ARTIKEL: '69bd60d5279653ca0a8a1856',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'artikel': {
    einheit: [{ key: "stueck", label: "Stück" }, { key: "kaesten", label: "Kästen" }, { key: "liter", label: "Liter" }, { key: "kilogramm", label: "Kilogramm" }, { key: "gramm", label: "Gramm" }, { key: "packung", label: "Packung" }, { key: "flasche", label: "Flasche" }, { key: "dose", label: "Dose" }],
    status: [{ key: "offen", label: "Noch zu kaufen" }, { key: "gekauft", label: "Gekauft" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'einkaufslisten': {
    'listenname': 'string/text',
    'beschreibung': 'string/textarea',
    'datum': 'date/date',
  },
  'personen': {
    'vorname': 'string/text',
    'nachname': 'string/text',
  },
  'artikel': {
    'artikelname': 'string/text',
    'menge': 'number',
    'einheit': 'lookup/select',
    'status': 'lookup/radio',
    'einkaufsliste': 'applookup/select',
    'person': 'applookup/select',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateEinkaufslisten = StripLookup<Einkaufslisten['fields']>;
export type CreatePersonen = StripLookup<Personen['fields']>;
export type CreateArtikel = StripLookup<Artikel['fields']>;