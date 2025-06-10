import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as os from 'os';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const rename = promisify(fs.rename);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const appendFile = promisify(fs.appendFile);

/**
 * Log levels for the logger
 */
export enum LogLevel {
    /**
     * Debug level for detailed debugging information
     */
    DEBUG = 'DEBUG',
    
    /**
     * Info level for general operational messages
     */
    INFO = 'INFO',
    
    /**
     * Warning level for potentially harmful situations
     */
    WARN = 'WARN',
    
    /**
     * Error level for error events that might still allow the application to continue running
     */
    ERROR = 'ERROR'
}

export class Logger {
    private static instance: Logger;
    private logFile: string = '';
    private logStream: fs.WriteStream | null = null;
    private logLevel: LogLevel = LogLevel.INFO;
    private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
    private readonly maxBackupFiles = 5;
    private initialized: boolean = false;
    private pendingLogs: string[] = [];

    /**
     * Initializes a new instance of the Logger class.
     * If a context is provided, the logger is immediately initialized.
     * @param context - Optional VS Code extension context for storing logs.
     */

    private constructor(private context?: vscode.ExtensionContext) {
        if (context) {
            this.initialize();
        }
    }

    /**
     * Gets the single instance of the Logger class.
     * If a context is provided and the logger has not been initialized, it will be initialized.
     * @param context - Optional VS Code extension context for storing logs.
     * @returns The single instance of the Logger class.
     */
    public static getInstance(context?: vscode.ExtensionContext): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(context);
        } else if (context && !Logger.instance.initialized) {
            Logger.instance.context = context;
            Logger.instance.initialize();
        }
        return Logger.instance;
    }

