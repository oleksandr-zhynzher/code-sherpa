import { describe, expect, it } from 'vitest';

import type {
  AgentDriver,
  AgentRunInput,
  AgentRunResult,
  AgentSessionStore,
  AgentStreamEvent,
  AgentToolCall,
  AgentToolResult,
} from './driver.js';
import { createAgentSessionService } from './session-service.js';
import { createAgentToolRegistry } from './tool-registry.js';

const sessionId = 'session-1';
const authErrorMessage = 'CLI is not authenticated';
const runCancelledMessage = 'Agent run cancelled';
const streamDisconnectedMessage = 'CLI stream disconnected';
const hashMapToolArgsJson = '{"topic":"hash-map"}';
const taskContextToolArgsJson = '{"taskId":"task-1"}';
const treesToolArgsJson = '{"topic":"trees"}';
const toolResultPromptMarker = 'Backend-mediated tool results';
const createQuizToolName = 'create_quiz';
const getTaskContextToolName = 'get_task_context';
const needContextContent = 'Need context.';
const hashMapAnswer = 'Use a hash map.';
const taskContextResultJson = '{"args":{"taskId":"task-1"},"title":"Two Sum"}';

function createStore(): AgentSessionStore & {
  readonly completions: ReadonlyArray<
    Readonly<{
      contentMd: string;
      id: string;
      toolCalls: ReadonlyArray<AgentToolCall>;
      toolResults: ReadonlyArray<AgentToolResult>;
    }>
  >;
  readonly failures: ReadonlyArray<
    Readonly<{
      contentMd: string;
      errorMessage: string;
      id: string;
      toolCalls: ReadonlyArray<AgentToolCall>;
      toolResults: ReadonlyArray<AgentToolResult>;
    }>
  >;
  readonly starts: ReadonlyArray<Readonly<{ driver: string; prompt: string }>>;
} {
  const starts: Array<Readonly<{ driver: string; prompt: string }>> = [];
  const completions: Array<
    Readonly<{
      contentMd: string;
      id: string;
      toolCalls: ReadonlyArray<AgentToolCall>;
      toolResults: ReadonlyArray<AgentToolResult>;
    }>
  > = [];
  const failures: Array<
    Readonly<{
      contentMd: string;
      errorMessage: string;
      id: string;
      toolCalls: ReadonlyArray<AgentToolCall>;
      toolResults: ReadonlyArray<AgentToolResult>;
    }>
  > = [];

  return {
    completions,
    failures,
    starts,
    complete: async (id, result) => {
      completions.push({
        contentMd: result.contentMd,
        id,
        toolCalls: result.toolCalls ?? [],
        toolResults: result.toolResults ?? [],
      });
    },
    fail: async (id, result) => {
      failures.push({
        contentMd: result.contentMd,
        errorMessage: result.errorMessage,
        id,
        toolCalls: result.toolCalls ?? [],
        toolResults: result.toolResults ?? [],
      });
    },
    start: async (input) => {
      starts.push({ driver: input.driver, prompt: input.prompt });
      return sessionId;
    },
  };
}

