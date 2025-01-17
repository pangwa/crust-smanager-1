export interface ChainConfig {
  account: string;
  endPoint: string;
}

export interface SworkerConfig {
  endPoint: string;
}

export interface IpfsConfig {
  endPoint: string;
}

export interface TelemetryConfig {
  endPoint: string;
}

type NodeRole = 'member' | 'isolation';

export interface NodeConfig {
  role: NodeRole;
}

type PullingStrategy = 'existedFilesWeight' | 'newFilesWeight';

export type StrategyWeights = { [key in PullingStrategy]: number };

type StrategyConfig = 'default' | 'srdFirst' | 'newFileFirst' | StrategyWeights;

export interface SchedulerConfig {
  strategy: StrategyConfig;
  maxPendingTasks: number;
  minSrdRatio: number; // percent
  minFileSize: number; // in MB
  maxFileSize: number; // in MB
  minReplicas: number; // min replicas for chainDb indexer
  maxReplicas: number; // max replicas limit for all indexer
}

export interface SManagerConfig {
  chain: ChainConfig;
  sworker: SworkerConfig;
  ipfs: IpfsConfig;
  node: NodeConfig;
  telemetry: TelemetryConfig;
  dataDir: string;
  scheduler: SchedulerConfig;
}

export interface NormalizedSchedulerConfig extends SchedulerConfig {
  strategy: StrategyWeights;
  maxPendingTasks: number;
}

export interface NormalizedConfig extends SManagerConfig {
  scheduler: NormalizedSchedulerConfig;
}
