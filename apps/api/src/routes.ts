import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { createAppAgentToolRegistry } from './agent/app-tools.js';
import { createAgentDriverForSetup } from './agent/cli-driver.js';
import { answerTaskQuestion, explainTopic } from './agent/poc-agent.js';
import { createAgentSessionService } from './agent/session-service.js';
import type { SetupState } from './domain/types.js';
import {
  agentRunRequestSchema,
  chatRequestSchema,
  commitTaskSchema,
  createLearningPathSchema,
  idParamsSchema,
  progressListQuerySchema,
  setupSchema,
  solutionUpdateSchema,
} from './http/contracts.js';
import {
  ConflictError,
  errorResponse,
  NotFoundError,
  validationErrorResponse,
} from './http/errors.js';
import {
  commitTask,
  readTaskFiles,
  runTaskTests,
  scaffoldTask,
  writeSolution,
} from './workspace/workspace.js';

function createConfiguredAgentService(server: FastifyInstance) {
  const setup = server.codeSherpa.db.getSetup(server.codeSherpa.workspacePath);
  const driver = createAgentDriverForSetup({
    runner: server.codeSherpa.agentProcessRunner,
    setup,
    workspacePath: server.codeSherpa.workspacePath,
  });

  return {
    driver,
    service: createAgentSessionService({
      driver,
      store: server.codeSherpa.db.agentSessions,
      tools: createAppAgentToolRegistry(server.codeSherpa.db),
    }),
    setup,
  };
}

function createTrustedAgentSystemPrompt(setup: SetupState): string {
  return `You are Code Sherpa, a ${setup.guideTone} DSA tutor. Explain concepts without executing commands or editing files.`;
}

