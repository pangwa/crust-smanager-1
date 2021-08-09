import axios from 'axios';
import _ from 'lodash';
import { Logger } from 'winston';
import { AppContext } from '../types/context';
import { PinStatus } from '../types/database';
import { NormalizedConfig } from '../types/smanager-config';
import { WorkloadInfo } from '../types/sworker';
import { SimpleTask } from '../types/tasks';
import {
  PinStats,
  QueueInfo,
  SManagerInfo,
  TelemetryData,
} from '../types/telemetry';
import { getTimestamp, toQuotedList } from '../utils';
import { Dayjs } from '../utils/datetime';
import { PendingStatus } from './pull-utils';
import { IsStopped, makeIntervalTask } from './task-utils';

const ReportSlotDuration = Dayjs.duration({
  hours: 24,
}).asSeconds();

async function handleReport(
  context: AppContext,
  logger: Logger,
  _isStopped: IsStopped,
) {
  const telemetryUrl = context.config.telemetry.endPoint;
  if (_.isEmpty(telemetryUrl)) {
    logger.warn('telemetry endpoint not configured, skip report');
    return;
  }
  const stats = await collectStats(context);
  logger.info('reporting stats to telemtry: %o', stats);
  const resp = await axios.post(telemetryUrl, stats, {
    timeout: 10 * 1000,
  });
  logger.info('telemetry response: %s', JSON.stringify(resp.data));
}

async function collectStats(context: AppContext): Promise<TelemetryData> {
  const { api, config, database, sworkerApi } = context;
  const account = api.getChainAccount();
  const smangerInfo = collectSManagerInfo(config, context);

  const timeStart = getTimestamp() - ReportSlotDuration;
  const queueStats = await collectQueueInfo(database);
  const pinStats = await getPinStats(database, timeStart);

  const { deletedCount } = await database.get(
    `select count(*) as deletedCount from cleanup_record
      where status = "done" and last_updated > ? `,
    [timeStart],
  );
  const workload: WorkloadInfo = await sworkerApi.workload();
  // {
  //   srd: {
  //     srd_complete: 0,
  //     disk_available: 0,
  //     sys_disk_available: 0,
  //   },
  // };

  return {
    chainAccount: account,
    smangerInfo,
    pinStats,
    srd: {
      workload: workload.srd,
    },
    queueStats,
    cleanupStats: {
      deletedCount,
    },
  };
}

async function collectQueueInfo(database): Promise<QueueInfo> {
  const { pendingCount } = await database.get(
    `select count(*) as pendingCount from file_record
      where status in (${toQuotedList(PendingStatus)}) `,
  );
  const { pendingSize } = await database.get(
    `select sum(size) as pendingSize from file_record
      where status in (${toQuotedList(PendingStatus)}) `,
  );

  return {
    pendingCount,
    pendingSizeTotal: pendingSize || 0,
  };
}

function collectSManagerInfo(
  config: NormalizedConfig,
  context: AppContext,
): SManagerInfo {
  const schedulerConfig = config.scheduler;
  const version = process.env.npm_package_version || 'unknown';
  const uptime = Dayjs.duration(Dayjs().diff(context.startTime)).asSeconds();
  return {
    version,
    uptime,
    schedulerConfig,
  };
}

async function getPinStats(database, timeStart: number): Promise<PinStats> {
  const getPinRecordCountByStatus = async (status: PinStatus) => {
    return database.get(
      `select count(*) as count from pin_record where status = ? and last_updated > ?`,
      [status, timeStart],
    );
  };
  const { count: sealedCount } = await getPinRecordCountByStatus('sealed');
  const { count: failedCount } = await getPinRecordCountByStatus('failed');
  const { count: sealingCount } = await getPinRecordCountByStatus('sealing');
  const { sizeTotal } = await database.get(
    `select sum(size) as sizeTotal from pin_record
      where status = ? and last_updated > ?`,
    ['sealed', timeStart],
  );
  return {
    sealingCount,
    sealedCount,
    failedCount,
    sealedSize: sizeTotal || 0,
  };
}

export async function createTelemetryReportTask(
  context: AppContext,
  loggerParent: Logger,
): Promise<SimpleTask> {
  const reportInterval = Dayjs.duration({
    hours: 1,
  }).asMilliseconds();
  return makeIntervalTask(
    30 * 1000,
    reportInterval,
    'telemetry-report',
    context,
    loggerParent,
    handleReport,
  );
}