/* =========================================================================
   BetterFetch — Response-like XHR+fetch helper with upload/download
   progress, scoped referrerPolicy override, simple TTL cache, and
   **exported literal types & constant lists** for great IntelliSense.
   ========================================================================= */

// ------------------------------ Exported literals ------------------------------

// Cross-origin behavior (mirrors <img>.crossOrigin)
export const CROSS_ORIGIN_VALUES = [null, "anonymous", "use-credentials"] as const;
export type CrossOriginMode = (typeof CROSS_ORIGIN_VALUES)[number];

// Referrer policies (matches lib.dom's ReferrerPolicy; exported for convenience)
export const REFERRER_POLICIES = [
  "no-referrer",
  "no-referrer-when-downgrade",
  "origin",
  "origin-when-cross-origin",
  "same-origin",
  "strict-origin",
  "strict-origin-when-cross-origin",
  "unsafe-url",
] as const;
export type ReferrerPolicyValue = (typeof REFERRER_POLICIES)[number]; // alias if consumer lacks lib.dom types

// Cache control modes (library-level)
export const CACHE_MODES = [
  "default",
  "reload",
  "no-store",
  "force-cache",
  "only-if-cached",
] as const;
export type CacheMode = (typeof CACHE_MODES)[number];

// Transport choices
export const TRANSPORTS = ["auto", "xhr", "fetch"] as const;
export type Transport = (typeof TRANSPORTS)[number];

// ------------------------------ Core types ------------------------------

export type ProgressInfo = {
  loaded: number;
  total: number;
  percent: number;
  raw: ProgressEvent<EventTarget>;
};

export interface BetterFetchOptions {
  method?: string; // default: "GET"
  headers?: Record<string, string>;
  body?: Document | XMLHttpRequestBodyInit | null; // XHR supports Document

  // Credentials (XHR-style)
  crossOrigin?: CrossOriginMode | null;
  withCredentials?: boolean; // overrides crossOrigin mapping

  // Control referrer behavior
  referrerPolicy?: ReferrerPolicy | ReferrerPolicyValue; // per-request via fetch, or scoped override for XHR

  // Timeouts & abort
  timeoutMs?: number;
  signal?: AbortSignal;

  // Progress
  onUploadProgress?: (p: ProgressInfo) => void;
  onDownloadProgress?: (p: ProgressInfo) => void;

  // Caching
  cache?: CacheMode; // default: "default"
  cacheTtlMs?: number; // default: 5 min
  cacheKey?: string; // override automatic key
  cacheableMethods?: string[]; // default: ["GET"]
  varyHeaders?: string[]; // headers to include in cache key (lower-cased)
  cacheStore?: CacheStore; // default: MemoryCacheStore
  cacheMaxEntries?: number; // for default store

  // Transport selection
  transport?: Transport; // default: auto
}

export interface BetterResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly url: string;
  readonly headers: HeadersLite;

  arrayBuffer(): Promise<ArrayBuffer>;
  buffer(): Promise<ArrayBuffer>; // alias
  blob(): Promise<Blob>;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
  formData(): Promise<FormData>;
  image(): Promise<HTMLImageElement>;
  imageBitmap(): Promise<ImageBitmap>;

  readonly _raw: ArrayBuffer; // raw bytes
  readonly _contentType: string | undefined;
  readonly _xhr: XMLHttpRequest; // underlying XHR instance (or placeholder for fetch)
}

// -------------------------- Headers-lite ---------------------------

export class HeadersLite {
  private map = new Map<string, string>();
  constructor(init?: Record<string, string>) {
    if (init) for (const [k, v] of Object.entries(init)) this.map.set(k.toLowerCase(), v);
  }
  get(name: string) {
    return this.map.get(name.toLowerCase());
  }
  has(name: string) {
    return this.map.has(name.toLowerCase());
  }
  entries() {
    return this.map.entries();
  }
  keys() {
    return this.map.keys();
  }
  toJSON() {
    const obj: Record<string, string> = {};
    for (const [k, v] of this.map) obj[k] = v;
    return obj;
  }
}

// ----------------------------- Cache -------------------------------

