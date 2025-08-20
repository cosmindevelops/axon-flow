/**
 * Browser environment type definitions
 *
 * These types provide browser-specific interfaces and
 * abstractions for client-side runtime.
 */

/**
 * Browser information
 */
export interface IBrowserInfo {
  /** Browser name */
  readonly name: BrowserName;

  /** Browser version */
  readonly version: string;

  /** User agent string */
  readonly userAgent: string;

  /** Platform */
  readonly platform: string;

  /** Language */
  readonly language: string;

  /** Languages */
  readonly languages: readonly string[];

  /** Online status */
  readonly online: boolean;

  /** Cookie enabled */
  readonly cookieEnabled: boolean;

  /** Do not track */
  readonly doNotTrack?: boolean;

  /** Vendor */
  readonly vendor?: string;
}

/**
 * Browser names
 */
export type BrowserName = "chrome" | "firefox" | "safari" | "edge" | "opera" | "ie" | "other";

/**
 * Browser window information
 */
export interface IBrowserWindow {
  /** Window width */
  readonly innerWidth: number;

  /** Window height */
  readonly innerHeight: number;

  /** Outer width */
  readonly outerWidth: number;

  /** Outer height */
  readonly outerHeight: number;

  /** Screen X position */
  readonly screenX: number;

  /** Screen Y position */
  readonly screenY: number;

  /** Scroll X position */
  readonly scrollX: number;

  /** Scroll Y position */
  readonly scrollY: number;

  /** Device pixel ratio */
  readonly devicePixelRatio: number;
}

/**
 * Browser screen information
 */
export interface IBrowserScreen {
  /** Screen width */
  readonly width: number;

  /** Screen height */
  readonly height: number;

  /** Available width */
  readonly availWidth: number;

  /** Available height */
  readonly availHeight: number;

  /** Color depth */
  readonly colorDepth: number;

  /** Pixel depth */
  readonly pixelDepth: number;

  /** Orientation */
  readonly orientation?: IScreenOrientation;
}

/**
 * Screen orientation
 */
export interface IScreenOrientation {
  /** Orientation type */
  readonly type: OrientationType;

  /** Orientation angle */
  readonly angle: number;
}

/**
 * Orientation types
 */
export type OrientationType = "portrait-primary" | "portrait-secondary" | "landscape-primary" | "landscape-secondary";

/**
 * Browser storage interface
 */
export interface IBrowserStorage {
  /** Storage type */
  readonly type: "localStorage" | "sessionStorage" | "indexedDB" | "webSQL" | "cookies";

  /** Available */
  readonly available: boolean;

  /** Persistent */
  readonly persistent?: boolean;

  /** Quota in bytes */
  readonly quota?: number;

  /** Usage in bytes */
  readonly usage?: number;
}

/**
 * Browser location
 */
export interface IBrowserLocation {
  /** Protocol */
  readonly protocol: string;

  /** Host */
  readonly host: string;

  /** Hostname */
  readonly hostname: string;

  /** Port */
  readonly port: string;

  /** Pathname */
  readonly pathname: string;

  /** Search */
  readonly search: string;

  /** Hash */
  readonly hash: string;

  /** Origin */
  readonly origin: string;

  /** Full href */
  readonly href: string;
}

/**
 * Browser document information
 */
export interface IBrowserDocument {
  /** Document title */
  readonly title: string;

  /** Document URL */
  readonly URL: string;

  /** Document domain */
  readonly domain: string;

  /** Referrer */
  readonly referrer: string;

  /** Character set */
  readonly characterSet: string;

  /** Content type */
  readonly contentType: string;

  /** Ready state */
  readonly readyState: DocumentReadyState;

  /** Visibility state */
  readonly visibilityState: DocumentVisibilityState;

  /** Hidden */
  readonly hidden: boolean;
}

/**
 * Document ready states
 */
export type DocumentReadyState = "loading" | "interactive" | "complete";

/**
 * Document visibility states
 */
export type DocumentVisibilityState = "visible" | "hidden" | "prerender";

/**
 * Browser performance information
 */
export interface IBrowserPerformance {
  /** Navigation timing */
  readonly navigation: INavigationTiming;

  /** Resource timings */
  readonly resources: readonly IResourceTiming[];

  /** Paint timings */
  readonly paint: readonly IPaintTiming[];

  /** Memory info */
  readonly memory?: IBrowserMemoryInfo;
}

/**
 * Navigation timing
 */
export interface INavigationTiming {
  /** Navigation start */
  readonly navigationStart: number;

  /** DOM content loaded */
  readonly domContentLoaded: number;

  /** Load event end */
  readonly loadEventEnd: number;

