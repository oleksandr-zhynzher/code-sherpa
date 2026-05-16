import type {
  AgentDriver,
  AgentDriverHealth,
  AgentDriverRunInput,
  AgentRunInput,
  AgentRunResult,
  AgentSessionStartInput,
  AgentSessionStore,
  AgentStreamEvent,
  AgentToolCall,
} from './driver.js';

type AgentOperationOptions = Readonly<{ signal?: AbortSignal; timeoutMs?: number }>;

export type AgentSessionService = Readonly<{
  healthCheck: (options?: AgentOperationOptions) => Promise<AgentDriverHealth>;
  run: (input: AgentRunInput, options?: AgentOperationOptions) => Promise<AgentRunResult>;
  stream: (
    input: AgentRunInput,
    options?: AgentOperationOptions,
  ) => AsyncIterable<AgentStreamEvent>;
}>;

type AgentSessionServiceOptions = Readonly<{
  driver: AgentDriver;
  now?: () => number;
  store: AgentSessionStore;
}>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Agent run failed';
}

function createSessionStartInput(
  driver: AgentDriver,
  input: AgentRunInput,
): AgentSessionStartInput {
  return input.systemPrompt === undefined
    ? {
        driver: driver.kind,
        prompt: input.prompt,
      }
    : {
        driver: driver.kind,
        prompt: input.prompt,
        systemPrompt: input.systemPrompt,
      };
}

function createDriverInput(input: AgentRunInput): AgentDriverRunInput {
  return { ...input, tools: input.tools ?? [] };
}

type AbortScope = Readonly<{
  abort: () => void;
  dispose: () => void;
  race: <T>(operationPromise: Promise<T>) => Promise<T>;
  signal: AbortSignal;
  throwIfAborted: () => void;
}>;

function createAbortScope(
  options: AgentOperationOptions | undefined,
  messages: Readonly<{
    cancelMessage: string;
    timeoutMessage: string;
  }>,
): AbortScope {
  if (options?.signal?.aborted === true) {
    throw new Error(messages.cancelMessage);
  }

  const controller = new AbortController();
  let abortError: Error | undefined;
  let abortHandler: (() => void) | undefined;
  let rejectCancellation: ((error: Error) => void) | undefined;
  let timeoutId: NodeJS.Timeout | undefined;
  const hasCancellation = options?.signal !== undefined || options?.timeoutMs !== undefined;
  const cancellationPromise = hasCancellation
    ? new Promise<never>((_resolve, reject) => {
        rejectCancellation = (error: Error) => {
          if (abortError === undefined) {
            abortError = error;
            reject(error);
            controller.abort();
          }
        };
      })
    : undefined;
  cancellationPromise?.catch(() => {});

  if (options?.timeoutMs !== undefined) {
    timeoutId = setTimeout(() => {
      rejectCancellation?.(new Error(messages.timeoutMessage));
    }, options.timeoutMs);
  }

  if (options?.signal !== undefined) {
    abortHandler = () => {
      rejectCancellation?.(new Error(messages.cancelMessage));
    };
    options.signal.addEventListener('abort', abortHandler, { once: true });
  }

  return {
    abort: () => {
      controller.abort();
    },
    dispose: () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      if (abortHandler !== undefined) {
        options?.signal?.removeEventListener('abort', abortHandler);
      }
    },
    race: async <T>(operationPromise: Promise<T>): Promise<T> => {
      try {
        if (abortError !== undefined) {
          throw abortError;
        }
        if (cancellationPromise === undefined) {
          return await operationPromise;
        }

        return await Promise.race([operationPromise, cancellationPromise]);
      } finally {
        operationPromise.catch(() => {});
      }
    },
    signal: controller.signal,
    throwIfAborted: () => {
      if (abortError !== undefined) {
        throw abortError;
      }
    },
  };
}

async function nextStreamEvent(
  iterator: AsyncIterator<AgentStreamEvent>,
  scope: AbortScope,
): Promise<IteratorResult<AgentStreamEvent>> {
  scope.throwIfAborted();
  return scope.race(iterator.next());
}

export function createAgentSessionService({
  driver,
  now = Date.now,
  store,
}: AgentSessionServiceOptions): AgentSessionService {
  return {
    healthCheck: async (options) => {
      const scope = createAbortScope(options, {
        cancelMessage: 'Agent health check cancelled',
        timeoutMessage: 'Agent health check timed out',
      });
      try {
        scope.throwIfAborted();
        return await scope.race(driver.healthCheck(scope.signal));
      } finally {
        scope.dispose();
      }
    },
    run: async (input, options) => {
      const scope = createAbortScope(options, {
        cancelMessage: 'Agent run cancelled',
        timeoutMessage: 'Agent run timed out',
      });
      const startedAt = now();
      let sessionId: string | undefined;

      try {
        sessionId = await store.start(createSessionStartInput(driver, input));
        scope.throwIfAborted();
        const result = await scope.race(driver.run(createDriverInput(input), scope.signal));
        await store.complete(sessionId, {
          ...result,
          durationMs: now() - startedAt,
        });

        return result;
      } catch (error) {
        if (sessionId !== undefined) {
          await store.fail(sessionId, {
            contentMd: '',
            durationMs: now() - startedAt,
            errorMessage: errorMessage(error),
            toolCalls: [],
          });
        }
        throw error;
      } finally {
        scope.dispose();
      }
    },
    stream: async function* (input, options) {
      const scope = createAbortScope(options, {
        cancelMessage: 'Agent stream cancelled',
        timeoutMessage: 'Agent stream timed out',
      });
      const startedAt = now();
      let sessionId: string | undefined;
      let contentMd = '';
      const toolCalls: AgentToolCall[] = [];
      let failed = false;
      let completedNaturally = false;
      let iterator: AsyncIterator<AgentStreamEvent> | undefined;

      try {
        sessionId = await store.start(createSessionStartInput(driver, input));
        scope.throwIfAborted();
        iterator = driver.stream(createDriverInput(input), scope.signal)[Symbol.asyncIterator]();
        while (true) {
          const next = await nextStreamEvent(iterator, scope);
          if (next.done === true) {
            completedNaturally = true;
            break;
          }

          const event = next.value;
          if (event.type === 'content') {
            contentMd += event.delta;
          } else {
            toolCalls.push(event.toolCall);
          }
          yield event;
        }
      } catch (error) {
        failed = true;
        if (sessionId !== undefined) {
          await store.fail(sessionId, {
            contentMd,
            durationMs: now() - startedAt,
            errorMessage: errorMessage(error),
            toolCalls,
          });
        }
        throw error;
      } finally {
        if (!completedNaturally) {
          scope.abort();
          void iterator?.return?.().catch(() => {});
        }
        scope.dispose();
        if (sessionId !== undefined && !failed) {
          await store.complete(sessionId, {
            contentMd,
            durationMs: now() - startedAt,
            toolCalls,
          });
        }
      }
    },
  };
}