export interface CacheEntry {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: ArrayBuffer; // raw bytes
  storedAt: number; // ms epoch
  ttlMs: number; // ms
}

export interface CacheStore {
  get(key: string): Promise<CacheEntry | undefined>;
  set(key: string, entry: CacheEntry): Promise<void>;
  delete(key: string): Promise<void>;
  size?(): Promise<number>;
}

export class MemoryCacheStore implements CacheStore {
  private max: number;
  private map = new Map<string, CacheEntry>();
  constructor(maxEntries = 200) {
    this.max = Math.max(1, maxEntries);
  }
  async get(key: string) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    // LRU bump
    this.map.delete(key);
    this.map.set(key, entry);
    return entry;
  }
  async set(key: string, entry: CacheEntry) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, entry);
    if (this.map.size > this.max) {
      const firstKey = this.map.keys().next().value as string;
      this.map.delete(firstKey);
    }
  }
  async delete(key: string) {
    this.map.delete(key);
  }
  async size() {
    return this.map.size;
  }
}

// --------------------------- Utilities -----------------------------

const FORBIDDEN = new Set([
  "accept-charset",
  "accept-encoding",
  "access-control-request-headers",
  "access-control-request-method",
  "connection",
  "content-length",
  "cookie",
  "cookie2",
  "date",
  "dnt",
  "expect",
  "host",
  "keep-alive",
  "origin",
  "referer",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "via",
]);

function isForbiddenHeader(name: string) {
  const n = name.toLowerCase();
  return FORBIDDEN.has(n) || n.startsWith("sec-") || n.startsWith("proxy-");
}

function parseResponseHeaders(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  raw
    .trim()
    .split(/[\r\n]+/)
    .forEach((line) => {
      const i = line.indexOf(":");
      if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    });
  const low: Record<string, string> = {};
  for (const [k, v] of Object.entries(out)) low[k.toLowerCase()] = v;
  return low;
}

function defaultCacheable(method: string, cacheableMethods?: string[]) {
  const list = cacheableMethods ?? ["GET"];
  return list.includes(method.toUpperCase());
}

function buildCacheKey(
  url: string,
  method: string,
  headers: Record<string, string> | undefined,
  vary: string[] | undefined,
  explicit?: string
) {
  if (explicit) return explicit;
  const m = method.toUpperCase();
  const parts: string[] = [m, url];
  if (vary?.length && headers) {
    const low = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    const take = vary.map((h) => `${h.toLowerCase()}:${low[h.toLowerCase()] ?? ""}`);
    parts.push(...take);
  }
  return parts.join("||");
}

function arrayBufferToText(buf: ArrayBuffer, type?: string) {
  const enc = (type && /charset=([^;]+)/i.exec(type)?.[1]) || "utf-8";
  return new TextDecoder(enc).decode(new Uint8Array(buf));
}

function arrayBufferToBlob(buf: ArrayBuffer, type?: string) {
  return new Blob([buf], { type: type ?? "application/octet-stream" });
}

function concat(parts: Uint8Array[]): ArrayBuffer {
  const size = parts.reduce((n, p) => n + p.byteLength, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.byteLength;
  }
  return out.buffer;
}

export function toPercent(value: number, precision: number = 2): number {
  return parseFloat((value * 100).toFixed(precision));
}

// -------------- Referrer Policy (scoped meta override) -------------

function getReferrerMeta(): HTMLMetaElement | null {
  return document.head.querySelector('meta[name="referrer"]');
}

function installReferrerPolicy(policy: ReferrerPolicy | ReferrerPolicyValue): {
  restore: () => void;
  restored: boolean;
} {
  const head = document.head;
  const existing = getReferrerMeta();
  const hadTag = !!existing;
  const prevContent = existing?.content ?? null;

  const meta =
    existing ??
    (() => {
      const m = document.createElement("meta");
      m.name = "referrer";
      head.appendChild(m);
      return m;
    })();

  meta.content = policy;

  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    if (hadTag) {
      if (prevContent === null) meta.removeAttribute("content");
      else meta.content = prevContent;
    } else {
      meta.remove();
    }
  };

  return { restore, restored };
}

