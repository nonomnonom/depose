import { Injectable, Logger } from '@nestjs/common';
import { DomainError } from '../../../common/domain-error.js';
import { appConfig } from '../../../config/app.config.js';
import { ModelCallsService } from '../runtime/model-calls.service.js';
import type { OcrPageResult, SupportedOcrProvider } from './ocr.types.js';

function defaultOcrText(): OcrPageResult {
  return {
    pageNumber: 0,
    text: '',
    confidence: null,
    blockCount: 0,
    source: 'text-layer',
    provider: 'none',
    model: 'none',
    latencyMs: 0,
  };
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(private readonly calls: ModelCallsService) {}

  get configured(): boolean {
    const c = appConfig.ocr;
    if (c.provider === 'offline') return false;
    if (!c.baseUrl) return false;
    return true;
  }

  async ocrPage(
    firmId: string,
    pageNumber: number,
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<OcrPageResult> {
    const config = appConfig.ocr;
    const startedAt = Date.now();

    if (!this.configured) {
      return {
        ...defaultOcrText(),
        pageNumber,
        source: 'text-layer',
        provider: 'offline',
        model: 'offline',
        latencyMs: Date.now() - startedAt,
      };
    }

    try {
      const provider = config.provider as SupportedOcrProvider;
      const result = await this.callProvider(provider, imageBuffer, mimeType, config);

      await this.calls.record({
        firmId,
        routeKey: 'ocr.page',
        capability: 'ocr',
        provider: config.provider,
        model: config.model,
        status: 'succeeded',
        latencyMs: Date.now() - startedAt,
        degraded: false,
      });

      const text = this.flattenText(result);
      const confidence = this.confidenceFromResult(result);
      const blockCount = this.blockCountFromResult(result);

      return {
        pageNumber,
        text,
        confidence,
        blockCount,
        source: 'ocr',
        provider: config.provider,
        model: config.model,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      await this.calls.record({
        firmId,
        routeKey: 'ocr.page',
        capability: 'ocr',
        provider: config.provider,
        model: config.model,
        status: 'failed',
        latencyMs: Date.now() - startedAt,
        errorCode: 'OCR_UNAVAILABLE',
      });

      this.logger.warn(
        `OCR page ${pageNumber} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw new DomainError('OCR_UNAVAILABLE', 503, 'OCR route did not return page text');
    }
  }

  private async callProvider(
    provider: SupportedOcrProvider,
    image: Buffer,
    mimeType: string,
    config: Readonly<(typeof appConfig)['ocr']>,
  ): Promise<unknown> {
    const base = (config.baseUrl ?? '').replace(/\/$/, '');
    if (!base) throw new Error('OCR_BASE_URL is required for non-offline provider');

    if (provider === 'openrouter-clairic') {
      return this.callOpenRouterClairic(base, config.apiKey ?? '', image, mimeType, config);
    }
    if (provider === 'azure-read') {
      return this.callAzureRead(base, config.apiKey ?? '', image, mimeType, config);
    }
    if (provider === 'google-document-ai') {
      return this.callGoogleDocumentAi(base, config.apiKey ?? '', image, mimeType, config);
    }
    return { text: '', confidence: null, blocks: [], source: 'offline' };
  }

  private async callOpenRouterClairic(
    baseUrl: string,
    apiKey: string,
    image: Buffer,
    mimeType: string,
    config: Readonly<(typeof appConfig)['ocr']>,
  ): Promise<{ text: string; confidence: number | null; blocks: { confidence: number | null }[] }> {
    const format = mimeToImageFormat(mimeType);
    const body = JSON.stringify({
      model: config.model,
      state: '',
      assets: {
        page: { type: 'image', format, data_base64: image.toString('base64') },
      },
      fields: { full_text: { type: 'text', instructions: 'Return the full readable text on the page, verbatim.' } },
      provider: { cloudflare: { include_quantiles: false, return_state_text: false } },
    });

    const response = await fetch(`${baseUrl}/api/alpha/extractions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body,
      signal: AbortSignal.timeout(config.timeoutMs),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`OCR provider returned ${response.status}: ${text.slice(0, 200)}`);
    }

    const payload = (await response.json()) as {
      full_text?: { value: string | null; confidence?: number | null; spans?: unknown[] };
      usage?: { inputTokens?: number; outputTokens?: number };
    };
    const field = payload.full_text;
    if (!field) return { text: '', confidence: null, blocks: [] };

    const text = field.value ?? '';
    const confidence = field.confidence ?? null;
    return { text, confidence, blocks: [] };
  }

  private async callAzureRead(
    baseUrl: string,
    apiKey: string,
    image: Buffer,
    _mimeType: string,
    config: Readonly<(typeof appConfig)['ocr']>,
  ): Promise<{ text: string; confidence: number | null; blocks: { confidence: number | null }[] }> {
    const response = await fetch(`${baseUrl}/read/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Ocp-Apim-Subscription-Key': apiKey,
      },
      body: image.buffer.slice(image.byteOffset, image.byteOffset + image.byteLength) as ArrayBuffer,
      signal: AbortSignal.timeout(config.timeoutMs),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Azure Read returned ${response.status}: ${text.slice(0, 200)}`);
    }

    const operation = response.headers.get('operation-location') ?? response.headers.get('Location');
    if (!operation) return { text: '', confidence: null, blocks: [] };

    await this.pollAzureOperation(baseUrl, apiKey, operation, config.timeoutMs);
    const result = await this.fetchAzureResult(baseUrl, apiKey, operation);
    return this.azureParseResult(result);
  }

  private async pollAzureOperation(
    baseUrl: string,
    apiKey: string,
    operation: string,
    timeoutMs: number,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
      const status = await fetch(operation, {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey },
      });
      if (!status.ok) continue;
      const body = (await status.json()) as { status?: string };
      if (body.status === 'succeeded') return;
      if (body.status === 'failed' || body.status === 'canceled') {
        throw new Error(`Azure Read operation ended with status ${body.status}`);
      }
    }
    throw new Error('Azure Read operation timed out');
  }

  private async fetchAzureResult(
    baseUrl: string,
    apiKey: string,
    operation: string,
  ): Promise<unknown> {
    const response = await fetch(operation, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    });
    if (!response.ok) throw new Error(`Azure Read result fetch returned ${response.status}`);
    return response.json();
  }

  private azureParseResult(result: unknown): { text: string; confidence: number | null; blocks: { confidence: number | null }[] } {
    const parsed = result as {
      analyzeResult?: {
        readResults?: Array<{ lines?: Array<{ text?: string; confidence?: number; words?: Array<{ confidence?: number }> }> }>;
      };
    };
    const lines: string[] = [];
    let confidenceSum = 0;
    let confidenceCount = 0;

    const reads = parsed.analyzeResult?.readResults ?? [];
    for (const read of reads) {
      const linesInRead = read.lines ?? [];
      for (const line of linesInRead) {
        if (line.text) lines.push(line.text);
        const lineConf = line.confidence ?? 0;
        confidenceSum += lineConf;
        confidenceCount += 1;
        for (const word of line.words ?? []) {
          if (word.confidence != null) {
            confidenceSum += word.confidence;
            confidenceCount += 1;
          }
        }
      }
    }

    const text = lines.join('\n');
    const confidence = confidenceCount > 0 ? confidenceSum / confidenceCount : null;
    return { text, confidence, blocks: [] };
  }

  private async callGoogleDocumentAi(
    _baseUrl: string,
    _apiKey: string,
    _image: Buffer,
    _mimeType: string,
    _config: Readonly<(typeof appConfig)['ocr']>,
  ): Promise<{ text: string; confidence: number | null; blocks: { confidence: number | null }[] }> {
    throw new DomainError(
      'OCR_PROVIDER_NOT_IMPLEMENTED',
      501,
      'google-document-ai is configured but not implemented in this build',
    );
  }

  private flattenText(result: unknown): string {
    if (!result || typeof result !== 'object') return '';
    const typed = result as {
      text?: string;
      full_text?: { value?: string | null };
    };
    return typed.text ?? typed.full_text?.value ?? '';
  }

  private confidenceFromResult(result: unknown): number | null {
    if (!result || typeof result !== 'object') return null;
    const typed = result as {
      confidence?: number | null;
      full_text?: { confidence?: number | null };
    };
    return typed.confidence ?? typed.full_text?.confidence ?? null;
  }

  private blockCountFromResult(_result: unknown): number {
    return 0;
  }
}

function mimeToImageFormat(mimeType: string): 'png' | 'jpg' | 'jpeg' | 'webp' {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpeg';
  return 'png';
}
