import readline from 'readline';
import { runTurn, systemPrompt } from './conversation';
import { assertLocalModel, ChatMessage, ollamaChat } from './ollama';
import { readSnapshot } from './snapshot';

const DEFAULT_MODEL = 'qwen3.6:27b';

const main = async (): Promise<void> => {
  const model = process.env.JOURNAL_CHAT_MODEL ?? DEFAULT_MODEL;
  await assertLocalModel(model);
  const snapshot = await readSnapshot();
  const chat = ollamaChat(model);
  const today = new Date().toLocaleDateString('en-CA');
  // Held in memory only: closing the program ends the conversation for good.
  const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt(snapshot, today) }];

  // eslint-disable-next-line no-console
  console.log(
    `${model} on this machine, ${snapshot.entries.length} entries, pulled ${snapshot.pulledAt.slice(0, 10)}.`,
  );
  // eslint-disable-next-line no-console
  console.log('Nothing is saved. Type "exit" or press Ctrl-D to leave.\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  // Ctrl-D can close the input while a reply is still streaming.
  let closed = false;
  rl.once('close', () => {
    closed = true;
  });
  rl.setPrompt('you> ');
  rl.prompt();
  for await (const line of rl) {
    const text = line.trim();
    if (text === 'exit') break;
    if (text !== '') {
      messages.push({ role: 'user', content: text });
      let midLine = false;
      // eslint-disable-next-line no-await-in-loop
      await runTurn(messages, snapshot, chat, {
        onText: (chunk) => {
          midLine = true;
          process.stdout.write(chunk);
        },
        onToolCall: (call) => {
          const label = `${call.function.name} ${JSON.stringify(call.function.arguments)}`;
          process.stdout.write(`${midLine ? '\n' : ''}\x1b[2m[${label}]\x1b[0m\n`);
          midLine = false;
        },
      });
      process.stdout.write('\n\n');
    }
    if (!closed) rl.prompt();
  }
  rl.close();
};

main().catch((err: Error) => {
  // eslint-disable-next-line no-console
  console.error(err.message);
  process.exit(1);
});