// ----------------------- Transport selection ----------------------

export async function BetterFetch(
  url: string,
  options: BetterFetchOptions = {}
): Promise<BetterResponse> {
  const {
    method = "GET",
    headers,
    body = null,
    crossOrigin = null,
    withCredentials,
    referrerPolicy,
    timeoutMs,
    signal,
    onUploadProgress,
    onDownloadProgress,

    cache = "default",
    cacheTtlMs = 5 * 60_000,
    cacheKey,
    cacheableMethods,
    varyHeaders,
    cacheStore = new MemoryCacheStore(options.cacheMaxEntries ?? 200),

    transport = "auto",
  } = options;

  const upperMethod = method.toUpperCase();
  const cacheEligible = cache !== "no-store" && defaultCacheable(upperMethod, cacheableMethods);
  const key = buildCacheKey(url, upperMethod, headers, varyHeaders, cacheKey);

  // Cache read
  if (cacheEligible) {
    const entry = await cacheStore.get(key);
    if (entry) {
      const age = Date.now() - entry.storedAt;
      const fresh = age <= entry.ttlMs;
      if (cache === "force-cache" || (cache === "default" && fresh) || cache === "only-if-cached") {
        return makeResponseFromCache(entry);
      }
      // stale or reload → fall through
    } else if (cache === "only-if-cached") {
      throw new Error("BetterFetch: only-if-cached but no cache entry found");
    }
  }

  // Decide transport
  const needsUploadProgress = !!onUploadProgress && body != null;
  const wantPerRequestReferrer = !!referrerPolicy;
  const useFetch =
    transport === "fetch" ||
    (transport === "auto" && wantPerRequestReferrer && !needsUploadProgress);

  const resp = useFetch
    ? await fetchTransport(url, {
        method,
        headers,
        body,
        withCredentials,
        crossOrigin,
        referrerPolicy,
        signal,
        onDownloadProgress,
      })
    : await xhrTransport(url, {
        method,
        headers,
        body,
        withCredentials,
        crossOrigin,
        referrerPolicy,
        signal,
        onUploadProgress,
        onDownloadProgress,
        timeoutMs,
      });

  // Cache write (for successful responses only)
  if (cacheEligible && resp.ok) {
    const entry: CacheEntry = {
      url: resp.url,
      status: resp.status,
      statusText: resp.statusText,
      headers: resp.headers.toJSON(),
      body: resp._raw.slice(0),
      storedAt: Date.now(),
      ttlMs: cacheTtlMs,
    };
    cacheStore.set(key, entry).catch(() => void 0);
  }

  return resp;
}

// ----------------------- XHR transport (UL/DL) ---------------------