export function registerRoutes(server: FastifyInstance): void {
  server.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(422).send(validationErrorResponse(error));
    }

    if (error instanceof NotFoundError) {
      return reply.status(404).send(errorResponse('NOT_FOUND', error.message));
    }

    if (error instanceof ConflictError) {
      return reply.status(409).send(errorResponse('CONFLICT', error.message));
    }

    server.log.error(error);
    return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Unexpected server error'));
  });

  server.get('/api/setup', async () =>
    server.codeSherpa.db.getSetup(server.codeSherpa.workspacePath),
  );

  server.get('/api/resume', async () => server.codeSherpa.db.getResumeState());

  server.get('/api/progress', async (request) => {
    const query = progressListQuerySchema.parse(request.query);

    return {
      data: server.codeSherpa.db.listProgressEvents(query.limit),
    };
  });

  server.get('/api/agent/health', async () => {
    const agent = createConfiguredAgentService(server);
    const health = await agent.service.healthCheck({ timeoutMs: 30_000 });

    return {
      driver: agent.driver.kind,
      health,
    };
  });

  server.post('/api/agent/run', async (request, reply) => {
    const input = agentRunRequestSchema.parse(request.body);
    const agent = createConfiguredAgentService(server);
    const result = await agent.service.run(
      {
        prompt: input.prompt,
        systemPrompt: createTrustedAgentSystemPrompt(agent.setup),
      },
      { timeoutMs: 120_000 },
    );

    return reply.status(201).send({
      driver: agent.driver.kind,
      result,
    });
  });

  server.post('/api/setup', async (request, reply) => {
    const input = setupSchema.parse(request.body);
    const setup = server.codeSherpa.db.saveSetup({
      agentDriver: input.agentDriver,
      autoSaveProgress: input.autoSaveProgress,
      claudePath: input.claudePath,
      copilotPath: input.copilotPath,
      exerciseLanguage: input.exerciseLanguage,
      guideTone: input.guideTone,
      repoUrl: input.repoUrl,
      safeRunChecks: input.safeRunChecks,
      workspacePath: server.codeSherpa.workspacePath,
    });

    return reply.status(200).send(setup);
  });

  server.get('/api/plans', async () => ({
    data: server.codeSherpa.db.listPlans(),
  }));

  server.post('/api/plans', async (request, reply) => {
    const input = createLearningPathSchema.parse(request.body);
    const plan = server.codeSherpa.db.createPlan(input.goal);

    return reply.status(201).send(plan);
  });

  server.get('/api/plans/:id', async (request) => {
    const params = idParamsSchema.parse(request.params);
    return server.codeSherpa.db.getPlan(params.id);
  });

  server.get('/api/paths', async () => ({
    data: server.codeSherpa.db.listPlans(),
  }));

  server.post('/api/paths', async (request, reply) => {
    const input = createLearningPathSchema.parse(request.body);
    const path = server.codeSherpa.db.createPlan(input.goal);

    return reply.status(201).send(path);
  });

  server.get('/api/paths/:id', async (request) => {
    const params = idParamsSchema.parse(request.params);
    return server.codeSherpa.db.getPlan(params.id);
  });

  server.get('/api/tasks/:id', async (request) => {
    const params = idParamsSchema.parse(request.params);
    return server.codeSherpa.db.getTask(params.id);
  });

  server.get('/api/topics/:id', async (request) => {
    const params = idParamsSchema.parse(request.params);
    return server.codeSherpa.db.getTopic(params.id);
  });

  server.post('/api/topics/:id/explain', async (request) => {
    const params = idParamsSchema.parse(request.params);
    const topic = server.codeSherpa.db.getTopic(params.id);

    return server.codeSherpa.db.updateTopicExplanation(params.id, explainTopic(topic));
  });

  server.post('/api/tasks/:id/scaffold', async (request, reply) => {
    const params = idParamsSchema.parse(request.params);
    const context = server.codeSherpa.db.getTaskContext(params.id);
    const scaffold = await scaffoldTask(server.codeSherpa.workspacePath, context);
    const task = server.codeSherpa.db.updateTaskFiles(
      params.id,
      scaffold.solutionPath,
      scaffold.testPath,
    );

    return reply.status(201).send({
      files: scaffold.files,
      task,
    });
  });

  server.get('/api/tasks/:id/files', async (request) => {
    const params = idParamsSchema.parse(request.params);
    const task = server.codeSherpa.db.getTask(params.id);

    return {
      files: await readTaskFiles(server.codeSherpa.workspacePath, task),
      task,
    };
  });

  server.put('/api/tasks/:id/solution', async (request) => {
    const params = idParamsSchema.parse(request.params);
    const input = solutionUpdateSchema.parse(request.body);
    const task = server.codeSherpa.db.getTask(params.id);

    return {
      files: await writeSolution(server.codeSherpa.workspacePath, task, input.content),
      task,
    };
  });

  server.post('/api/tasks/:id/run', async (request) => {
    const params = idParamsSchema.parse(request.params);
    const task = server.codeSherpa.db.getTask(params.id);
    const result = await runTaskTests(server.codeSherpa.workspacePath, task);
    const updatedTask = server.codeSherpa.db.recordTaskRun(params.id, result.passed);

    return {
      result,
      task: updatedTask,
    };
  });

  server.post('/api/tasks/:id/commit', async (request) => {
    const params = idParamsSchema.parse(request.params);
    const input = commitTaskSchema.parse(request.body);
    const task = server.codeSherpa.db.getTask(params.id);
    const message = input.message ?? `feat(${task.slug}): solve ${task.title}`;
    const result = await commitTask(server.codeSherpa.workspacePath, task, message);
    const updatedTask = server.codeSherpa.db.markTaskDone(params.id);

    return {
      result,
      task: updatedTask,
    };
  });

  server.get('/api/tasks/:id/chat', async (request) => {
    const params = idParamsSchema.parse(request.params);
    server.codeSherpa.db.getTask(params.id);

    return {
      data: server.codeSherpa.db.listChatMessages(params.id),
    };
  });

  server.post('/api/tasks/:id/chat', async (request, reply) => {
    const params = idParamsSchema.parse(request.params);
    const input = chatRequestSchema.parse(request.body);
    const task = server.codeSherpa.db.getTask(params.id);
    const userMessage = server.codeSherpa.db.addChatMessage({
      contentMd: input.message,
      role: 'user',
      taskId: params.id,
    });
    const answer = answerTaskQuestion(task, input.message);
    const assistantMessage = server.codeSherpa.db.addChatMessage({
      contentMd: answer.responseMd,
      role: 'assistant',
      taskId: params.id,
    });
    const visualization =
      answer.visualization === undefined
        ? null
        : server.codeSherpa.db.createVisualization(answer.visualization);

    return reply.status(201).send({
      assistantMessage,
      userMessage,
      visualization,
    });
  });

  server.get('/api/visualizations/:id', async (request) => {
    const params = idParamsSchema.parse(request.params);
    return server.codeSherpa.db.getVisualization(params.id);
  });
}
