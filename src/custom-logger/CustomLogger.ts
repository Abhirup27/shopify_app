import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

const levelColors = {
  LOG: colors.green,
  DEBUG: colors.blue,
  WARN: colors.yellow,
  ERROR: colors.red,
  FATAL: colors.magenta,
};

export class CustomLogger implements LoggerService
{
  private readonly isLoggingEnabled: boolean;
  private readonly enabledLevels: Set<string>;
  private readonly logToFile: boolean;
  private readonly logStream: fs.WriteStream | null = null;

  constructor(private readonly configService: ConfigService) {
    const loggingConfig = this.configService.get<string>('logging') || 'false';
    this.isLoggingEnabled = loggingConfig.toLowerCase() === 'true';
    this.enabledLevels = new Set(loggingConfig.split(',').map(level => level.trim()));
    
    const logToFileConfig = this.configService.get<string>('logToFile') || 'false';
    this.logToFile = logToFileConfig.toLowerCase() === 'true';

    if (this.logToFile)
    {
      try {
        const logDir = 'logs';
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir);
        }
        const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
        this.logStream = fs.createWriteStream(logFile, { flags: 'a' });
      }
      catch (error) {
        console.error('Failed to initialize log file:', error);
      }
    }
  }

  private shouldLog(level: string): boolean
  {
    if (!level) return false;
    return this.isLoggingEnabled || this.enabledLevels.has(level.toLowerCase());
  }

  private getTimestamp(): string
  {
    return new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  private stripAnsiCodes(str: string): string {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }


  private writeToFile(message: string)
  {
    if (this.logToFile && this.logStream)
    {
      try {
        const cleanMessage = this.stripAnsiCodes(message);
        this.logStream.write(`${cleanMessage}\n`);
      }
      catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  private formatMessage(level: string, message: any, context?: string): string {
    const timestamp = this.getTimestamp();
    const pid = process.pid;
    const ctx = context || 'NestApplication';
    const levelColor = levelColors[level] || colors.reset;
    
    return `${levelColor}[ShopifyApp]${colors.reset} ${colors.magenta}${pid}${colors.reset}  - ${timestamp}     ${levelColor}${level.padEnd(6)}${colors.reset} ${levelColor}[${ctx}]${colors.reset} ${levelColor}${message}${colors.reset}`;
  }

  log(message: any, context?: string)
  {
    if (this.shouldLog('log'))
    {
      const formattedMessage = this.formatMessage('LOG', message, context);
      console.log(formattedMessage);
      this.writeToFile(formattedMessage);
    }
  }

  debug(message: any, context?: string)
  {
    if (this.shouldLog('debug'))
    {
      const formattedMessage = this.formatMessage('DEBUG', message, context);
      console.debug(formattedMessage);
      this.writeToFile(formattedMessage);
    }
  }

  warn(message: any, context?: string)
  {
    if (this.shouldLog('warn'))
    {
      const formattedMessage = this.formatMessage('WARN', message, context);
      console.warn(formattedMessage);
      this.writeToFile(formattedMessage);
    }
  }

  error(message: any, stack?: string, context?: string)
  {
    if (this.shouldLog('error'))
    {
      const formattedMessage = this.formatMessage('ERROR', message, context);
      console.error(formattedMessage);
      if (stack) {
        console.error(`${colors.red}${stack}${colors.reset}`);
        this.writeToFile(`${formattedMessage}\n${stack}`);
      } else {
        this.writeToFile(formattedMessage);
      }
    }
  }

  fatal(message: any, context?: string)
  {
    if (this.shouldLog('fatal')) {
      const formattedMessage = this.formatMessage('FATAL', message, context);
      console.error(formattedMessage);
      this.writeToFile(formattedMessage);
    }
  }

  onApplicationShutdown()
  {
    if (this.logStream)
    {
      try {
        fs.writeFileSync(
          this.logStream.path as string,
          `APP SHUTDOWN AT ${new Date().toISOString()}\n`,
          { flag: 'a' }
        );

        this.logStream.end();
      }
      catch (error) {
        console.error('Failed to close log stream:', error);
      }
    }
  }
}