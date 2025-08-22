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
 * Node.js information
 */
export interface INodeInfo {
  /** Node.js version */
  readonly version: string;

  /** Platform */
  readonly platform: string;

  /** Architecture */
  readonly arch: string;

  /** Release information */
  readonly release: {
    readonly name: string;
    readonly lts: string | boolean;
    readonly sourceUrl: string;
    readonly headersUrl: string;
  };

  /** Node.js features */
  readonly features: {
    readonly inspector: boolean;
    readonly debug: boolean;
    readonly uv: boolean;
    readonly ipv6: boolean;
    readonly tls_alpn: boolean;
    readonly tls_sni: boolean;
    readonly tls_ocsp: boolean;
    readonly tls: boolean;
  };
}

/**
 * Process information
 */
export interface IProcessInfo {
  /** Process ID */
  readonly pid: number;

  /** Parent process ID */
  readonly ppid: number;

  /** Platform */
  readonly platform: string;

  /** Architecture */
  readonly arch: string;

  /** Node.js version */
  readonly version: string;

  /** Versions */
  readonly versions: Record<string, string>;

  /** Process title */
  readonly title: string;

  /** Command line arguments */
  readonly argv: readonly string[];

  /** Executable path */
  readonly execPath: string;

  /** Execution arguments */
  readonly execArgv: readonly string[];

  /** Environment variables */
  readonly env: Record<string, string | undefined>;

  /** Current working directory */
  readonly cwd: string;

  /** Process uptime */
  readonly uptime: number;

  /** Memory usage */
  readonly memoryUsage: {
    readonly rss: number;
    readonly heapTotal: number;
    readonly heapUsed: number;
    readonly external: number;
    readonly arrayBuffers: number;
  };

  /** CPU usage */
  readonly cpuUsage: {
    readonly user: number;
    readonly system: number;
  };
}

/**
 * File system information
 */
export interface IFileSystemInfo {
  /** Home directory */
  readonly homedir: string;

  /** Temporary directory */
  readonly tmpdir: string;

  /** Path separator */
  readonly separator: string;

  /** Path delimiter */
  readonly delimiter: string;

  /** Null device */
  readonly devNull: string;

  /** File system constants */
  readonly constants: {
    readonly F_OK: number;
    readonly R_OK: number;
    readonly W_OK: number;
    readonly X_OK: number;
  };
}

/**
 * Network information
 */
export interface INetworkInfo {
  /** Hostname */
  readonly hostname: string;

  /** Network interfaces */
  readonly networkInterfaces: Record<
    string,
    {
      readonly address: string;
      readonly netmask: string;
      readonly family: "IPv4" | "IPv6";
      readonly mac: string;
      readonly internal: boolean;
      readonly cidr: string | null;
    }[]
  >;

  /** Endianness */
  readonly endianness: "BE" | "LE";
}

/**
 * Operating system information
 */
export interface IOperatingSystemInfo {
  /** OS type */
  readonly type: string;

  /** Platform */
  readonly platform: string;

  /** Architecture */
  readonly arch: string;

  /** OS release */
  readonly release: string;

  /** OS version */
  readonly version: string;

  /** Hostname */
  readonly hostname: string;

  /** System uptime */
  readonly uptime: number;

  /** Load average */
  readonly loadavg: readonly number[];

  /** Total memory */
  readonly totalmem: number;

  /** Free memory */
  readonly freemem: number;

  /** CPUs */
  readonly cpus: readonly {
    readonly model: string;
    readonly speed: number;
    readonly times: {
      readonly user: number;
      readonly nice: number;
      readonly sys: number;
      readonly idle: number;
      readonly irq: number;
    };
  }[];

  /** OS constants */
  readonly constants: {
    readonly signals: Record<string, number>;
    readonly errno: Record<string, number>;
    readonly priority: Record<string, number>;
  };
}

/**
 * Module information
 */
export interface IModuleInfo {
  /** Module ID */
  readonly id: string;

  /** Module filename */
  readonly filename: string;

  /** Is loaded */
  readonly loaded: boolean;

  /** Parent module */
  readonly parent: string | null;

  /** Child modules */
  readonly children: readonly string[];

  /** Module paths */
  readonly paths: readonly string[];

  /** Module exports */
  readonly exports: Record<string, unknown>;
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
