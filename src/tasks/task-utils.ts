import { Function0, Function3 } from 'lodash';
import { Logger } from 'winston';
import { AppContext } from '../types/context';
import { SimpleTask } from '../types/tasks';
import { createChildLoggerWith } from '../utils/logger';

export type IsStopped = Function0<boolean>;

export async function makeIntervalTask(
  interval: number, // in millseconds
  name: string,
  context: AppContext,
  loggerParent: Logger,
  handlerFn: Function3<AppContext, Logger, IsStopped, Promise<void>>,
): Promise<SimpleTask> {
  if (interval <= 0) {
    throw new Error('invalid arg, interval should be greater than 0');
  }
  const logger = createChildLoggerWith({ moduleId: name }, loggerParent);
  let timer: NodeJS.Timeout;
  let stopped = false;

  const doInterval = async () => {
    if (stopped) {
      return;
    }
    try {
      await handlerFn(context, logger, () => stopped);
    } finally {
      if (!stopped) {
        timer = setTimeout(doInterval, interval);
      }
    }
  };
  return {
    name,
    start: () => {
      logger.info(`task "${name}" started`);
      timer = setTimeout(doInterval, interval);
      stopped = false;
    },
    stop: async () => {
      logger.info(`task "${name}" stopped`);
      stopped = true;
      if (timer) {
        clearTimeout(timer);
      }
      return true;
    },
  };
}
