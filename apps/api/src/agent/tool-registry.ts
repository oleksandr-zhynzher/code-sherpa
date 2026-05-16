import type { AgentToolCall, AgentToolDefinition, AgentToolResult } from './driver.js';

export type AgentToolHandler = (args: unknown) => Promise<unknown>;

export type AgentToolRegistration = AgentToolDefinition &
  Readonly<{
    execute: AgentToolHandler;
  }>;

export type AgentToolRegistry = Readonly<{
  definitions: ReadonlyArray<AgentToolDefinition>;
  execute: (call: AgentToolCall) => Promise<AgentToolResult>;
}>;

function parseToolArguments(call: AgentToolCall): unknown {
  try {
    return JSON.parse(call.argumentsJson) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Agent tool ${call.name} received invalid JSON arguments`);
    }

    throw error;
  }
}

export function createAgentToolRegistry(
  registrations: ReadonlyArray<AgentToolRegistration>,
): AgentToolRegistry {
  const tools = new Map(registrations.map((tool) => [tool.name, tool]));

  return {
    definitions: registrations.map(({ description, name, parametersJsonSchema }) => ({
      description,
      name,
      parametersJsonSchema,
    })),
    execute: async (call) => {
      const tool = tools.get(call.name);
      if (tool === undefined) {
        throw new Error(`Agent tool ${call.name} is not registered`);
      }

      const result = await tool.execute(parseToolArguments(call));
      return {
        ...call,
        resultJson: JSON.stringify(result),
        status: 'ok',
      };
    },
  };
}
