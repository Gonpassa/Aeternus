import { ChatMessage, StreamChat, ToolCall } from './ollama';
import { JournalSnapshot } from './snapshot';
import { runTool, TOOL_DEFINITIONS } from './tools';

const MAX_TOOL_ROUNDS = 8;

export const systemPrompt = (snapshot: JournalSnapshot, today: string): string => {
  const { entries } = snapshot;
  return [
    'You are a private companion for talking through the journal of the person you are speaking with.',
    `Today is ${today}. The journal has ${entries.length} entries, from ${entries[0]?.date ?? '-'} to ${entries.at(-1)?.date ?? '-'}.`,
    'You cannot see the journal until you use your tools, so look before you answer anything about it.',
    'Search with several related words, then read the full entries that matter before drawing conclusions.',
    'Only state what the entries say, and give the date when you refer to one. If you find nothing, say so; never invent an entry.',
    'Speak plainly and warmly, and be honest about patterns you notice. You are not a therapist and do not diagnose.',
  ].join('\n');
};

interface TurnHandlers {
  onText: (text: string) => void;
  onToolCall: (call: ToolCall) => void;
}

export const runTurn = async (
  messages: ChatMessage[],
  snapshot: JournalSnapshot,
  chat: StreamChat,
  { onText, onToolCall }: TurnHandlers,
): Promise<void> => {
  for (let round = 0; ; round += 1) {
    // Withholding the tools on the last round forces an answer instead of an endless search.
    const tools = round < MAX_TOOL_ROUNDS ? TOOL_DEFINITIONS : [];
    // Rounds depend on the previous tool results, so they must run in order.
    // eslint-disable-next-line no-await-in-loop
    const reply = await chat(messages, tools, onText);
    messages.push(reply);
    if (!reply.tool_calls) return;

    reply.tool_calls.forEach((call) => {
      onToolCall(call);
      messages.push({
        role: 'tool',
        tool_name: call.function.name,
        content: runTool(snapshot.entries, call.function.name, call.function.arguments),
      });
    });
  }
};
