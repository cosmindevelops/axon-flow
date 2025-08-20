/**
 * Node.js specific type definitions
 *
 * These types provide Node.js environment-specific interfaces
 * and abstractions for server-side runtime.
 */

/**
 * Node.js version information
 */
export interface INodeVersion {
  /** Major version number */
  readonly major: number;

  /** Minor version number */
  readonly minor: number;

  /** Patch version number */
  readonly patch: number;

  /** Full version string */
  readonly version: string;

  /** V8 engine version */
  readonly v8: string;

  /** Node.js release info */
  readonly release: INodeRelease;
}

/**
 * Node.js release information
 */
export interface INodeRelease {
  /** Release name */
  readonly name: string;

  /** LTS version name if applicable */
  readonly lts?: string;

  /** Release date */
  readonly date: string;

  /** Modules version */
  readonly modules: string;
}

/**
 * Node.js process information
 */
export interface INodeProcess {
  /** Process ID */
  readonly pid: number;

  /** Parent process ID */
  readonly ppid?: number;

  /** Platform */
  readonly platform: NodePlatform;

  /** Architecture */
  readonly arch: NodeArchitecture;

  /** Memory usage */
  readonly memory: INodeMemoryUsage;

  /** CPU usage */
  readonly cpu: INodeCPUUsage;

  /** Environment variables */
  readonly env: Record<string, string | undefined>;

  /** Command line arguments */
  readonly argv: readonly string[];

  /** Execution path */
  readonly execPath: string;

  /** Current working directory */
  readonly cwd: string;

  /** Uptime in seconds */
  readonly uptime: number;
}

/**
 * Node.js platform types
 */
export type NodePlatform = "aix" | "darwin" | "freebsd" | "linux" | "openbsd" | "sunos" | "win32";

/**
 * Node.js architecture types
 */
export type NodeArchitecture =
  | "arm"
  | "arm64"
  | "ia32"
  | "mips"
  | "mipsel"
  | "ppc"
  | "ppc64"
  | "s390"
  | "s390x"
  | "x64";

/**
 * Node.js memory usage
 */
export interface INodeMemoryUsage {
  /** Resident set size */
  readonly rss: number;

  /** Heap total */
  readonly heapTotal: number;

  /** Heap used */
  readonly heapUsed: number;

  /** External memory */
  readonly external: number;

  /** Array buffers */
  readonly arrayBuffers: number;
}

/**
 * Node.js CPU usage
 */
export interface INodeCPUUsage {
  /** User CPU time */
  readonly user: number;

  /** System CPU time */
  readonly system: number;
}

/**
 * Node.js stream types
 */
export interface INodeStream {
  /** Stream type */
  readonly type: "readable" | "writable" | "duplex" | "transform";

  /** Encoding */
  readonly encoding?: BufferEncoding;

  /** High water mark */
  readonly highWaterMark?: number;

  /** Object mode */
  readonly objectMode?: boolean;
}

/**
 * Buffer encoding types
 */
export type BufferEncoding =
  | "ascii"
  | "utf8"
  | "utf-8"
  | "utf16le"
  | "ucs2"
  | "ucs-2"
  | "base64"
  | "base64url"
  | "latin1"
  | "binary"
  | "hex";

/**
 * Node.js file system types
 */
export interface INodeFileSystem {
  /** File path */
  readonly path: string;

  /** File stats */
  readonly stats?: INodeFileStats;

  /** File descriptor */
  readonly fd?: number;

  /** File mode */
  readonly mode?: number;

  /** File flags */
  readonly flags?: NodeFileFlags;
}

/**
 * Node.js file stats
 */
export interface INodeFileStats {
  /** Is file */
  readonly isFile: boolean;

  /** Is directory */
  readonly isDirectory: boolean;

  /** Is symbolic link */
  readonly isSymbolicLink: boolean;

  /** File size in bytes */
  readonly size: number;

  /** Birth time */
  readonly birthtime: Date;

  /** Access time */
  readonly atime: Date;

  /** Modification time */
  readonly mtime: Date;

  /** Change time */
  readonly ctime: Date;

  /** File mode */
  readonly mode: number;

  /** User ID */
  readonly uid: number;

  /** Group ID */
  readonly gid: number;
}

/**
 * Node.js file flags
 */
export type NodeFileFlags = "r" | "r+" | "rs" | "rs+" | "w" | "wx" | "w+" | "wx+" | "a" | "ax" | "a+" | "ax+";

/**
 * Node.js worker thread context
 */
export interface INodeWorkerContext {
  /** Worker thread ID */
  readonly threadId: number;

  /** Is main thread */
  readonly isMainThread: boolean;

  /** Parent port available */
  readonly hasParentPort: boolean;

  /** Resource limits */
  readonly resourceLimits?: INodeResourceLimits;

  /** Worker data */
  readonly workerData?: unknown;
}

/**
 * Node.js resource limits
 */
export interface INodeResourceLimits {
  /** Max young generation size in MB */
  readonly maxYoungGenerationSizeMb?: number;

  /** Max old generation size in MB */
  readonly maxOldGenerationSizeMb?: number;

  /** Code range size in MB */
  readonly codeRangeSizeMb?: number;

  /** Stack size in MB */
  readonly stackSizeMb?: number;
}

/**
 * Node.js cluster information
 */
export interface INodeClusterInfo {
  /** Is master/primary */
  readonly isMaster: boolean;

  /** Is worker */
  readonly isWorker: boolean;

  /** Worker ID */
  readonly workerId?: number;

  /** Number of workers */
  readonly workers?: number;
}

/**
 * Node.js crypto capabilities
 */
export interface INodeCrypto {
  /** Available hash algorithms */
  readonly hashAlgorithms: readonly string[];

  /** Available cipher algorithms */
  readonly cipherAlgorithms: readonly string[];

  /** Available curves */
  readonly curves: readonly string[];

  /** FIPS mode enabled */
  readonly fips: boolean;
}

/**
 * Node.js network interface
 */
export interface INodeNetworkInterface {
  /** Interface name */
  readonly name: string;

  /** IP address */
  readonly address: string;

  /** Network mask */
  readonly netmask: string;

  /** MAC address */
  readonly mac: string;

  /** Is internal */
  readonly internal: boolean;

  /** IP family (4 or 6) */
  readonly family: 4 | 6;

  /** Scope ID (IPv6) */
  readonly scopeid?: number;
}

/**
 * Node.js module system
 */
export interface INodeModule {
  /** Module ID */
  readonly id: string;

  /** Module filename */
  readonly filename: string;

  /** Module path */
  readonly path: string;

  /** Parent module */
  readonly parent?: string;

  /** Child modules */
  readonly children: readonly string[];

  /** Is loaded */
  readonly loaded: boolean;

  /** Module exports */
  readonly exports: unknown;
}

/**
 * Node.js timer types
 */
export interface INodeTimer {
  /** Timer ID */
  readonly id: number;

  /** Timer type */
  readonly type: "timeout" | "interval" | "immediate";

  /** Delay in milliseconds */
  readonly delay?: number;

  /** Is active */
  readonly active: boolean;

  /** Has ref */
  readonly hasRef: boolean;
}