describe('AgentSessionService', () => {
  it('checks driver health with timeout support', async () => {
    let aborted = false;
    const driver: AgentDriver = {
      kind: 'fake',
      healthCheck: (signal) =>
        new Promise(() => {
          signal?.addEventListener('abort', () => {
            aborted = true;
          });
        }),
      run: async () => ({ contentMd: '' }),
      stream: async function* () {},
    };
    const service = createAgentSessionService({ driver, store: createStore() });

    await expect(service.healthCheck({ timeoutMs: 1 })).rejects.toThrow(
      'Agent health check timed out',
    );
    expect(aborted).toBe(true);
  });

  it('records a completed one-shot run with tool-call capable input', async () => {
    const store = createStore();
    const driver: AgentDriver = {
      kind: 'fake',
      healthCheck: async () => ({ ok: true }),
      run: async (input: AgentRunInput): Promise<AgentRunResult> =>
        input.prompt.includes(toolResultPromptMarker)
          ? { contentMd: 'final answer with quiz context' }
          : {
              contentMd: `answered: ${input.prompt}`,
              toolCalls: [{ argumentsJson: hashMapToolArgsJson, name: input.tools[0].name }],
              toolResults: [],
            },
      stream: async function* () {},
    };
    const registry = createAgentToolRegistry([
      {
        description: 'Creates a quiz',
        execute: async (args) => ({ args, quizId: 'quiz-1' }),
        name: createQuizToolName,
        parametersJsonSchema: '{}',
      },
    ]);
    const service = createAgentSessionService({ driver, store, tools: registry });

    const result = await service.run({
      prompt: 'Explain hash maps',
      tools: [
        { description: 'Creates a quiz', name: createQuizToolName, parametersJsonSchema: '{}' },
      ],
    });

    expect(result.contentMd).toBe('answered: Explain hash maps\n\nfinal answer with quiz context');
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolResults).toEqual([
      {
        argumentsJson: hashMapToolArgsJson,
        name: createQuizToolName,
        resultJson: '{"args":{"topic":"hash-map"},"quizId":"quiz-1"}',
        status: 'ok',
      },
    ]);
    expect(store.starts).toEqual([{ driver: 'fake', prompt: 'Explain hash maps' }]);
    expect(store.completions).toEqual([
      {
        contentMd: 'answered: Explain hash maps\n\nfinal answer with quiz context',
        id: sessionId,
        toolCalls: [{ argumentsJson: hashMapToolArgsJson, name: createQuizToolName }],
        toolResults: [
          {
            argumentsJson: hashMapToolArgsJson,
            name: createQuizToolName,
            resultJson: '{"args":{"topic":"hash-map"},"quizId":"quiz-1"}',
            status: 'ok',
          },
        ],
      },
    ]);
    expect(store.failures).toEqual([]);
  });

  it('records streamed output as a completed session', async () => {
    const store = createStore();
    const driver: AgentDriver = {
      kind: 'fake',
      healthCheck: async () => ({ ok: true }),
      run: async () => ({ contentMd: '' }),
      stream: async function* () {
        yield { delta: 'hello', type: 'content' };
        yield { delta: ' world', type: 'content' };
      },
    };
    const service = createAgentSessionService({ driver, store });

    const events = [];
    for await (const event of service.stream({ prompt: 'Say hello' })) {
      events.push(event);
    }

    expect(events).toEqual([
      { delta: 'hello', type: 'content' },
      { delta: ' world', type: 'content' },
    ]);
    expect(store.completions).toEqual([
      { contentMd: 'hello world', id: sessionId, toolCalls: [], toolResults: [] },
    ]);
  });

  it('passes mediated tool definitions to the driver and stores tool results', async () => {
    const store = createStore();
    const registry = createAgentToolRegistry([
      {
        description: 'Looks up task context',
        execute: async (args) => ({ args, title: 'Two Sum' }),
        name: getTaskContextToolName,
        parametersJsonSchema: '{"type":"object"}',
      },
    ]);
    const driver: AgentDriver = {
      kind: 'fake',
      healthCheck: async () => ({ ok: true }),
      run: async (input) =>
        input.prompt.includes(toolResultPromptMarker)
          ? { contentMd: hashMapAnswer }
          : {
              contentMd: needContextContent,
              toolCalls: [{ argumentsJson: taskContextToolArgsJson, name: input.tools[0].name }],
            },
      stream: async function* () {},
    };
    const service = createAgentSessionService({ driver, store, tools: registry });

    const result = await service.run({ prompt: 'Help me' });

    expect(result.toolResults).toEqual([
      {
        argumentsJson: taskContextToolArgsJson,
        name: getTaskContextToolName,
        resultJson: taskContextResultJson,
        status: 'ok',
      },
    ]);
    expect(result.contentMd).toBe(`${needContextContent}\n\n${hashMapAnswer}`);
    expect(store.completions).toEqual([
      {
        contentMd: `${needContextContent}\n\n${hashMapAnswer}`,
        id: sessionId,
        toolCalls: [{ argumentsJson: taskContextToolArgsJson, name: getTaskContextToolName }],
        toolResults: [
          {
            argumentsJson: taskContextToolArgsJson,
            name: getTaskContextToolName,
            resultJson: taskContextResultJson,
            status: 'ok',
          },
        ],
      },
    ]);
  });

  it('records returned tool calls when mediated execution fails', async () => {
    const store = createStore();
    const driver: AgentDriver = {
      kind: 'fake',
      healthCheck: async () => ({ ok: true }),
      run: async () => ({
        contentMd: 'Need unavailable tool.',
        toolCalls: [{ argumentsJson: '{}', name: 'unknown_tool' }],
      }),
      stream: async function* () {},
    };
    const service = createAgentSessionService({
      driver,
      store,
      tools: createAgentToolRegistry([]),
    });

    await expect(service.run({ prompt: 'Help me' })).rejects.toThrow(
      'Agent tool unknown_tool is not registered',
    );
    expect(store.failures).toEqual([
      {
        contentMd: 'Need unavailable tool.',
        errorMessage: 'Agent tool unknown_tool is not registered',
        id: sessionId,
        toolCalls: [{ argumentsJson: '{}', name: 'unknown_tool' }],
        toolResults: [],
      },
    ]);
  });

  it('keeps successful tool results when a later mediated tool call fails', async () => {
    const store = createStore();
    const driver: AgentDriver = {
      kind: 'fake',
      healthCheck: async () => ({ ok: true }),
      run: async () => ({
        contentMd: 'Need two tools.',
        toolCalls: [
          { argumentsJson: '{}', name: 'ok_tool' },
          { argumentsJson: '{}', name: 'missing_tool' },
        ],
      }),
      stream: async function* () {},
    };
    const service = createAgentSessionService({
      driver,
      store,
      tools: createAgentToolRegistry([
        {
          description: 'Succeeds',
          execute: async () => ({ ok: true }),
          name: 'ok_tool',
          parametersJsonSchema: '{}',
        },
      ]),
    });

    await expect(service.run({ prompt: 'Help me' })).rejects.toThrow(
      'Agent tool missing_tool is not registered',
    );
    expect(store.failures).toEqual([
      {
        contentMd: 'Need two tools.',
        errorMessage: 'Agent tool missing_tool is not registered',
        id: sessionId,
        toolCalls: [
          { argumentsJson: '{}', name: 'ok_tool' },
          { argumentsJson: '{}', name: 'missing_tool' },
        ],
        toolResults: [
          {
            argumentsJson: '{}',
            name: 'ok_tool',
            resultJson: '{"ok":true}',
            status: 'ok',
          },
        ],
      },
    ]);
  });

  it('feeds streamed tool results back to the driver and stores the final answer', async () => {
    const store = createStore();
    const registry = createAgentToolRegistry([
      {
        description: 'Looks up task context',
        execute: async (args) => ({ args, title: 'Two Sum' }),
        name: getTaskContextToolName,
        parametersJsonSchema: '{"type":"object"}',
      },
    ]);
    const driver: AgentDriver = {
      kind: 'fake',
      healthCheck: async () => ({ ok: true }),
      run: async () => ({ contentMd: '' }),
      stream: async function* (input) {
        if (input.prompt.includes(toolResultPromptMarker)) {
          yield { delta: hashMapAnswer, type: 'content' };
          return;
        }

        yield { delta: needContextContent, type: 'content' };
        yield {
          toolCall: { argumentsJson: taskContextToolArgsJson, name: getTaskContextToolName },
          type: 'tool_call',
        };
      },
    };
    const service = createAgentSessionService({ driver, store, tools: registry });

    const events = [];
    for await (const event of service.stream({ prompt: 'Help me' })) {
      events.push(event);
    }

    expect(events).toEqual([
      { delta: needContextContent, type: 'content' },
      {
        toolCall: { argumentsJson: taskContextToolArgsJson, name: getTaskContextToolName },
        type: 'tool_call',
      },
      { delta: hashMapAnswer, type: 'content' },
    ]);
    expect(store.completions).toEqual([
      {
        contentMd: `${needContextContent}${hashMapAnswer}`,
        id: sessionId,
        toolCalls: [{ argumentsJson: taskContextToolArgsJson, name: getTaskContextToolName }],
        toolResults: [
          {
            argumentsJson: taskContextToolArgsJson,
            name: getTaskContextToolName,
            resultJson: taskContextResultJson,
            status: 'ok',
          },
        ],
      },
    ]);
  });

  it('completes streamed sessions and aborts the driver when the consumer exits early', async () => {
    const store = createStore();
    let aborted = false;
    const driver: AgentDriver = {
      kind: 'fake',
      healthCheck: async () => ({ ok: true }),
      run: async () => ({ contentMd: '' }),
      stream: async function* (_input, signal) {
        signal?.addEventListener('abort', () => {
          aborted = true;
        });
        yield { delta: 'first', type: 'content' };
        yield { delta: ' second', type: 'content' };
      },
    };
    const service = createAgentSessionService({ driver, store });

    for await (const _event of service.stream({ prompt: 'Partial stream' })) {
      break;
    }

    expect(aborted).toBe(true);
    expect(store.completions).toEqual([
      { contentMd: 'first', id: sessionId, toolCalls: [], toolResults: [] },
    ]);
  });

  it('does not hang when cancelled stream cleanup never resolves', async () => {
    const store = createStore();
    let returnCalled = false;
    const driver: AgentDriver = {
      kind: 'fake',
      healthCheck: async () => ({ ok: true }),
      run: async () => ({ contentMd: '' }),
      stream: () => {
        const iterator: AsyncIterator<AgentStreamEvent> & AsyncIterable<AgentStreamEvent> = {
          [Symbol.asyncIterator]() {
            return iterator;
          },
          next: async () => ({ done: false, value: { delta: 'first', type: 'content' } }),
          return: () => {
            returnCalled = true;
            return new Promise<IteratorResult<AgentStreamEvent>>(() => {});
          },
        };
        return iterator;
      },
    };
    const service = createAgentSessionService({ driver, store });

    const result = await Promise.race([
      (async () => {
        for await (const _event of service.stream({ prompt: 'Partial stream' })) {
          break;
        }
        return 'completed';
      })(),
      new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve('timed out');
        }, 10);
      }),
    ]);

    expect(result).toBe('completed');
    expect(returnCalled).toBe(true);
    expect(store.completions).toEqual([
      { contentMd: 'first', id: sessionId, toolCalls: [], toolResults: [] },
    ]);
  });

  it('records failures when the driver errors', async () => {
    const store = createStore();
    const driver: AgentDriver = {
      kind: 'fake',
      healthCheck: async () => ({ ok: true }),
      run: async () => {
        throw new Error(authErrorMessage);
      },
      stream: async function* () {},
    };
    const service = createAgentSessionService({ driver, store });

    await expect(service.run({ prompt: 'Hello' })).rejects.toThrow(authErrorMessage);
    expect(store.failures).toEqual([
      {
        contentMd: '',
        errorMessage: authErrorMessage,
        id: sessionId,
        toolCalls: [],
        toolResults: [],
      },
    ]);
  });

  it('records timeout failures and aborts the driver run', async () => {
    const store = createStore();
    let aborted = false;
    const driver: AgentDriver = {
      kind: 'fake',
      healthCheck: async () => ({ ok: true }),
      run: (_input, signal) =>
        new Promise(() => {
          signal?.addEventListener('abort', () => {
            aborted = true;
          });
        }),
      stream: async function* () {},
    };
    const service = createAgentSessionService({ driver, store });

    await expect(service.run({ prompt: 'Slow prompt' }, { timeoutMs: 1 })).rejects.toThrow(
      'Agent run timed out',
    );
    expect(aborted).toBe(true);
    expect(store.failures).toEqual([
      {
        contentMd: '',
        errorMessage: 'Agent run timed out',
        id: sessionId,
        toolCalls: [],
        toolResults: [],
      },
    ]);
  });

  it('rejects already-cancelled runs without starting a session or invoking the driver', async () => {
    const store = createStore();
    let runInvoked = false;
    const driver: AgentDriver = {
      kind: 'fake',
      healthCheck: async () => ({ ok: true }),
      run: async () => {
        runInvoked = true;
        return { contentMd: '' };
      },
      stream: async function* () {},
    };
    const service = createAgentSessionService({ driver, store });
    const controller = new AbortController();

    controller.abort();

    await expect(
      service.run({ prompt: 'Already cancelled' }, { signal: controller.signal }),
    ).rejects.toThrow(runCancelledMessage);
    expect(runInvoked).toBe(false);
    expect(store.starts).toEqual([]);
  });

  it('records caller cancellation failures and aborts the driver run', async () => {
    const store = createStore();
    let aborted = false;
    let resolveRunStarted: (() => void) | undefined;
    const runStarted = new Promise<void>((resolve) => {
      resolveRunStarted = resolve;
    });
    const driver: AgentDriver = {
      kind: 'fake',
      healthCheck: async () => ({ ok: true }),
      run: (_input, signal) => {
        resolveRunStarted?.();
        return new Promise(() => {
          signal?.addEventListener('abort', () => {
            aborted = true;
          });
        });
      },
      stream: async function* () {},
    };
    const service = createAgentSessionService({ driver, store });
    const controller = new AbortController();
    const result = service.run({ prompt: 'Cancel prompt' }, { signal: controller.signal });

    await runStarted;
    controller.abort();

    await expect(result).rejects.toThrow(runCancelledMessage);
    expect(aborted).toBe(true);
    expect(store.failures).toEqual([
      {
        contentMd: '',
        errorMessage: runCancelledMessage,
        id: sessionId,
        toolCalls: [],
        toolResults: [],
      },
    ]);
  });

  it('records partial transcript and tool calls when streamed runs fail', async () => {
    const store = createStore();
    const driver: AgentDriver = {
      kind: 'fake',
      healthCheck: async () => ({ ok: true }),
      run: async () => ({ contentMd: '' }),
      stream: async function* () {
        yield { delta: 'partial ', type: 'content' };
        yield {
          toolCall: { argumentsJson: treesToolArgsJson, name: createQuizToolName },
          type: 'tool_call',
        };
        throw new Error(streamDisconnectedMessage);
      },
    };
    const service = createAgentSessionService({ driver, store });

    await expect(async () => {
      for await (const _event of service.stream({ prompt: 'Stream then fail' })) {
        // Consume until the driver fails.
      }
    }).rejects.toThrow(streamDisconnectedMessage);
    expect(store.failures).toEqual([
      {
        contentMd: 'partial ',
        errorMessage: streamDisconnectedMessage,
        id: sessionId,
        toolCalls: [{ argumentsJson: treesToolArgsJson, name: createQuizToolName }],
        toolResults: [],
      },
    ]);
  });

  it('records failures when the driver cannot create a stream', async () => {
    const store = createStore();
    const driver: AgentDriver = {
      kind: 'fake',
      healthCheck: async () => ({ ok: true }),
      run: async () => ({ contentMd: '' }),
      stream: () => {
        throw new Error(streamDisconnectedMessage);
      },
    };
    const service = createAgentSessionService({ driver, store });

    await expect(async () => {
      for await (const _event of service.stream({ prompt: 'Start stream' })) {
        // The driver fails before events are available.
      }
    }).rejects.toThrow(streamDisconnectedMessage);
    expect(store.failures).toEqual([
      {
        contentMd: '',
        errorMessage: streamDisconnectedMessage,
        id: sessionId,
        toolCalls: [],
        toolResults: [],
      },
    ]);
  });

  it('records timeout failures and aborts streamed runs', async () => {
    const store = createStore();
    let aborted = false;
    const driver: AgentDriver = {
      kind: 'fake',
      healthCheck: async () => ({ ok: true }),
      run: async () => ({ contentMd: '' }),
      stream: async function* (_input, signal) {
        await new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            aborted = true;
            reject(new Error('driver observed abort'));
          });
        });
        yield { delta: 'unreachable', type: 'content' };
      },
    };
    const service = createAgentSessionService({ driver, store });

    await expect(async () => {
      for await (const _event of service.stream({ prompt: 'Slow stream' }, { timeoutMs: 1 })) {
        // No events are expected before the timeout.
      }
    }).rejects.toThrow('Agent stream timed out');
    expect(aborted).toBe(true);
    expect(store.failures).toEqual([
      {
        contentMd: '',
        errorMessage: 'Agent stream timed out',
        id: sessionId,
        toolCalls: [],
        toolResults: [],
      },
    ]);
  });
});