async function xhrTransport(
  url: string,
  opts: {
    method?: string;
    headers?: Record<string, string>;
    body?: Document | XMLHttpRequestBodyInit | null;
    withCredentials?: boolean;
    crossOrigin?: CrossOriginMode | null;
    referrerPolicy?: ReferrerPolicy | ReferrerPolicyValue;
    signal?: AbortSignal;
    onUploadProgress?: (p: ProgressInfo) => void;
    onDownloadProgress?: (p: ProgressInfo) => void;
    timeoutMs?: number;
  }
): Promise<BetterResponse> {
  const {
    method = "GET",
    headers,
    body = null,
    withCredentials,
    crossOrigin,
    referrerPolicy,
    signal,
    onUploadProgress,
    onDownloadProgress,
    timeoutMs,
  } = opts;

  const xhr = new XMLHttpRequest();

  // Temporarily set document referrer policy right before init
  const scoped = referrerPolicy ? installReferrerPolicy(referrerPolicy) : null;

  xhr.open(method, url, true);
  xhr.responseType = "arraybuffer";
  xhr.withCredentials = withCredentials ?? crossOrigin === "use-credentials";
  if (timeoutMs) xhr.timeout = timeoutMs;

  // Headers (skip forbidden; ignore manual Content-Type for FormData)
  if (headers) {
    for (const [k, v] of Object.entries(headers)) {
      if (isForbiddenHeader(k)) {
        console.warn(`[BetterFetch] Ignoring forbidden header: ${k}`);
        continue;
      }
      if (body instanceof FormData && k.toLowerCase() === "content-type") {
        console.warn("[BetterFetch] Ignoring Content-Type for FormData; browser sets boundary.");
        continue;
      }
      xhr.setRequestHeader(k, v);
    }
  }

  // Restore referrer policy as soon as request has started
  const restoreOnce = () => scoped?.restore();
  xhr.onloadstart = restoreOnce;
  xhr.onreadystatechange = () => {
    if (xhr.readyState >= 2) restoreOnce();
  };
  xhr.onerror = restoreOnce;
  xhr.ontimeout = restoreOnce;
  xhr.onabort = restoreOnce;

  // Progress
  if (onUploadProgress && xhr.upload) {
    xhr.upload.onprogress = (ev) => {
      const total = ev.lengthComputable ? ev.total : 0;
      const loaded = ev.loaded || 0;
      onUploadProgress({ loaded, total, percent: total ? toPercent(loaded / total) : 0, raw: ev });
    };
  }
  if (onDownloadProgress) {
    xhr.onprogress = (ev) => {
      const total = ev.lengthComputable ? ev.total : 0;
      const loaded = ev.loaded || 0;
      onDownloadProgress({
        loaded,
        total,
        percent: total ? toPercent(loaded / total) : 0,
        raw: ev,
      });
    };
  }

  // Abort
  const doAbort = () => {
    try {
      xhr.abort();
    } finally {
      restoreOnce();
    }
  };
  if (signal) {
    if (signal.aborted) doAbort();
    else signal.addEventListener("abort", doAbort, { once: true });
  }

  const response = await new Promise<BetterResponse>((resolve, reject) => {
    xhr.onload = () => {
      const ok = (xhr.status >= 200 && xhr.status < 300) || xhr.status === 304;
      if (!ok) {
        reject(new Error(`HTTP ${xhr.status} ${xhr.statusText}`));
        return;
      }

      const rawHeaders = parseResponseHeaders(xhr.getAllResponseHeaders());
      const contentType = rawHeaders["content-type"];
      const abuf = xhr.response as ArrayBuffer;

      resolve(
        makeBetterResponse({
          url: xhr.responseURL || url,
          status: xhr.status,
          statusText: xhr.statusText,
          headers: rawHeaders,
          body: abuf,
          xhr,
          contentType,
        })
      );
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.ontimeout = () => reject(new Error("Request timed out"));
    xhr.onabort = () => reject(new Error("Request aborted"));

    xhr.send(body);
  });

  return response;
}

// -------------------- fetch transport (DL only) --------------------

async function fetchTransport(
  url: string,
  opts: {
    method?: string;
    headers?: Record<string, string>;
    body?: Document | XMLHttpRequestBodyInit | null; // may include Document; we'll coerce
    withCredentials?: boolean;
    crossOrigin?: CrossOriginMode | null;
    referrerPolicy?: ReferrerPolicy | ReferrerPolicyValue;
    signal?: AbortSignal;
    onDownloadProgress?: (p: ProgressInfo) => void;
  }
): Promise<BetterResponse> {
  const {
    method = "GET",
    headers,
    body = null,
    withCredentials,
    crossOrigin,
    referrerPolicy,
    signal,
    onDownloadProgress,
  } = opts;

  // Coerce body for fetch: convert Document → serialized string
  let bodyForFetch: BodyInit | null = null;
  let headersForFetch: Record<string, string> | undefined = headers ? { ...headers } : undefined;
  if (body instanceof Document) {
    const serialized = new XMLSerializer().serializeToString(body);
    bodyForFetch = serialized;
    const hasCT =
      headersForFetch &&
      Object.keys(headersForFetch).some((k) => k.toLowerCase() === "content-type");
    if (!hasCT) {
      headersForFetch = { ...(headersForFetch || {}), "Content-Type": "text/html;charset=utf-8" };
    }
  } else {
    bodyForFetch = body as BodyInit | null;
  }

  const credentials: RequestCredentials =
    (withCredentials ?? crossOrigin === "use-credentials") ? "include" : "omit";

  const res = await fetch(url, {
    method,
    headers: headersForFetch,
    body: bodyForFetch,
    credentials,
    referrerPolicy: referrerPolicy as ReferrerPolicy | undefined,
    signal,
    mode: "cors",
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

  const totalHeader = res.headers.get("content-length");
  const total = totalHeader ? Number(totalHeader) : 0;

  const chunks: Uint8Array[] = [];
  let loaded = 0;

  if (res.body && onDownloadProgress) {
    const reader = res.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.byteLength;
        onDownloadProgress({
          loaded,
          total,
          percent: total ? toPercent(loaded / total) : 0,
          raw: new ProgressEvent("progress"),
        });
      }
    }
  } else {
    const ab = await res.arrayBuffer();
    chunks.push(new Uint8Array(ab));
  }

  const buf = concat(chunks);
  const hdrs: Record<string, string> = {};
  res.headers.forEach((v, k) => (hdrs[k.toLowerCase()] = v));
  const ct = hdrs["content-type"];

  return makeBetterResponse({
    url: res.url,
    status: res.status,
    statusText: res.statusText,
    headers: hdrs,
    body: buf,
    xhr: new XMLHttpRequest(), // placeholder for shape parity
    contentType: ct,
  });
}

// ---------------------- Response construction ----------------------

function makeResponseFromCache(entry: CacheEntry): BetterResponse {
  const headers = new HeadersLite(entry.headers);
  const contentType = headers.get("content-type") ?? undefined;
  const raw = entry.body.slice(0);
  const xhr = new XMLHttpRequest(); // placeholder
  return makeBetterResponse({
    url: entry.url,
    status: entry.status,
    statusText: entry.statusText,
    headers: entry.headers,
    body: raw,
    xhr,
    contentType,
  });
}

function makeBetterResponse(args: {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: ArrayBuffer;
  xhr: XMLHttpRequest;
  contentType?: string;
}): BetterResponse {
  const headers = new HeadersLite(args.headers);
  const raw = args.body;
  const ct = args.contentType;

  let _blob: Blob | undefined;
  let _text: string | undefined;
  let _json: any | undefined;
  let _abuf: ArrayBuffer | undefined;
  let _form: FormData | undefined;

  const res: BetterResponse = {
    ok: args.status >= 200 && args.status < 300,
    status: args.status,
    statusText: args.statusText,
    url: args.url,
    headers,

    async arrayBuffer() {
      if (_abuf) return _abuf;
      _abuf = raw.slice(0);
      return _abuf;
    },
    async buffer() {
      return this.arrayBuffer();
    },
    async blob() {
      if (_blob) return _blob;
      _blob = arrayBufferToBlob(raw, ct);
      return _blob;
    },
    async text() {
      if (_text !== undefined) return _text;
      _text = arrayBufferToText(raw, ct).replace(/^\uFEFF/, "");
      return _text;
    },
    async json<T = unknown>() {
      if (_json !== undefined) return _json as T;
      const t = await this.text();
      _json = t ? JSON.parse(t) : null;
      return _json as T;
    },
    async formData() {
      if (_form) return _form;
      const type = ct?.toLowerCase() || "";
      if (type.includes("application/x-www-form-urlencoded")) {
        const f = new FormData();
        const params = new URLSearchParams(await this.text());
        params.forEach((v, k) => f.append(k, v));
        _form = f;
        return _form;
      }
      const f = new FormData();
      f.append("body", await this.blob(), "body.bin");
      _form = f;
      return _form;
    },
    async image() {
      const url = URL.createObjectURL(await this.blob());
      try {
        return await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = (e) => reject(e);
          img.src = url;
        });
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    },
    async imageBitmap() {
      const blob = await this.blob();
      // @ts-ignore
      if (typeof createImageBitmap === "function") return await createImageBitmap(blob);
      const img = await this.image();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2D canvas context unavailable");
      ctx.drawImage(img, 0, 0);
      // @ts-ignore
      return await createImageBitmap(canvas);
    },

    _raw: raw,
    _contentType: ct,
    _xhr: args.xhr,
  };

  return res;
}
