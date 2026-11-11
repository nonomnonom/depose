import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

interface ChatCompletionBody {
  model?: string;
  messages?: { role: string; content: string }[];
  response_format?: { type?: string; json_schema?: unknown };
}

interface DecisionBody {
  model?: string;
  state?: { text?: string; context?: Record<string, unknown> };
  questions?: Record<string, { type: string }>;
}

export type ChatResponder = (body: ChatCompletionBody) => unknown;
export type DecisionResponder = (body: DecisionBody) => Record<string, unknown>;

export interface FakeModelServer {
  url: string;
  chatCalls: ChatCompletionBody[];
  decisionCalls: DecisionBody[];
  onChatCompletion: (responder: ChatResponder) => void;
  onDecision: (responder: DecisionResponder) => void;
  close: () => Promise<void>;
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

/**
 * One local server for both model boundaries the backend talks to:
 *  - `POST /chat/completions` (OpenAI-compatible BYOK providers and extraction)
 *  - `POST /decisions` (the typed decision route used by contradiction review)
 *
 * Responders are replaced per test so a spec can state exactly what the model
 * says instead of asserting on a prompt.
 */
export async function startFakeModelServer(): Promise<FakeModelServer> {
  const chatCalls: ChatCompletionBody[] = [];
  const decisionCalls: DecisionBody[] = [];

  let chatResponder: ChatResponder = () => ({});
  let decisionResponder: DecisionResponder = () => ({});

  const server = createServer((req, res) => {
    void (async () => {
      if (req.method !== 'POST') {
        sendJson(res, 404, { error: 'not found' });
        return;
      }

      const body = (await readJson(req)) as ChatCompletionBody & DecisionBody;

      if (req.url?.endsWith('/chat/completions')) {
        chatCalls.push(body);
        const content = JSON.stringify(chatResponder(body));
        sendJson(res, 200, {
          id: `chatcmpl-${chatCalls.length}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: body.model ?? 'fake-model',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 12, completion_tokens: 24, total_tokens: 36 },
        });
        return;
      }

      if (req.url?.endsWith('/decisions')) {
        decisionCalls.push(body);
        const answers: Record<string, unknown> = {};
        const responses = decisionResponder(body);
        for (const [key, question] of Object.entries(body.questions ?? {})) {
          const given = responses[key] as Record<string, unknown> | undefined;
          answers[key] = {
            type: question.type,
            confidence: 0.9,
            threshold: 0.8,
            ...given,
          };
        }
        sendJson(res, 200, { answers, usage: { inputTokens: 10, outputTokens: 5 } });
        return;
      }

      sendJson(res, 404, { error: 'not found' });
    })().catch(() => sendJson(res, 500, { error: 'fake server failure' }));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    chatCalls,
    decisionCalls,
    onChatCompletion: (responder) => {
      chatResponder = responder;
    },
    onDecision: (responder) => {
      decisionResponder = responder;
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
