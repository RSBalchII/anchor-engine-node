declare module 'cozo-node' {
  export interface CozoDbOptions {
    db_path?: string;
    storage_type?: string;
  }

  export class CozoDb {
    constructor(storage_type?: string, db_path?: string);
    run(query: string, params?: Record<string, any>): any;
    close(): void;
    // Add other methods as needed based on actual usage
  }
}