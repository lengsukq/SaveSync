declare module 'archiver' {
  import { Writable } from 'stream';
  
  interface ArchiverOptions {
    zlib?: {
      level?: number;
    };
  }
  
  interface EntryData {
    name?: string;
    date?: Date;
    mode?: number;
    prefix?: string;
    stats?: any;
  }
  
  interface Archiver {
    directory(dirpath: string, destpath: string | false, data?: EntryData): Archiver;
    file(filepath: string, data: EntryData): Archiver;
    finalize(): void;
    pipe<T extends Writable>(destination: T): T;
    on(event: 'error', listener: (error: Error) => void): Archiver;
    on(event: 'close', listener: () => void): Archiver;
  }
  
  function archiver(format: string, options?: ArchiverOptions): Archiver;
  
  export = archiver;
}

declare module 'extract-zip' {
  interface ExtractOptions {
    dir: string;
  }
  
  function extract(zipPath: string, options: ExtractOptions): Promise<void>;
  
  export = extract;
}
