import _ from 'lodash';
import { validateConfig } from '../src/config/config.schema';
import { normalizeConfig } from '../src/config/load-config';
import { SManagerConfig } from '../src/types/smanager-config';

const defaultConfig: SManagerConfig = {
  chain: {
    account: 'test',
    endPoint: 'chain',
  },
  sworker: {
    endPoint: 'sworker',
  },
  ipfs: {
    endPoint: 'ipfs',
  },
  node: {
    role: 'member',
  },
  telemetry: {
    endPoint: 'telemetry',
  },
  dataDir: 'data',
  scheduler: {
    strategy: 'default',
    minSrdRatio: 70,
    maxPendingTasks: 1,
    minFileSize: 0,
    maxFileSize: 0,
    minReplicas: 0,
    maxReplicas: 0,
  },
};

describe('config validation', () => {
  // Assert if setTimeout was called properly
  it('load good config', () => {
    expect(validateConfig(defaultConfig)).toStrictEqual(defaultConfig);
    const srdStrategey: SManagerConfig = {
      ...defaultConfig,
      scheduler: {
        strategy: 'srdFirst',
        minSrdRatio: 70,
        maxPendingTasks: 2,
        minFileSize: 0,
        maxFileSize: 0,
        minReplicas: 0,
        maxReplicas: 0,
      },
    };
    expect(validateConfig(srdStrategey).scheduler.strategy).toBe('srdFirst');
  });

  it('load custom weights', () => {
    const customWeights: SManagerConfig = {
      ...defaultConfig,
      scheduler: {
        strategy: {
          existedFilesWeight: 1,
          newFilesWeight: 1,
        },
        minSrdRatio: 70,
        maxPendingTasks: 1,
        minFileSize: 0,
        maxFileSize: 0,
        minReplicas: 0,
        maxReplicas: 0,
      },
    };
    expect(validateConfig(customWeights).scheduler.strategy).toStrictEqual({
      existedFilesWeight: 1,
      newFilesWeight: 1,
    });

    const config = _.omit(customWeights, 'scheduler.strategy');
    expect(validateConfig(config).scheduler.strategy).toBe('default');
  });

  it('fail with invalid config', () => {
    const config: SManagerConfig = {
      ...defaultConfig,
      scheduler: {
        strategy: 'test' as any, // eslint-disable-line
        minSrdRatio: 70,
        maxPendingTasks: 1,
        minFileSize: 0,
        maxFileSize: 0,
        minReplicas: 0,
        maxReplicas: 0,
      },
    };
    expect(() => validateConfig(config)).toThrow();
    const configWithoutChain = _.omit(defaultConfig, 'chain');
    expect(() => validateConfig(configWithoutChain)).toThrow();
  });

  it('normalize weights', () => {
    const config: SManagerConfig = {
      ...defaultConfig,
      scheduler: {
        strategy: {
          existedFilesWeight: 10,
          newFilesWeight: 10,
        },
        minSrdRatio: 70,
        maxPendingTasks: 2,
        minFileSize: 0,
        maxFileSize: 0,
        minReplicas: 0,
        maxReplicas: 0,
      },
    };
    expect(normalizeConfig(config).scheduler.strategy).toStrictEqual({
      existedFilesWeight: 50,
      newFilesWeight: 50,
    });
  });
});
