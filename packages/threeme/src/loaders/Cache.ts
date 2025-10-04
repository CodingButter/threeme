class CacheClass {
  files: { [key: string]: any } = {};
  enabled = true;
  add<T>(key: string, file: T): void {
    if (this.enabled === false) return;
    this.files[key] = file;
  }
  get<T>(key: string): T | undefined {
    if (this.enabled === false) return undefined;
    return this.files[key];
  }
  remove(key: string): void {
    delete this.files[key];
  }
  clear(): void {
    this.files = {};
  }
}

export const Cache = new CacheClass();
