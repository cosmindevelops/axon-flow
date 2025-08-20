/**
 * Cross-platform type definitions
 *
 * These types provide platform-agnostic abstractions that work
 * across both Node.js and browser environments.
 */

/**
 * Platform type
 */
export type PlatformType = "node" | "browser" | "webworker" | "electron-main" | "electron-renderer" | "react-native";

/**
 * Platform information
 */
export interface IPlatformInfo {
  /** Platform type */
  readonly type: PlatformType;

  /** Platform version */
  readonly version: string;

  /** Is development environment */
  readonly isDevelopment: boolean;

  /** Is production environment */
  readonly isProduction: boolean;

  /** Is test environment */
  readonly isTest: boolean;

  /** Environment name */
  readonly environment: string;
}

/**
 * Cross-platform environment
 */
export interface IEnvironment {
  /** Platform info */
  readonly platform: IPlatformInfo;

  /** Environment variables */
  readonly variables: IEnvironmentVariables;

  /** Capabilities */
  readonly capabilities: IEnvironmentCapabilities;

  /** Runtime info */
  readonly runtime: IRuntimeInfo;
}

/**
 * Environment variables (cross-platform)
 */
export interface IEnvironmentVariables {
  /** Node environment */
  readonly NODE_ENV?: string;

  /** Debug mode */
  readonly DEBUG?: string;

  /** Log level */
  readonly LOG_LEVEL?: string;

  /** API URL */
  readonly API_URL?: string;

  /** Application name */
  readonly APP_NAME?: string;

  /** Application version */
  readonly APP_VERSION?: string;

  /** Custom variables */
  readonly [key: string]: string | undefined;
}

/**
 * Environment capabilities
 */
export interface IEnvironmentCapabilities {
  /** File system access */
  readonly fileSystem: boolean;

  /** Network access */
  readonly network: boolean;

  /** Process control */
  readonly process: boolean;

  /** Worker threads */
  readonly workers: boolean;

  /** Crypto */
  readonly crypto: boolean;

  /** Storage */
  readonly storage: boolean;

  /** Notifications */
  readonly notifications: boolean;

  /** Clipboard */
  readonly clipboard: boolean;
}

/**
 * Runtime information
 */
export interface IRuntimeInfo {
  /** Runtime name */
  readonly name: RuntimeName;

  /** Runtime version */
  readonly version: string;

  /** Architecture */
  readonly arch: string;

  /** Platform */
  readonly platform: string;

  /** Memory info */
  readonly memory: IMemoryInfo;

  /** CPU info */
  readonly cpu: ICPUInfo;
}

/**
 * Runtime names
 */
export type RuntimeName = "node" | "deno" | "bun" | "browser" | "webworker" | "react-native";

/**
 * Cross-platform memory info
 */
export interface IMemoryInfo {
  /** Total memory available */
  readonly total: number;

  /** Used memory */
  readonly used: number;

  /** Free memory */
  readonly free: number;

  /** Memory limit */
  readonly limit?: number;
}

/**
 * Cross-platform CPU info
 */
export interface ICPUInfo {
  /** CPU model */
  readonly model: string;

  /** Number of cores */
  readonly cores: number;

  /** CPU speed in MHz */
  readonly speed?: number;

  /** CPU usage percentage */
  readonly usage?: number;
}

/**
 * Cross-platform file system abstraction
 */
export interface IFileSystem {
  /** Read file */
  readFile(path: string): Promise<Uint8Array>;

  /** Write file */
  writeFile(path: string, data: Uint8Array): Promise<void>;

  /** Delete file */
  deleteFile(path: string): Promise<void>;

  /** Check if file exists */
  exists(path: string): Promise<boolean>;

  /** Get file stats */
  stat(path: string): Promise<IFileStats>;

  /** List directory */
  readdir(path: string): Promise<readonly string[]>;

  /** Create directory */
  mkdir(path: string): Promise<void>;

  /** Remove directory */
  rmdir(path: string): Promise<void>;
}

/**
 * Cross-platform file stats
 */
export interface IFileStats {
  /** Is file */
  readonly isFile: boolean;

  /** Is directory */
  readonly isDirectory: boolean;

  /** File size */
  readonly size: number;

  /** Created time */
  readonly created: Date;

  /** Modified time */
  readonly modified: Date;

