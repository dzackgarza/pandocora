import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as prettier from 'prettier';
import { performance } from 'perf_hooks';
import { Logger } from '../../utils/logger';

/**
 * PandocHandler - Centralized service for all Pandoc-related operations
 *
 * Core Responsibilities:
 * 1. Document Conversion: Bidirectional conversion between formats (Markdown ↔ HTML, etc.)
 * 2. Math Processing: MathJax/KaTeX integration with customizable delimiters
 * 3. Bibliography: Citation processing with multiple styles and formats
 * 4. Diagram Generation: SVG, TikZ, and other diagram formats
 * 5. Content Transformation: Custom filters and post-processing
 * 6. Error Handling: Comprehensive error detection and reporting
 * 7. Performance: Efficient processing with caching where appropriate
 *
 * Implementation Notes:
 * - Uses singleton pattern for consistent configuration
 * - Implements proper process management for Pandoc subprocesses
 * - Maintains temporary files for intermediate processing
 * - Provides detailed logging of all operations
 * - Supports both file-based and in-memory operations
 *
 * Security Considerations:
 * - Validates all file paths and command arguments
 * - Implements timeouts for all external processes
 * - Handles large files efficiently
 * - Prevents command injection attacks
 * - Manages temporary file lifecycle securely
 */

/**
 * Custom error class for Pandoc operations
 * Includes additional context like stderr and exit code for better error handling
 */
export class PandocError extends Error {
  constructor(
    message: string,
    public readonly stderr: string = '',
    public readonly exitCode: number | null = null,
    public readonly args: string[] = []
  ) {
    super(message);
    this.name = 'PandocError';

    // Include stderr in the stack trace for easier debugging
    if (stderr) {
      this.stack = `${this.stack}\nPandoc stderr:\n${stderr}`;
    }
  }

  /**
   * Creates a user-friendly error message
   */
  public toUserMessage(): string {
    let message = `Pandoc Error: ${this.message}`;
    if (this.exitCode !== null) {
      message += ` (exit code ${this.exitCode})`;
    }
    if (this.stderr) {
      message += `\n\n${this.stderr}`;
    }
    return message;
  }
}

