export type LMonLoad = (() => void) | undefined;
export type LMonProgress = ((url: string, loaded: number, total: number) => void) | undefined;
export type LMonError = ((url: string) => void) | undefined;
export type LMUrlResolver = ((url: string) => string) | undefined;
export type LMonStart =
  | ((url: string, itemsLoaded: number, itemsTotal: number) => void)
  | undefined;
export type LMonItemStart =
  | ((url: string, itemsLoaded: number, itemsTotal: number) => void)
  | undefined;

export class LoadingManager {
  public isLoading = false;
  public itemsLoaded = 0;
  public itemsTotal = 0;
  private onStart?: LMonStart = undefined;
  private abortController = new AbortController();
  public urlResolver: LMUrlResolver = undefined;
  constructor(
    private onLoad: LMonLoad = undefined,
    private onProgress: LMonProgress = undefined,
    private onError: LMonError = undefined
  ) {}

  public itemsStart(url: string) {
    this.itemsTotal++;
    if (!this.isLoading !== undefined) {
      if (this.onStart) {
        this.onStart(url, this.itemsLoaded, this.itemsTotal);
      }
    }
    this.isLoading = true;
  }

  public itemEnd(url: string) {
    this.itemsLoaded++;
    if (this.onProgress !== undefined) {
      this.onProgress(url.toString(), this.itemsLoaded, this.itemsTotal);
    }
    if (this.itemsLoaded === this.itemsTotal) {
      this.isLoading = false;
      if (this.onLoad !== undefined) {
        this.onLoad();
      }
    }
  }

  public itemError(url: string) {
    if (this.onError !== undefined) {
      this.onError(url);
    }
  }

  public abort(): LoadingManager {
    this.abortController.abort();
    this.abortController = new AbortController();
    return this;
  }

  public resolveURL(url: string): string {
    if (this.urlResolver !== undefined) {
      return this.urlResolver(url);
    }
    return url;
  }
}

export const DefaultLoadingManager = new LoadingManager();
