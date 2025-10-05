import type { CrossOriginMode, ProgressInfo } from "@/utils/BetterFetch";
import { DefaultLoadingManager, type LoadingManager } from "./LoadingManager";

export type onLoadCallback = (data: any) => void;
export type onProgressCallback = (progressInfo: ProgressInfo) => void;
export type onErrorCallback = (error: ErrorEvent) => void;
export type RequestHeadersRecord = Record<string, string>;

export abstract class Loader {
  public url: string = "";
  public static DEFAUlt_MATERIAL_NAME = "__DEFAULT";
  protected crossOrigin: CrossOriginMode = "anonymous";
  protected withCredentials: boolean = false;
  protected referrerPolicy: ReferrerPolicy = "no-referrer";
  protected path: string = "";
  protected resourcePath: string = "";
  protected requestHeader: RequestHeadersRecord = {};
  constructor(protected manager: LoadingManager = DefaultLoadingManager) {}

  /* abstract */
  public abstract load(...args: any[]): any;

  public loadAsync(onProgress: onProgressCallback): Promise<any> {
    return new Promise((resolve: onLoadCallback, reject: onErrorCallback) => {
      this.load(this.url, resolve, onProgress, reject);
    });
  }

  public onProgress: onProgressCallback = (progress: ProgressInfo) => {};
  /* abstract */
  protected parse(data: any): any | void {
    throw new Error("Method not implemented.");
  }

  public setPath(value: string): Loader {
    this.path = value;
    return this;
  }

  public setResourcePath(value: string): Loader {
    this.resourcePath = value;
    return this;
  }
}