  /** Accessed time */
  readonly accessed: Date;
}

/**
 * Cross-platform network abstraction
 */
export interface INetwork {
  /** Fetch resource */
  fetch(url: string, options?: IFetchOptions): Promise<IFetchResponse>;

  /** WebSocket connection */
  websocket(url: string, protocols?: string[]): IWebSocket;

  /** Network status */
  readonly status: INetworkStatus;
}

/**
 * Fetch options
 */
export interface IFetchOptions {
  /** HTTP method */
  readonly method?: HttpMethod;

  /** Headers */
  readonly headers?: Record<string, string>;

  /** Body */
  readonly body?: BodyInit;

  /** Mode */
  readonly mode?: RequestMode;

  /** Credentials */
  readonly credentials?: RequestCredentials;

  /** Cache */
  readonly cache?: RequestCache;

  /** Redirect */
  readonly redirect?: RequestRedirect;

  /** Timeout in milliseconds */
  readonly timeout?: number;
}

/**
 * HTTP methods
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

/**
 * Request modes
 */
export type RequestMode = "cors" | "no-cors" | "same-origin";

/**
 * Request credentials
 */
export type RequestCredentials = "omit" | "same-origin" | "include";

/**
 * Request cache
 */
export type RequestCache = "default" | "no-store" | "reload" | "no-cache" | "force-cache" | "only-if-cached";

/**
 * Request redirect
 */
export type RequestRedirect = "follow" | "manual" | "error";

/**
 * Body init types
 */
export type BodyInit = string | Uint8Array | FormData | URLSearchParams;

/**
 * Fetch response
 */
export interface IFetchResponse {
  /** Response OK */
  readonly ok: boolean;

  /** Status code */
  readonly status: number;

  /** Status text */
  readonly statusText: string;

  /** Headers */
  readonly headers: Record<string, string>;

  /** Get response as text */
  text(): Promise<string>;

  /** Get response as JSON */
  json<T = unknown>(): Promise<T>;

  /** Get response as bytes */
  bytes(): Promise<Uint8Array>;
}

/**
 * WebSocket interface
 */
export interface IWebSocket {
  /** Ready state */
  readonly readyState: WebSocketReadyState;

  /** Send message */
  send(data: string | Uint8Array): void;

  /** Close connection */
  close(code?: number, reason?: string): void;

  /** On open */
  onopen?: () => void;

  /** On message */
  onmessage?: (event: IWebSocketMessage) => void;

  /** On error */
  onerror?: (error: Error) => void;

  /** On close */
  onclose?: (event: IWebSocketCloseEvent) => void;
}

/**
 * WebSocket ready states
 */
export type WebSocketReadyState = 0 | 1 | 2 | 3; // CONNECTING | OPEN | CLOSING | CLOSED

/**
 * WebSocket message
 */
export interface IWebSocketMessage {
  /** Message data */
  readonly data: string | Uint8Array;

  /** Timestamp */
  readonly timestamp: number;
}

/**
 * WebSocket close event
 */
export interface IWebSocketCloseEvent {
  /** Close code */
  readonly code: number;

  /** Close reason */
  readonly reason: string;

  /** Was clean */
  readonly wasClean: boolean;
}

/**
 * Network status
 */
export interface INetworkStatus {
  /** Is online */
  readonly online: boolean;

  /** Connection type */
  readonly type?: string;

  /** Download speed */
  readonly downlink?: number;

  /** Round trip time */
  readonly rtt?: number;
}

/**
 * Cross-platform storage abstraction
 */
export interface IStorage {
  /** Get item */
  getItem(key: string): Promise<string | null>;

  /** Set item */
  setItem(key: string, value: string): Promise<void>;

  /** Remove item */
  removeItem(key: string): Promise<void>;

  /** Clear all items */
  clear(): Promise<void>;

  /** Get all keys */
  keys(): Promise<readonly string[]>;

  /** Storage type */
  readonly type: StorageType;

  /** Storage quota */
  readonly quota?: number;

  /** Storage usage */
  readonly usage?: number;
}

/**
 * Storage types
 */
export type StorageType = "memory" | "local" | "session" | "indexed" | "file";

/**
 * Cross-platform crypto abstraction
 */
export interface ICrypto {
  /** Generate random bytes */
  randomBytes(size: number): Uint8Array;

