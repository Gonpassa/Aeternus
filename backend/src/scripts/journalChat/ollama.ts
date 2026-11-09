// Fixed rather than read from OLLAMA_HOST: journal text must never leave this machine.
const OLLAMA_URL = 'http://127.0.0.1:11434';

// Ollama defaults to a small window and silently drops older messages past it.
const CONTEXT_TOKENS = 32768;

export interface ToolCall {
  function: { name: string; arguments: Record<string, unknown> };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_name?: string;
}

interface ShowResponse {
  capabilities?: string[];
  remote_host?: string;
}

const post = async (route: string, body: unknown): Promise<Response> => {
  const response = await fetch(`${OLLAMA_URL}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {
    throw new Error('Ollama is not running on 127.0.0.1:11434. Start it and try again.');
  });
  if (!response.ok) throw new Error(`Ollama returned ${response.status} for ${route}`);
  return response;
};

// Ollama cloud models are called like local ones but run on Ollama's servers.
export const assertLocalModel = async (model: string): Promise<void> => {
  const info = (await (await post('/api/show', { model })).json()) as ShowResponse;
  if (info.remote_host || /cloud/i.test(model)) {
    throw new Error(`${model} is an Ollama cloud model. Journal chat only runs local models.`);
  }
  if (!info.capabilities?.includes('tools')) {
    throw new Error(`${model} does not support tool calling, which journal chat needs.`);
  }
};

export type StreamChat = (
  messages: ChatMessage[],
  tools: unknown[],
  onText: (text: string) => void,
) => Promise<ChatMessage>;

export const ollamaChat =
  (model: string): StreamChat =>
  async (messages, tools, onText) => {
    const response = await post('/api/chat', {
      model,
      messages,
      tools,
      stream: true,
      think: false,
      options: { num_ctx: CONTEXT_TOKENS },
    });
    if (!response.body) throw new Error('Ollama returned an empty response.');

    const result: ChatMessage = { role: 'assistant', content: '' };
    const toolCalls: ToolCall[] = [];
    const applyLine = (line: string): void => {
      if (line.trim() === '') return;
      const { message } = JSON.parse(line) as { message?: Partial<ChatMessage> };
      if (message?.content) {
        result.content += message.content;
        onText(message.content);
      }
      if (message?.tool_calls) toolCalls.push(...message.tool_calls);
    };

    const decoder = new TextDecoder();
    let buffer = '';
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach(applyLine);
    }
    applyLine(buffer);

    if (toolCalls.length > 0) result.tool_calls = toolCalls;
    return result;
  };
