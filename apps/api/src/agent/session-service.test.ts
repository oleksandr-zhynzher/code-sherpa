import { describe, expect, it } from 'vitest';

import type {
  AgentDriver,
  AgentRunInput,
  AgentRunResult,
  AgentSessionStore,
  AgentStreamEvent,
  AgentToolCall,
} from './driver.js';
import { createAgentSessionService } from './session-service.js';

const sessionId = 'session-1';
const authErrorMessage = 'CLI is not authenticated';
const runCancelledMessage = 'Agent run cancelled';
const streamDisconnectedMessage = 'CLI stream disconnected';

function createStore(): AgentSessionStore & {
  readonly completions: ReadonlyArray<
    Readonly<{ contentMd: string; id: string; toolCalls: ReadonlyArray<AgentToolCall> }>
  >;
  readonly failures: ReadonlyArray<
    Readonly<{
      contentMd: string;
      errorMessage: string;
      id: string;
      toolCalls: ReadonlyArray<AgentToolCall>;
    }>
  >;
  readonly starts: ReadonlyArray<Readonly<{ driver: string; prompt: string }>>;
} {
  const starts: Array<Readonly<{ driver: string; prompt: string }>> = [];
  const completions: Array<
    Readonly<{ contentMd: string; id: string; toolCalls: ReadonlyArray<AgentToolCall> }>
  > = [];
  const failures: Array<
    Readonly<{
      contentMd: string;
      errorMessage: string;
      id: string;
      toolCalls: ReadonlyArray<AgentToolCall>;
    }>
  > = [];

  return {
    completions,
    failures,
    starts,
    complete: async (id, result) => {
      completions.push({ contentMd: result.contentMd, id, toolCalls: result.toolCalls ?? [] });
    },
    fail: async (id, result) => {
      failures.push({
        contentMd: result.contentMd,
        errorMessage: result.errorMessage,
        id,
        toolCalls: result.toolCalls ?? [],
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
      run: async (input: AgentRunInput): Promise<AgentRunResult> => ({
        contentMd: `answered: ${input.prompt}`,
        toolCalls: [{ argumentsJson: '{"topic":"hash-map"}', name: input.tools[0].name }],
      }),
      stream: async function* () {},
    };
    const service = createAgentSessionService({ driver, store });

    const result = await service.run({
      prompt: 'Explain hash maps',
      tools: [{ description: 'Creates a quiz', name: 'create_quiz', parametersJsonSchema: '{}' }],
    });

    expect(result.contentMd).toBe('answered: Explain hash maps');
    expect(result.toolCalls).toHaveLength(1);
    expect(store.starts).toEqual([{ driver: 'fake', prompt: 'Explain hash maps' }]);
    expect(store.completions).toEqual([
      {
        contentMd: 'answered: Explain hash maps',
        id: sessionId,
        toolCalls: [{ argumentsJson: '{"topic":"hash-map"}', name: 'create_quiz' }],
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
    expect(store.completions).toEqual([{ contentMd: 'hello world', id: sessionId, toolCalls: [] }]);
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
    expect(store.completions).toEqual([{ contentMd: 'first', id: sessionId, toolCalls: [] }]);
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
    expect(store.completions).toEqual([{ contentMd: 'first', id: sessionId, toolCalls: [] }]);
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
      { contentMd: '', errorMessage: authErrorMessage, id: sessionId, toolCalls: [] },
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
      { contentMd: '', errorMessage: 'Agent run timed out', id: sessionId, toolCalls: [] },
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
      { contentMd: '', errorMessage: runCancelledMessage, id: sessionId, toolCalls: [] },
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
          toolCall: { argumentsJson: '{"topic":"trees"}', name: 'create_quiz' },
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
        toolCalls: [{ argumentsJson: '{"topic":"trees"}', name: 'create_quiz' }],
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
      { contentMd: '', errorMessage: streamDisconnectedMessage, id: sessionId, toolCalls: [] },
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
      { contentMd: '', errorMessage: 'Agent stream timed out', id: sessionId, toolCalls: [] },
    ]);
  });
});
