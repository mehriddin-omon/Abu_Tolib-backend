import * as winston from 'winston';
import 'winston-daily-rotate-file';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
      ({ timestamp, level, message }) =>
        `[${timestamp}] ${level.toUpperCase()}: ${message}`,
    ),
  ),
  transports: [
    new winston.transports.Console(),
    // new winston.transports.File({
    //     filename: 'application.log',
    //     level: 'info',
    // }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      // zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'warn',
    }),
  ],
});