  /** Time to first byte */
  readonly responseStart: number;

  /** DOM interactive */
  readonly domInteractive: number;

  /** Navigation type */
  readonly type: NavigationType;
}

/**
 * Navigation types
 */
export type NavigationType = "navigate" | "reload" | "back_forward" | "prerender";

/**
 * Resource timing
 */
export interface IResourceTiming {
  /** Resource name */
  readonly name: string;

  /** Entry type */
  readonly entryType: string;

  /** Start time */
  readonly startTime: number;

  /** Duration */
  readonly duration: number;

  /** Transfer size */
  readonly transferSize?: number;

  /** Encoded body size */
  readonly encodedBodySize?: number;

  /** Decoded body size */
  readonly decodedBodySize?: number;
}

/**
 * Paint timing
 */
export interface IPaintTiming {
  /** Paint name */
  readonly name: "first-paint" | "first-contentful-paint";

  /** Start time */
  readonly startTime: number;
}

/**
 * Browser memory information
 */
export interface IBrowserMemoryInfo {
  /** JS heap size limit */
  readonly jsHeapSizeLimit: number;

  /** Total JS heap size */
  readonly totalJSHeapSize: number;

  /** Used JS heap size */
  readonly usedJSHeapSize: number;
}

/**
 * Browser media capabilities
 */
export interface IMediaCapabilities {
  /** Audio support */
  readonly audio: IMediaSupport;

  /** Video support */
  readonly video: IMediaSupport;

  /** Screen capture */
  readonly screenCapture: boolean;

  /** Media recorder */
  readonly mediaRecorder: boolean;

  /** WebRTC */
  readonly webRTC: boolean;
}

/**
 * Media support
 */
export interface IMediaSupport {
  /** Supported codecs */
  readonly codecs: readonly string[];

  /** Supported formats */
  readonly formats: readonly string[];

  /** Max resolution */
  readonly maxResolution?: IResolution;

  /** Max frame rate */
  readonly maxFrameRate?: number;
}

/**
 * Resolution
 */
export interface IResolution {
  /** Width */
  readonly width: number;

  /** Height */
  readonly height: number;
}

/**
 * Browser feature detection
 */
export interface IBrowserFeatures {
  /** Service worker */
  readonly serviceWorker: boolean;

  /** Web worker */
  readonly webWorker: boolean;

  /** WebAssembly */
  readonly webAssembly: boolean;

  /** WebGL */
  readonly webGL: boolean;

  /** WebGL2 */
  readonly webGL2: boolean;

  /** WebGPU */
  readonly webGPU: boolean;

  /** Fetch API */
  readonly fetch: boolean;

  /** Async/await */
  readonly asyncAwait: boolean;

  /** Promises */
  readonly promises: boolean;

  /** Modules */
  readonly modules: boolean;

  /** CSS grid */
  readonly cssGrid: boolean;

  /** CSS flexbox */
  readonly cssFlexbox: boolean;

  /** CSS custom properties */
  readonly cssCustomProperties: boolean;
}

/**
 * Browser connection information
 */
export interface IBrowserConnection {
  /** Connection type */
  readonly type?: ConnectionType;

  /** Effective type */
  readonly effectiveType?: EffectiveConnectionType;

  /** Downlink speed (Mbps) */
  readonly downlink?: number;

  /** Round trip time (ms) */
  readonly rtt?: number;

  /** Save data mode */
  readonly saveData?: boolean;
}

/**
 * Connection types
 */
export type ConnectionType = "bluetooth" | "cellular" | "ethernet" | "none" | "wifi" | "wimax" | "other" | "unknown";

/**
 * Effective connection types
 */
export type EffectiveConnectionType = "slow-2g" | "2g" | "3g" | "4g";

/**
 * Browser permission
 */
export interface IBrowserPermission {
  /** Permission name */
  readonly name: PermissionName;

  /** Permission state */
  readonly state: PermissionState;
}

/**
 * Permission names
 */
export type PermissionName =
  | "camera"
  | "microphone"
  | "geolocation"
  | "notifications"
  | "persistent-storage"
  | "push"
  | "screen-wake-lock"
  | "xr-spatial-tracking";

/**
 * Permission states
 */
export type PermissionState = "granted" | "denied" | "prompt";

/**
 * Browser input device
 */
export interface IBrowserInputDevice {
  /** Device type */
  readonly type: InputDeviceType;

  /** Device ID */
  readonly id?: string;

  /** Device label */
  readonly label?: string;

  /** Is primary */
  readonly primary?: boolean;
}

/**
 * Input device types
 */
export type InputDeviceType = "mouse" | "keyboard" | "touch" | "pen" | "gamepad";