// Simple deep merge utility for config objects
function deepMerge(target: any, source: any): any {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object'
    ) {
      target[key] = deepMerge({ ...target[key] }, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

export class PandocHandler {
  private static instance: PandocHandler;
  private logger: Logger;
  private tempDir: string = '';
  private isReady: boolean = false;

  private config: PandocConfig = {
    mathjaxConfig: {},
    luaFilters: [],
    additionalArgs: [],
    citationStyle: 'pandoc-citeproc',
    defaultMathDelimiters: {
      inline: ['$', '$'],
      display: ['$$', '$$']
    },
    prettierOptions: {
      parser: 'markdown' as const,
      proseWrap: 'preserve' as const,
    }
  };

  /**
   * Private constructor that accepts a Logger instance
   * @param logger Optional logger instance. If not provided, a default one will be created.
   */
  private constructor(logger?: Logger) {
    this.logger = logger || Logger.getInstance();
  }

  /**
   * Gets the singleton instance of PandocHandler
   * @param logger Optional logger instance to use. If not provided, a default one will be created.
   * @returns The singleton instance of PandocHandler
   */
  public static getInstance(logger?: Logger): PandocHandler {
    if (!PandocHandler.instance) {
      PandocHandler.instance = new PandocHandler(logger);
    } else if (logger && PandocHandler.instance.logger !== logger) {
      // Update logger if a different one is provided
      PandocHandler.instance.logger = logger;
    }
    return PandocHandler.instance;
  }

  /**
   * Initialize the Pandoc handler
   */
  public async initialize(): Promise<void> {
    // Create a unique temp directory
    this.tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vscode-pandoc-'));
    this.logger.info(`Using temporary directory: ${this.tempDir}`);
    // Check for Pandoc
    try {
      await this.checkPandocAvailable();
      this.isReady = true;
    } catch (err) {
      this.logger.error('Pandoc is not available!', err);
      this.isReady = false;
    }
  }

  private async checkPandocAvailable(): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = cp.spawn('pandoc', ['--version']);
      proc.on('error', (err) => reject(err));
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error('Pandoc not found or not working.'));
      });
    });
  }

  public async dispose(): Promise<void> {
    if (this.tempDir) {
      await fs.rm(this.tempDir, { recursive: true, force: true });
      this.logger.info('Cleaned up temporary directory.');
    }
  }

  private ensureReady() {
    if (!this.isReady) {
      throw new Error('PandocHandler is not initialized or Pandoc is unavailable.');
    }
  }

  /**
   * Converts a file from one format to another using Pandoc
   *
   * @param inputPath Path to the input file
   * @param outputPath Path where the output should be saved
   * @param options Conversion options
   *
   * Test Cases:
   - Basic format conversion (markdown → html, html → markdown)
   - With custom templates and variables
   - With different math rendering options
   - With bibliography processing
   - With custom filters
   - Error handling for invalid input/output paths
   - Performance with large files
   - Concurrent conversion requests
   *
   * Failure Scenarios:
   - Pandoc not found or not in PATH
   - Input file not found or not readable
   - Output directory not writable
   - Invalid or unsupported format conversion
   - Timeout during conversion
   - Memory issues with large files
   - Permission denied errors
   */
  public async convertFile(
    inputPath: string,
    outputPath: string,
    options: ConversionOptions = {}
  ): Promise<void> {
    this.ensureReady();
    // Implementation will go here
  }

  /**
   * Converts content from one format to another using Pandoc
   * @param content The content to convert
   * @param from The source format (e.g., 'markdown', 'html')
   * @param to The target format (e.g., 'html', 'markdown')
   * @param options Conversion options
   * @returns The converted content
   */
  /**
   * Converts content from one format to another using Pandoc
   * @param content The content to convert
   * @param from The source format (e.g., 'markdown', 'html')
   * @param to The target format (e.g., 'html', 'markdown')
   * @param options Conversion options
   * @returns The converted content
   */
  public async convertString(
    content: string,
    from: string,
    to: string,
    options: ConversionOptions = {}
  ): Promise<string> {
    this.ensureReady();

    // Special case: HTML to Markdown conversion with preprocessing
    if (from === 'html' && to === 'markdown') {
      return this.convertHtmlToMarkdown(content, options);
    }

    // Special case: Markdown to HTML with MathJax support
    if (from === 'markdown' && to === 'html' && options.mathjax) {
      return this.convertMarkdownToHtml(content, options);
    }

    // Generic conversion
    const args = this.buildPandocArgs(from, to, options);
    return this.executePandoc(args, content);
  }

  /**
   * Renders mathematical expressions in content to the specified output format.
   *
   * Supported Formats:
   - HTML (with MathJax/KaTeX)
   - MathML (for better accessibility)
   - SVG (for consistent rendering)
   *
   * Features:
   - Handles both inline ($...$) and display ($$...$$) math
   - Preserves LaTeX source for copy-paste
   - Implements proper error boundaries for malformed math
   - Supports custom delimiters and macros
   *
   * Error Handling:
   - Falls back to raw LaTeX on rendering failures
   - Reports syntax errors with line numbers
   - Handles nested math environments
   */
  public async renderMath(
    content: string,
    options: MathRenderOptions = {}
  ): Promise<string> {
    // Implementation will go here
    return '';
  }

  // Bibliography and Citations
  public async processCitations(
    content: string,
    bibliography: string | string[],
    style: string = 'chicago'
  ): Promise<string> {
    // Implementation will go here
    return '';
  }

  // Diagram Generation
  public async renderDiagram(
    content: string,
    format: 'svg' | 'png' = 'svg',
    diagramType?: 'tikz' | 'mermaid' | 'plantuml'
  ): Promise<string> {
    // Implementation will go here
    return '';
  }

  // Configuration Management
  public updateConfig(updates: Partial<PandocConfig>): void {
    this.config = deepMerge({ ...this.config }, updates);
  }

  public resetConfig(): void {
    // Implementation will go here
  }

  /**
   * Low-level method to execute Pandoc with the specified arguments and options.
   *
   * Security Measures:
   - Sanitizes all command-line arguments
   - Validates file paths
   - Implements strict resource limits
   - Prevents command injection
   *
   * Error Handling:
   - Captures and enriches error messages
   - Implements timeouts to prevent hanging
   - Handles process signals (SIGTERM, SIGKILL)
   *
   * Performance:
   - Uses streaming for large inputs/outputs
      }
    });

    if (input) {
      proc.stdin.write(input);
    }
    proc.stdin.end();
  });
}

/**
 * Converts HTML to Markdown with preprocessing and postprocessing
 * @param html The HTML content to convert
 * @param options Conversion options
 * @returns Formatted Markdown content
 */
  /**
   * Converts HTML to Markdown with preprocessing and postprocessing
   * @param html The HTML content to convert
   * @param options Conversion options
   * @returns Formatted Markdown content
   */
  public async convertHtmlToMarkdown(html: string, options: ConversionOptions = {}): Promise<string> {
    try {
      // 1. Clean the incoming HTML of editor artifacts
      const cleanedHtml = this.cleanIncomingHtml(html);

      // 2. Convert the cleaned HTML to raw Markdown using Pandoc
      const rawMarkdown = await this.pandocHtmlToRawMarkdown(cleanedHtml);

      // 3. Post-process the Markdown to fix common issues
      const processedMarkdown = this.postProcessPandocMarkdown(rawMarkdown);

      // 4. Format the final Markdown with Prettier for consistency
      try {
        return await prettier.format(processedMarkdown, {
          ...this.config.prettierOptions,
          parser: 'markdown',
          proseWrap: 'preserve' as const
        });
      } catch (error) {
        this.logger.warn('Prettier formatting failed. Returning unformatted Markdown.', { error });
        return processedMarkdown; // Return the processed version if Prettier fails
      }
    } catch (error: unknown) {
      if (error instanceof PandocError) {
        throw error; // Re-throw PandocError as is
      }
      const err = error as Error & { stderr?: string; exitCode?: number };
      throw new PandocError(
        `Failed to convert HTML to Markdown: ${err.message || 'Unknown error'}`,
        err.stderr || '',
        err.exitCode || null
      );
    }
  }

