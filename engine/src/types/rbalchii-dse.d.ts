declare module '@rbalchii/dse' {
  export function expandTerms(terms: string[]): Promise<string[]>;
  export function loadSynonymRing(): Promise<void>;
  export function isExpansionReady(): boolean;
}