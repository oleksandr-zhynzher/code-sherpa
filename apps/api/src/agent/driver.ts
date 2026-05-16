export type AgentDriverKind = 'claude' | 'copilot' | 'fake';

export type AgentDriverHealth = Readonly<{
  message?: string;
  ok: boolean;
}>;

export type AgentToolDefinition = Readonly<{
  description: string;
  name: string;
  parametersJsonSchema: string;
}>;

export type AgentToolCall = Readonly<{
  argumentsJson: string;
  name: string;
}>;

export type AgentRunInput = Readonly<{
  prompt: string;
  systemPrompt?: string;
  tools?: ReadonlyArray<AgentToolDefinition>;
}>;

export type AgentDriverRunInput = AgentRunInput &
  Readonly<{
    tools: ReadonlyArray<AgentToolDefinition>;
  }>;

export type AgentRunResult = Readonly<{
  contentMd: string;
  toolCalls?: ReadonlyArray<AgentToolCall>;
}>;

export type AgentRunFailure = AgentRunResult &
  Readonly<{
    durationMs: number;
    errorMessage: string;
  }>;

export type AgentStreamEvent =
  | Readonly<{
      delta: string;
      type: 'content';
    }>
  | Readonly<{
      toolCall: AgentToolCall;
      type: 'tool_call';
    }>;

export type AgentDriver = Readonly<{
  healthCheck: (signal?: AbortSignal) => Promise<AgentDriverHealth>;
  kind: AgentDriverKind | string;
  run: (input: AgentDriverRunInput, signal?: AbortSignal) => Promise<AgentRunResult>;
  stream: (input: AgentDriverRunInput, signal?: AbortSignal) => AsyncIterable<AgentStreamEvent>;
}>;

export type AgentSessionStartInput = Readonly<{
  driver: string;
  prompt: string;
  systemPrompt?: string;
}>;

export type AgentSessionStore = Readonly<{
  complete: (
    id: string,
    result: AgentRunResult & Readonly<{ durationMs: number }>,
  ) => Promise<void>;
  fail: (id: string, result: AgentRunFailure) => Promise<void>;
  start: (input: AgentSessionStartInput) => Promise<string>;
}>;
