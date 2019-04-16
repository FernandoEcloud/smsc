
declare namespace smsc {
  export function release(): void;
}

declare function Smsc(alias: string, apikey: string): any;
export = Smsc;