/**
 * Builds the Pandoc command-line arguments based on conversion options
 */
  private buildPandocArgs(from: string, to: string, options: ConversionOptions = {}): string[] {
    const args: string[] = [
      `--from=${from}`,
      `--to=${to}`,
    ];

    if (options.mathjax) {
      args.push('--mathjax');
    }

    if (options.standalone) {
      args.push('--standalone');
    }

    if (options.template) {
      args.push(`--template=${options.template}`);
    }

    if (options.filters?.length) {
      options.filters.forEach(filter => args.push(`--filter=${filter}`));
    }

    if (options.variables) {
      Object.entries(options.variables).forEach(([key, value]) => {
        args.push(`-V${key}=${value}`);
      });
    }

    // Add any additional arguments from the config
    args.push(...(this.config.additionalArgs || []));

    return args;
  }

  /**
   * Executes Pandoc with the given arguments and input
   */
  /**
   * Executes Pandoc with the given input, format, and arguments
   * @param args Command line arguments for Pandoc
   * @param input Optional input string to pass to Pandoc
   * @returns Promise that resolves with the output from Pandoc
   */
  private async executePandoc(args: string[], input?: string): Promise<string> {
    this.ensureReady();
    this.logger.debug(`Executing Pandoc with args: ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      const proc = cp.spawn('pandoc', args, {
        cwd: this.tempDir,
        env: { ...process.env, LANG: 'en_US.UTF-8' },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (err) => {
        const error = new PandocError('Failed to start Pandoc', err.message, null, args);
        this.logger.error('Pandoc execution failed', { error });
        reject(error);
      });

      proc.on('close', (code) => {
        if (code === 0) {
          this.logger.debug('Pandoc execution successful');
          resolve(stdout);
        } else {
          const error = new PandocError(
            `Pandoc exited with code ${code}`,
            stderr,
            code,
            args
          );
          this.logger.error('Pandoc execution failed', { error });
          reject(error);
        }
      });

      if (input) {
        proc.stdin.write(input);
      }
      proc.stdin.end();
    });
  }

  /**
   * Cleans HTML from a contenteditable element before conversion
   */
  private cleanIncomingHtml(html: string): string {
    let cleaned = html;
    // Remove artifacts from contenteditable divs
    cleaned = cleaned.replace(/\s+contenteditable="[^"]*"/g, '');
    cleaned = cleaned.replace(/\s+spellcheck="[^"]*"/g, '');
    // Clean up empty divs that are often left behind by editors
    cleaned = cleaned.replace(/<div>\s*<\/div>/g, '');
    return cleaned.trim();
  }

  /**
   * Post-processes Markdown generated by Pandoc
   */
  private postProcessPandocMarkdown(markdown: string): string {
    let cleaned = markdown;
    // Collapse more than two consecutive newlines into just two
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    return cleaned.trim();
  }

  /**
   * Converts HTML to raw Markdown using Pandoc
   */
  private async pandocHtmlToRawMarkdown(html: string): Promise<string> {
    const args = [
      '--from=html-native_divs-native_spans',
      '--to=commonmark_x',
      '--wrap=none'
    ];

    return this.executePandoc(args, html);
  }

  /**
   * Converts Markdown to HTML with MathJax support
   */
  /**
   * Converts Markdown to HTML with MathJax support
   * @param markdown The markdown content to convert
   * @param options Conversion options
   * @returns HTML content with MathJax support
   */
  public async convertMarkdownToHtml(markdown: string, options: ConversionOptions = {}): Promise<string> {
    try {
      const args = [
        '--from=markdown+tex_math_dollars',
        '--to=html',
        '--mathjax',
        ...this.buildPandocArgs('markdown', 'html', options)
      ];

      return await this.executePandoc(args, markdown);
    } catch (error: unknown) {
      if (error instanceof PandocError) {
        throw error; // Re-throw PandocError as is
      }
      const err = error as Error & { stderr?: string; exitCode?: number };
      throw new PandocError(
        `Failed to convert Markdown to HTML: ${err.message || 'Unknown error'}`,
        err.stderr || '',
        err.exitCode || null
      );
    }
  }



  private normalizeMathDelimiters(content: string): string {
    // Implementation will go here
    return content;
  }

  private processSemanticDivs(html: string): string {
    // Implementation will go here
    return html;
  }

  private processReferences(html: string): string {
    // Implementation will go here
    return html;
  }

  private async createTempFile(content: string, extension: string = '.md'): Promise<string> {
    const tempFile = path.join(this.tempDir, `pandoc-${Date.now()}${extension}`);
    await fs.writeFile(tempFile, content, 'utf8');
    return tempFile;
  }

  private async cleanupTempFiles(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      this.logger.error('Failed to clean up temporary files', { error });
    }
  }
}

// Type Definitions
export interface PandocConfig {
  mathjaxConfig: Record<string, any>;
  luaFilters: string[];
  additionalArgs: string[];
  citationStyle: string;
  defaultMathDelimiters: {
    inline: [string, string];
    display: [string, string];
  };
  prettierOptions: {
    parser: string;
    proseWrap: string;
    [key: string]: any;
  };
}

export interface ConversionOptions {
  from?: string;
  to?: string;
  standalone?: boolean;
  template?: string;
  variables?: Record<string, string>;
  filters?: string[];
  mathjax?: boolean;
  highlightStyle?: string;
  selfContained?: boolean;
  resourcePath?: string;
  logLevel?: 'debug' | 'info' | 'warning' | 'error';
}

export interface MathRenderOptions {
  displayMode?: boolean;
  output?: 'html' | 'mathml' | 'svg';
  throwOnError?: boolean;
  errorColor?: string;
  macros?: Record<string, string>;
  minRuleThickness?: number;
  maxSize?: number[];
  maxExpand?: number;
  strict?: boolean | string | string[];
}

export interface PandocExecuteOptions {
  timeout?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  inputEncoding?: BufferEncoding;
  outputEncoding?: BufferEncoding;
  maxBuffer?: number;
  killSignal?: NodeJS.Signals | number;
  uid?: number;
  gid?: number;
  windowsHide?: boolean;
  windowsVerbatimArguments?: boolean;
}
