type Level = 'debug' | 'info' | 'warn' | 'error';

function format(level: Level, message: string, extra?: unknown): string {
  const time = new Date().toISOString();
  const head = `[${time}] [${level.toUpperCase()}] ${message}`;
  return extra === undefined ? head : `${head} ${JSON.stringify(extra)}`;
}

export const logger = {
  debug: (message: string, extra?: unknown) => console.debug(format('debug', message, extra)),
  info: (message: string, extra?: unknown) => console.info(format('info', message, extra)),
  warn: (message: string, extra?: unknown) => console.warn(format('warn', message, extra)),
  error: (message: string, extra?: unknown) => console.error(format('error', message, extra)),
};