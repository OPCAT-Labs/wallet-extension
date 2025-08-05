declare module 'browser-passworder' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function encrypt(password: string, privateKey: any): Promise<string>;
  export function decrypt(password: string, encrypted: string): Promise<Buffer>;
}
