interface AtomizerOptions {
  strategy?: 'prose' | 'code';
  maxChunkSize?: number; // default 512
}

declare function atomize(text: string, options?: AtomizerOptions): string[];

export interface AtomizeFunction {
  (text: string, options?: AtomizerOptions): string[];
}

export declare const atomize: AtomizeFunction;
export default atomize;