/**
 * Initializes the logger by setting up the log directory and log file stream.
 * Ensures that any pending logs are processed once the logger is initialized.
 * Throws an error if the VS Code extension context is not provided.
 * This method is intended to be called when the logger needs to be set up
 * with a valid context for storing logs.
 * Handles errors during initialization and logs them to the console.
 * @private
 */

    private initialize(): void {
        try {
            if (!this.context) {
                throw new Error('Context not provided for logger initialization');
            }

            const logDir = path.join(this.context.globalStorageUri.fsPath, 'logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            this.logFile = path.join(logDir, 'pandoc-wysiwyg.log');
            this.initializeLogStream();
            this.initialized = true;

            // Process any pending logs
            if (this.pendingLogs.length > 0) {
                this.pendingLogs.forEach(log => {
                    this.writeToLogDirectly(log);
                });
                this.pendingLogs = [];
            }
        } catch (error) {
            console.error('Failed to initialize logger:', error);
        }
    }

    public setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    private getLogLevelNumber(level: LogLevel): number {
        const levels = {
            [LogLevel.DEBUG]: 0,
            [LogLevel.INFO]: 1,
            [LogLevel.WARN]: 2,
            [LogLevel.ERROR]: 3
        };
        return levels[level] ?? 1;
    }

    private shouldLog(level: LogLevel): boolean {
        return this.getLogLevelNumber(level) >= this.getLogLevelNumber(this.logLevel);
    }

    /**
     * Initializes the log file stream
     * @private
     */
    private async initializeLogStream(): Promise<void> {
        try {
            // Close existing stream if it exists
            if (this.logStream) {
                await new Promise<void>((resolve) => {
                    if (this.logStream) {
                        this.logStream.end(() => resolve());
                    } else {
                        resolve();
                    }
                });
            }

            // Check file size and rotate if needed
            try {
                const stats = await stat(this.logFile).catch(() => null);
                if (stats && stats.size > this.maxFileSize) {
                    await this.rotateLogs();
                }
            } catch (error) {
                // File might not exist yet, which is fine
            }

            // Ensure directory exists
            await mkdir(path.dirname(this.logFile), { recursive: true });

            // Create a new write stream
            this.logStream = fs.createWriteStream(this.logFile, {
                flags: 'a',
                encoding: 'utf8',
                mode: 0o666 // rw-rw-rw- permissions
            });

            // Handle stream errors
            this.logStream.on('error', (err) => {
                console.error('Log stream error:', err);
                this.logStream = null;
            });

            // Write initialization message
            this.writeToLogDirectly(`\n${'-'.repeat(80)}\n` +
                `Log initialized at ${new Date().toISOString()}\n` +
                `Process ID: ${process.pid}\n` +
                `Node.js: ${process.version}\n` +
                `VSCode: ${vscode.version}\n` +
                `Platform: ${process.platform} ${process.arch}\n` +
                `Log level: ${this.logLevel}\n` +
                `Log file: ${this.logFile}\n` +
                `${'-'.repeat(80)}\n`);
        } catch (error) {
            console.error('Failed to initialize log stream:', error);
        }
    }

    /**
     * Rotates log files to prevent them from growing too large
     * @private
     */
    private async rotateLogs(): Promise<void> {
        try {
            // Create backup files in reverse order to avoid overwriting
            for (let i = this.maxBackupFiles - 1; i >= 0; i--) {
                const source = i === 0 ? this.logFile : `${this.logFile}.${i}`;
                const target = `${this.logFile}.${i + 1}`;

                try {
                    if (fs.existsSync(source)) {
                        if (fs.existsSync(target)) {
                            await unlink(target);
                        }
                        await rename(source, target);
                    }
                } catch (err) {
                    console.error(`Error rotating log file ${source}:`, err);
                    // Continue with next file even if one fails
                }
            }

            // Create a new empty log file
            await writeFile(this.logFile, '', 'utf8');
        } catch (error) {
            console.error('Log rotation failed:', error);
            throw error; // Re-throw to allow callers to handle the error
        }
    }

    /**
     * Writes a log message with the specified level
     * @param level - The log level
     * @param message - The message to log
     * @param args - Additional data to include in the log
     * @private
     */
    private writeToLog(level: LogLevel, message: string, ...args: any[]): void {
        if (!this.shouldLog(level)) {return;}

        const timestamp = new Date().toISOString();
        let formattedMessage = `[${timestamp}] [${level}] ${message}`;
        
        // Format arguments if present
        if (args.length > 0) {
            try {
                const formattedArgs = args.map(arg => {
                    if (arg instanceof Error) {
                        return {
                            message: arg.message,
                            name: arg.name,
                            stack: arg.stack,
                            ...(arg as any).details
                        };
                    }
                    return arg;
                });
                
                // Only add newline if we have complex objects to format
                const needsNewline = formattedArgs.some(arg => 
                    typeof arg === 'object' && arg !== null && Object.keys(arg).length > 0
                );
                
                if (needsNewline) {
                    formattedMessage += '\n';
                }
                
                formattedMessage += JSON.stringify(
                    formattedArgs.length === 1 ? formattedArgs[0] : formattedArgs,
                    this.sanitizeForJson,
                    2
                );
            } catch (error) {
                formattedMessage += ` [Error stringifying args: ${error}]`;
            }
        }
        
        formattedMessage += os.EOL;

        if (this.initialized && this.logStream) {
            this.writeToLogDirectly(formattedMessage);
        } else {
            // Store logs until logger is initialized
            this.pendingLogs.push(formattedMessage);
            // Fallback to console with appropriate log level
            const consoleMethod = (console[level.toLowerCase() as keyof Console] as Function) || console.log;
            consoleMethod(`[PandocWYSIWYG] ${formattedMessage.trim()}`);
            
            // Keep pending logs from growing too large
            if (this.pendingLogs.length > 100) {
                this.pendingLogs.shift(); // Remove oldest log
            }
        }
    }

    /**
     * Writes directly to the log stream
     * @param logMessage - The message to write
     * @private
     */
    private async writeToLogDirectly(logMessage: string): Promise<void> {
        if (!this.logStream) {
            try {
                await this.initializeLogStream();
                if (!this.logStream) {
                    console.error('Log stream not available after initialization');
                    return;
                }
            } catch (error) {
                console.error('Failed to initialize log stream:', error);
                return;
            }
        }

        try {
            if (this.logStream) {
                const canWrite = this.logStream.write(logMessage, (err) => {
                    if (err) {
                        console.error('Error writing to log file:', err);
                        // Attempt to recover by reinitializing the stream
                        this.logStream = null;
                    }
                });

                // Handle backpressure
                if (!canWrite) {
                    await new Promise<void>((resolve) => {
                        if (this.logStream) {
                            this.logStream.once('drain', resolve);
                        } else {
                            resolve();
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Failed to write to log:', error);
            this.logStream = null; // Force reinitialization on next write attempt
        }
    }

    // Helper to handle circular references in JSON.stringify
    private sanitizeForJson(key: string, value: any): any {
        if (value instanceof Error) {
            const error: any = {};
            Object.getOwnPropertyNames(value).forEach(k => {
                error[k] = (value as any)[k];
            });
            return error;
        }
        return value;
    }

    public debug(message: string, ...args: any[]): void {
        this.writeToLog(LogLevel.DEBUG, message, ...args);
    }

    public info(message: string, ...args: any[]): void {
        this.writeToLog(LogLevel.INFO, message, ...args);
    }

    public warn(message: string, ...args: any[]): void {
        this.writeToLog(LogLevel.WARN, message, ...args);
    }

    public error(message: string, ...args: any[]): void {
        this.writeToLog(LogLevel.ERROR, message, ...args);
    }

    /**
     * Logs an error with additional context
     * @param error - The error to log
     * @param context - Additional context about where the error occurred
     * @param extra - Any extra data to include in the log
     */
    public logError(error: Error, context: string = '', extra: Record<string, any> = {}): void {
        const errorInfo: Record<string, any> = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...(error as any).details,
            ...extra
        };
        
        // Remove undefined values
        Object.keys(errorInfo).forEach(key => 
            errorInfo[key] === undefined && delete errorInfo[key]
        );
        
        this.error(
            `Error${context ? ` in ${context}` : ''}: ${error.message}`,
            errorInfo
        );
    }

    /**
     * Disposes the logger, ensuring all pending writes are completed
     * @returns A promise that resolves when the logger is fully disposed
     */
    public async dispose(): Promise<void> {
        try {
            if (this.logStream) {
                await new Promise<void>((resolve) => {
                    if (this.logStream) {
                        this.logStream.end(() => resolve());
                    } else {
                        resolve();
                    }
                });
                this.logStream = null;
            }
            
            // Process any remaining pending logs
            if (this.pendingLogs.length > 0) {
                try {
                    await appendFile(
                        this.logFile, 
                        this.pendingLogs.join(''),
                        'utf8'
                    );
                    this.pendingLogs = [];
                } catch (error) {
                    console.error('Failed to write pending logs during dispose:', error);
                }
            }
        } catch (error) {
            console.error('Error during logger disposal:', error);
            throw error;
        }
    }
}
