export type WorkspaceDocumentKind =
  | "text"
  | "spreadsheet"
  | "pdf"
  | "image"
  | "file";

export interface WorkspaceDocument {
  id: string;
  name: string;
  kind: WorkspaceDocumentKind;

  mimeType: string;
  size: number;

  owner: string;
  createdAt: string;
  updatedAt: string;

  starred: boolean;
  trashed: boolean;
  shared: boolean;

  content?: string;
  cells?: string[][];

  fileData?: Blob;
}

export function createEmptySpreadsheet(
  rows = 12,
  columns = 8,
): string[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => ""),
  );
}

export const seedDocuments: WorkspaceDocument[] = [
  {
    id: "document-compte-rendu-ag",
    name: "Compte rendu de l’assemblée générale",
    kind: "text",
    mimeType: "application/x-clm-text",
    size: 2450,
    owner: "Thomas Carré",
    createdAt: "2026-06-12T09:30:00",
    updatedAt: "2026-07-12T15:42:00",
    starred: true,
    trashed: false,
    shared: true,
    content: `
      <h1>Compte rendu de l’assemblée générale</h1>
      <p><strong>Date :</strong> 12 juin 2026</p>
      <p><strong>Présents :</strong> membres du bureau et responsables d’équipes.</p>
      <h2>Points abordés</h2>
      <ul>
        <li>Bilan de la saison sportive</li>
        <li>Préparation de la rentrée</li>
        <li>Organisation des inscriptions</li>
        <li>Répartition des responsabilités</li>
      </ul>
    `,
  },
  {
    id: "document-budget-tournoi",
    name: "Budget du tournoi de Pentecôte",
    kind: "spreadsheet",
    mimeType: "application/x-clm-spreadsheet",
    size: 1840,
    owner: "Thomas Carré",
    createdAt: "2026-06-15T11:20:00",
    updatedAt: "2026-07-10T18:15:00",
    starred: true,
    trashed: false,
    shared: true,
    cells: [
      ["Poste", "Prévision", "Réel", "Écart", "", "", "", ""],
      ["Location du gymnase", "350", "350", "0", "", "", "", ""],
      ["Arbitrage", "240", "240", "0", "", "", "", ""],
      ["Buvette", "500", "620", "120", "", "", "", ""],
      ["Récompenses", "300", "285", "-15", "", "", "", ""],
      ["Communication", "100", "74", "-26", "", "", "", ""],
      ["Total", "1490", "1569", "79", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
    ],
  },
  {
    id: "document-reglement-interieur",
    name: "Règlement intérieur 2026-2027.pdf",
    kind: "pdf",
    mimeType: "application/pdf",
    size: 812000,
    owner: "Laura Dubois",
    createdAt: "2026-07-01T10:15:00",
    updatedAt: "2026-07-01T10:15:00",
    starred: false,
    trashed: false,
    shared: true,
  },
  {
    id: "document-planning-salles",
    name: "Planning des salles",
    kind: "spreadsheet",
    mimeType: "application/x-clm-spreadsheet",
    size: 1260,
    owner: "Pierre Durand",
    createdAt: "2026-07-05T08:25:00",
    updatedAt: "2026-07-13T17:40:00",
    starred: false,
    trashed: false,
    shared: true,
    cells: [
      ["Jour", "Équipe", "Horaire", "Salle", "", "", "", ""],
      ["Lundi", "U15 Garçons", "18h30–20h00", "Gymnase A", "", "", "", ""],
      ["Mardi", "U13 Filles", "18h00–19h30", "Gymnase B", "", "", "", ""],
      ["Mercredi", "Seniors 1", "20h00–22h00", "Gymnase A", "", "", "", ""],
      ["Jeudi", "U18 Garçons", "18h30–20h00", "Gymnase B", "", "", "", ""],
      ["Vendredi", "Loisirs", "20h00–22h00", "Gymnase A", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
    ],
  },
  {
    id: "document-projet-sportif",
    name: "Projet sportif du club",
    kind: "text",
    mimeType: "application/x-clm-text",
    size: 3100,
    owner: "Thomas Carré",
    createdAt: "2026-06-20T14:00:00",
    updatedAt: "2026-07-08T09:18:00",
    starred: false,
    trashed: false,
    shared: false,
    content: `
      <h1>Projet sportif du club</h1>
      <p>Ce document présente les objectifs sportifs et associatifs du club pour les prochaines saisons.</p>
      <h2>Nos priorités</h2>
      <ol>
        <li>Développer la formation des jeunes</li>
        <li>Renforcer l’encadrement des équipes</li>
        <li>Favoriser la pratique féminine</li>
        <li>Former de nouveaux bénévoles</li>
      </ol>
    `,
  },
];