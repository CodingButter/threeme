import { EventManager, type Listener } from "@/utils/EventManager";
import { BetterFetch } from "@/utils";
import type {
  BetterFetchOptions,
  BetterResponse,
  CrossOriginMode,
  ProgressInfo,
} from "./BetterFetch";
export type TextFileEvents = "load" | "error" | "progress";

export type RequestHeadersRecord = { [key: string]: string | undefined };

export class RemoteFile extends EventManager {
  private _loaded: boolean = false;
  private _src?: string;
  public onLoad: ((text: string) => void) | null = null;
  public onError: ((error: any) => void) | null = null;
  public onProgress: ((progressInfo: ProgressInfo) => void) | null = null;
  private fetchOptions: Partial<BetterFetchOptions> = {};

  constructor(src?: string) {
    super();
    if (src) {
      this.src = src;
    }
  }

  public async load(
    src: string,
    options: Partial<BetterFetchOptions> = {}
  ): Promise<BetterResponse | void> {
    const response: BetterResponse | void = await BetterFetch(src, {
      onDownloadProgress: (progresInfo: ProgressInfo) => {
        this.emit("progress", progresInfo);
      },
      ...this.fetchOptions,
      ...options,
    }).catch((error) => {
      this.emit("error", error);
    });
    if (response?.ok) {
      this.emit("load", response);
      this._loaded = true;
    }
    return response;
  }

  public override addEventListener(event: TextFileEvents, listener: Listener): void {
    super.addEventListener(event as string, listener);
  }

  public override removeEventListener(event: TextFileEvents, listener: Listener): void {
    super.removeEventListener(event as string, listener);
  }

  get loaded(): boolean {
    return this._loaded;
  }

  get src(): string | undefined {
    return this._src;
  }

  set src(value: string | undefined) {
    if (value !== this._src) {
      this._src = value;
      this._loaded = false;
      if (value) {
        this.load(value);
      }
    }
  }

  get crossOrigin(): CrossOriginMode | undefined {
    return this.fetchOptions?.crossOrigin;
  }

  set crossOrigin(value: CrossOriginMode | undefined) {
    this.fetchOptions = { ...this.fetchOptions, crossOrigin: value };
  }

  get referrerPolicy(): ReferrerPolicy | undefined {
    return this.fetchOptions?.referrerPolicy;
  }

  set referrerPolicy(value: ReferrerPolicy | undefined) {
    this.fetchOptions = { ...this.fetchOptions, referrerPolicy: value };
  }

  get headers(): Record<string, string> | undefined {
    return this.fetchOptions?.headers;
  }

  set headers(value: Record<string, string> | undefined) {
    this.fetchOptions = { ...this.fetchOptions, headers: value };
  }
}