  /** Generate UUID */
  randomUUID(): string;

  /** Hash data */
  hash(algorithm: HashAlgorithm, data: Uint8Array): Promise<Uint8Array>;

  /** HMAC */
  hmac(algorithm: HashAlgorithm, key: Uint8Array, data: Uint8Array): Promise<Uint8Array>;

  /** Encrypt */
  encrypt(algorithm: CipherAlgorithm, key: Uint8Array, data: Uint8Array): Promise<Uint8Array>;

  /** Decrypt */
  decrypt(algorithm: CipherAlgorithm, key: Uint8Array, data: Uint8Array): Promise<Uint8Array>;
}

/**
 * Hash algorithms
 */
export type HashAlgorithm = "sha1" | "sha256" | "sha384" | "sha512" | "md5";

/**
 * Cipher algorithms
 */
export type CipherAlgorithm = "aes-128-cbc" | "aes-192-cbc" | "aes-256-cbc" | "aes-128-gcm" | "aes-256-gcm";

/**
 * Cross-platform timer abstraction
 */
export interface ITimer {
  /** Set timeout */
  setTimeout(callback: () => void, delay: number): ITimerHandle;

  /** Set interval */
  setInterval(callback: () => void, delay: number): ITimerHandle;

  /** Set immediate */
  setImmediate(callback: () => void): ITimerHandle;

  /** Clear timer */
  clearTimer(handle: ITimerHandle): void;
}

/**
 * Timer handle
 */
export interface ITimerHandle {
  /** Timer ID */
  readonly id: number | string;

  /** Cancel timer */
  cancel(): void;

  /** Refresh timer */
  refresh?(): void;
}

/**
 * Cross-platform event emitter
 */
export interface IEventEmitter<T = unknown> {
  /** Add event listener */
  on(event: string, listener: (data: T) => void): void;

  /** Add one-time listener */
  once(event: string, listener: (data: T) => void): void;

  /** Remove listener */
  off(event: string, listener: (data: T) => void): void;

  /** Emit event */
  emit(event: string, data: T): void;

  /** Remove all listeners */
  removeAllListeners(event?: string): void;

  /** Get listener count */
  listenerCount(event: string): number;
}

/**
 * Extended global type for platform checks
 */
interface IExtendedGlobal {
  process?: {
    type?: string;
    versions?: Record<string, string>;
  };
  require?: (module: string) => unknown;
  navigator?: {
    product?: string;
    userAgent?: string;
  };
  window?: unknown;
  document?: unknown;
  self?: unknown;
  importScripts?: unknown;
}

/**
 * Platform detection helpers
 */
export const platformDetection = {
  /** Check if running in Node.js */
  isNode(): boolean {
    const g = globalThis as IExtendedGlobal;
    return g.process?.versions !== undefined;
  },

  /** Check if running in browser */
  isBrowser(): boolean {
    const g = globalThis as IExtendedGlobal;
    return typeof g.window !== "undefined" && typeof g.document !== "undefined";
  },

  /** Check if running in web worker */
  isWebWorker(): boolean {
    const g = globalThis as IExtendedGlobal;
    return typeof g.self !== "undefined" && typeof g.importScripts === "function";
  },

  /** Check if running in Electron main process */
  isElectronMain(): boolean {
    const g = globalThis as IExtendedGlobal;
    return typeof g.process !== "undefined" && g.process.type === "browser" && typeof g.require === "function";
  },

  /** Check if running in Electron renderer */
  isElectronRenderer(): boolean {
    const g = globalThis as IExtendedGlobal;
    return typeof g.process !== "undefined" && g.process.type === "renderer" && typeof g.window !== "undefined";
  },

  /** Check if running in React Native */
  isReactNative(): boolean {
    const g = globalThis as IExtendedGlobal;
    return typeof g.navigator !== "undefined" && g.navigator.product === "ReactNative";
  },

  /** Get current platform type */
  getPlatformType(): PlatformType {
    if (this.isElectronMain()) return "electron-main";
    if (this.isElectronRenderer()) return "electron-renderer";
    if (this.isReactNative()) return "react-native";
    if (this.isWebWorker()) return "webworker";
    if (this.isBrowser()) return "browser";
    if (this.isNode()) return "node";
    return "browser"; // Default fallback
  },
} as const;
