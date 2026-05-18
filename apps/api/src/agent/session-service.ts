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
  AgentToolResult,
} from './driver.js';
import type { AgentToolRegistry } from './tool-registry.js';

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
  tools?: AgentToolRegistry | undefined;
}>;

const maxMediatedToolRounds = 3;

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

function createDriverInput(
  input: AgentRunInput,
  tools: AgentToolRegistry | undefined,
): AgentDriverRunInput {
  return { ...input, tools: input.tools ?? tools?.definitions ?? [] };
}

async function executeToolCalls(
  toolCalls: ReadonlyArray<AgentToolCall>,
  tools: AgentToolRegistry | undefined,
  results: AgentToolResult[],
): Promise<void> {
  if (toolCalls.length === 0) {
    return;
  }

  if (tools === undefined) {
    throw new Error('Agent returned tool calls but no tool registry is configured');
  }

  for (const call of toolCalls) {
    results.push(await tools.execute(call));
  }
}

function formatToolResultFollowUp(
  input: AgentRunInput,
  contentMd: string,
  toolResults: ReadonlyArray<AgentToolResult>,
): AgentRunInput {
  const formattedResults = toolResults
    .map(
      (result, index) =>
        `${index + 1}. ${result.name}(${result.argumentsJson}) => ${result.resultJson}`,
    )
    .join('\n');

  return {
    ...input,
    prompt: `${input.prompt}

Assistant response so far:
${contentMd}

Backend-mediated tool results:
${formattedResults}

Use these backend results to answer the original user prompt. If more backend context is required, emit another CS_TOOL_CALL line.`,
  };
}

function createRunResult(
  contentMd: string,
  toolCalls: ReadonlyArray<AgentToolCall>,
  toolResults: ReadonlyArray<AgentToolResult>,
): AgentRunResult {
  return toolCalls.length === 0 && toolResults.length === 0
    ? { contentMd }
    : {
        contentMd,
        toolCalls,
        toolResults,
      };
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

async function* streamRoundEvents(
  iterator: AsyncIterator<AgentStreamEvent>,
  scope: AbortScope,
): AsyncIterable<AgentStreamEvent> {
  while (true) {
    const next = await nextStreamEvent(iterator, scope);
    if (next.done === true) {
      break;
    }

    yield next.value;
  }
}

type StreamMediationState = {
  completedNaturally: boolean;
  contentMd: string;
  iterator: AsyncIterator<AgentStreamEvent> | undefined;
  toolCalls: AgentToolCall[];
  toolResults: AgentToolResult[];
};

function recordStreamEvent(
  event: AgentStreamEvent,
  state: StreamMediationState,
  roundToolCalls: AgentToolCall[],
): void {
  if (event.type === 'content') {
    state.contentMd += event.delta;
    return;
  }

  state.toolCalls.push(event.toolCall);
  roundToolCalls.push(event.toolCall);
}

async function* streamMediatedRounds(
  driver: AgentDriver,
  input: AgentRunInput,
  tools: AgentToolRegistry | undefined,
  scope: AbortScope,
  state: StreamMediationState,
): AsyncIterable<AgentStreamEvent> {
  let driverInput = createDriverInput(input, tools);

  for (let round = 0; ; round += 1) {
    const roundToolCalls: AgentToolCall[] = [];
    state.completedNaturally = false;
    state.iterator = driver.stream(driverInput, scope.signal)[Symbol.asyncIterator]();
    for await (const event of streamRoundEvents(state.iterator, scope)) {
      recordStreamEvent(event, state, roundToolCalls);
      yield event;
    }
    state.completedNaturally = true;

    if (roundToolCalls.length === 0) {
      return;
    }

    if (round >= maxMediatedToolRounds) {
      throw new Error('Agent exceeded mediated tool round limit');
    }

    const previousResultCount = state.toolResults.length;
    await executeToolCalls(roundToolCalls, tools, state.toolResults);
    driverInput = createDriverInput(
      formatToolResultFollowUp(
        input,
        state.contentMd,
        state.toolResults.slice(previousResultCount),
      ),
      tools,
    );
  }
}

export function createAgentSessionService({
  driver,
  now = Date.now,
  store,
  tools,
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
      let failedContentMd = '';
      const toolCalls: AgentToolCall[] = [];
      const toolResults: AgentToolResult[] = [];

      try {
        sessionId = await store.start(createSessionStartInput(driver, input));
        scope.throwIfAborted();
        let driverInput = createDriverInput(input, tools);

        for (let round = 0; ; round += 1) {
          const result = await scope.race(driver.run(driverInput, scope.signal));
          failedContentMd = [failedContentMd, result.contentMd].filter(Boolean).join('\n\n');
          toolCalls.push(...(result.toolCalls ?? []));

          if ((result.toolCalls ?? []).length === 0) {
            break;
          }

          if (round >= maxMediatedToolRounds) {
            throw new Error('Agent exceeded mediated tool round limit');
          }

          const previousResultCount = toolResults.length;
          await executeToolCalls(result.toolCalls ?? [], tools, toolResults);
          driverInput = createDriverInput(
            formatToolResultFollowUp(
              input,
              failedContentMd,
              toolResults.slice(previousResultCount),
            ),
            tools,
          );
        }

        const returnedResult = createRunResult(failedContentMd, toolCalls, toolResults);
        await store.complete(sessionId, {
          ...returnedResult,
          durationMs: now() - startedAt,
        });

        return returnedResult;
      } catch (error) {
        if (sessionId !== undefined) {
          await store.fail(sessionId, {
            contentMd: failedContentMd,
            durationMs: now() - startedAt,
            errorMessage: errorMessage(error),
            toolCalls,
            toolResults,
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
      const streamState: StreamMediationState = {
        completedNaturally: false,
        contentMd: '',
        iterator: undefined,
        toolCalls: [],
        toolResults: [],
      };
      let failed = false;

      try {
        sessionId = await store.start(createSessionStartInput(driver, input));
        scope.throwIfAborted();
        for await (const event of streamMediatedRounds(driver, input, tools, scope, streamState)) {
          yield event;
        }
      } catch (error) {
        failed = true;
        if (sessionId !== undefined) {
          await store.fail(sessionId, {
            contentMd: streamState.contentMd,
            durationMs: now() - startedAt,
            errorMessage: errorMessage(error),
            toolCalls: streamState.toolCalls,
            toolResults: streamState.toolResults,
          });
        }
        throw error;
      } finally {
        if (!streamState.completedNaturally) {
          scope.abort();
          void streamState.iterator?.return?.().catch(() => {});
        }
        scope.dispose();
        if (sessionId !== undefined && !failed) {
          await store.complete(sessionId, {
            contentMd: streamState.contentMd,
            durationMs: now() - startedAt,
            toolCalls: streamState.toolCalls,
            toolResults: streamState.toolResults,
          });
        }
      }
    },
  };
}
