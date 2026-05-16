import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import {
  answerTaskChatWithAgent,
  createTrustedAgentSystemPrompt,
  generateLearningPathDraftWithAgent,
  generateTopicExplanationWithAgent,
} from './agent/app-flows.js';
import { createAppAgentToolRegistry } from './agent/app-tools.js';
import { createAgentDriverForSetup } from './agent/cli-driver.js';
import { createAgentSessionService } from './agent/session-service.js';
import {
  agentRunRequestSchema,
  chatRequestSchema,
  commitTaskSchema,
  createLearningPathSchema,
  idParamsSchema,
  progressListQuerySchema,
  repoLinkSchema,
  setupSchema,
  solutionUpdateSchema,
  threadScopeQuerySchema,
} from './http/contracts.js';
import {
  ConflictError,
  errorResponse,
  NotFoundError,
  validationErrorResponse,
} from './http/errors.js';
import {
  commitTask,
  getWorkspaceStatus,
  linkWorkspaceRepository,
  pushWorkspace,
  readTaskFiles,
  runTaskTests,
  scaffoldTask,
  validateWorkspaceRoot,
  writeSolution,
} from './workspace/workspace.js';

function getConfiguredSetup(server: FastifyInstance) {
  return server.codeSherpa.db.getSetup(server.codeSherpa.workspacePath);
}

async function getConfiguredWorkspacePath(server: FastifyInstance): Promise<string> {
  return validateWorkspaceRoot(
    getConfiguredSetup(server).workspacePath,
    server.codeSherpa.workspaceBasePath,
  );
}

async function createConfiguredAgentService(server: FastifyInstance) {
  const setup = getConfiguredSetup(server);
  const workspacePath = await validateWorkspaceRoot(
    setup.workspacePath,
    server.codeSherpa.workspaceBasePath,
  );
  const driver = createAgentDriverForSetup({
    runner: server.codeSherpa.agentProcessRunner,
    setup,
    workspacePath,
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

  server.get('/api/setup', async () => {
    const setup = getConfiguredSetup(server);
    const workspacePath = await validateWorkspaceRoot(
      setup.workspacePath,
      server.codeSherpa.workspaceBasePath,
    );
    return { ...setup, workspacePath };
  });

  server.get('/api/resume', async () => server.codeSherpa.db.getResumeState());

  server.get('/api/progress', async (request) => {
    const query = progressListQuerySchema.parse(request.query);

    return {
      data: server.codeSherpa.db.listProgressEvents(query.limit),
    };
  });

  server.get('/api/agent/health', async () => {
    const agent = await createConfiguredAgentService(server);
    const health = await agent.service.healthCheck({ timeoutMs: 30_000 });

    return {
      driver: agent.driver.kind,
      health,
    };
  });

  server.post('/api/agent/run', async (request, reply) => {
    const input = agentRunRequestSchema.parse(request.body);
    const agent = await createConfiguredAgentService(server);
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
    const currentSetup = getConfiguredSetup(server);
    const workspacePath = await validateWorkspaceRoot(
      input.workspacePath ?? currentSetup.workspacePath,
      server.codeSherpa.workspaceBasePath,
    );
    const setup = server.codeSherpa.db.saveSetup({
      agentDriver: input.agentDriver,
      autoSaveProgress: input.autoSaveProgress,
      claudePath: input.claudePath,
      copilotPath: input.copilotPath,
      exerciseLanguage: input.exerciseLanguage,
      guideTone: input.guideTone,
      repoUrl: input.repoUrl,
      safeRunChecks: input.safeRunChecks,
      workspacePath,
    });

    return reply.status(200).send(setup);
  });

  server.get('/api/repo/status', async () => {
    const setup = getConfiguredSetup(server);
    const workspacePath = await validateWorkspaceRoot(
      setup.workspacePath,
      server.codeSherpa.workspaceBasePath,
    );
    const status = await getWorkspaceStatus(workspacePath);

    return {
      repoUrl: setup.repoUrl,
      status,
    };
  });

  server.post('/api/repo/link', async (request, reply) => {
    const input = repoLinkSchema.parse(request.body);
    const currentSetup = getConfiguredSetup(server);
    const workspacePath = input.workspacePath ?? currentSetup.workspacePath;
    const repoUrl = input.repoUrl ?? null;
    const status = await linkWorkspaceRepository(
      workspacePath,
      repoUrl,
      server.codeSherpa.workspaceBasePath,
    );
    const setup = server.codeSherpa.db.saveSetup({
      agentDriver: currentSetup.agentDriver,
      autoSaveProgress: currentSetup.autoSaveProgress,
      claudePath: currentSetup.claudePath ?? undefined,
      copilotPath: currentSetup.copilotPath ?? undefined,
      exerciseLanguage: currentSetup.exerciseLanguage,
      guideTone: currentSetup.guideTone,
      repoUrl: repoUrl ?? undefined,
      safeRunChecks: currentSetup.safeRunChecks,
      workspacePath: status.workspacePath,
    });

    return reply.status(200).send({
      setup,
      status,
    });
  });

  server.post('/api/git/push', async () => {
    const workspacePath = await getConfiguredWorkspacePath(server);

    return { result: await pushWorkspace(workspacePath) };
  });

  server.get('/api/plans', async () => ({
    data: server.codeSherpa.db.listPlans(),
  }));

  server.post('/api/plans', async (request, reply) => {
    const input = createLearningPathSchema.parse(request.body);
    const agent = await createConfiguredAgentService(server);
    const draft = await generateLearningPathDraftWithAgent({
      goal: input.goal,
      service: agent.service,
      setup: agent.setup,
    });
    const plan = server.codeSherpa.db.createPlanFromDraft(input.goal, draft);

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
    const agent = await createConfiguredAgentService(server);
    const draft = await generateLearningPathDraftWithAgent({
      goal: input.goal,
      service: agent.service,
      setup: agent.setup,
    });
    const path = server.codeSherpa.db.createPlanFromDraft(input.goal, draft);

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
    const agent = await createConfiguredAgentService(server);
    const explanation = await generateTopicExplanationWithAgent({
      service: agent.service,
      setup: agent.setup,
      topic,
    });

    return server.codeSherpa.db.updateTopicExplanation(params.id, explanation);
  });

  server.post('/api/tasks/:id/scaffold', async (request, reply) => {
    const params = idParamsSchema.parse(request.params);
    const context = server.codeSherpa.db.getTaskContext(params.id);
    const scaffold = await scaffoldTask(await getConfiguredWorkspacePath(server), context);
    const task = server.codeSherpa.db.updateTaskFiles(
      params.id,
      scaffold.solutionPath,
      scaffold.testPath,
    );
    const generation = server.codeSherpa.db.createCodeGeneration({
      generatedPaths: [scaffold.solutionPath, scaffold.testPath],
      prompt: context.promptMd,
      status: 'completed',
      taskId: params.id,
    });

    return reply.status(201).send({
      files: scaffold.files,
      generation,
      task,
    });
  });

  server.get('/api/tasks/:id/generation', async (request) => {
    const params = idParamsSchema.parse(request.params);
    server.codeSherpa.db.getTask(params.id);

    return {
      generation: server.codeSherpa.db.getLatestCodeGeneration(params.id),
    };
  });

  server.get('/api/tasks/:id/files', async (request) => {
    const params = idParamsSchema.parse(request.params);
    const task = server.codeSherpa.db.getTask(params.id);

    return {
      files: await readTaskFiles(await getConfiguredWorkspacePath(server), task),
      task,
    };
  });

  server.put('/api/tasks/:id/solution', async (request) => {
    const params = idParamsSchema.parse(request.params);
    const input = solutionUpdateSchema.parse(request.body);
    const task = server.codeSherpa.db.getTask(params.id);

    return {
      files: await writeSolution(await getConfiguredWorkspacePath(server), task, input.content),
      task,
    };
  });

  server.post('/api/tasks/:id/run', async (request) => {
    const params = idParamsSchema.parse(request.params);
    const task = server.codeSherpa.db.getTask(params.id);
    const startMs = Date.now();
    const result = await runTaskTests(await getConfiguredWorkspacePath(server), task);
    const durationMs = Date.now() - startMs;
    const updatedTask = server.codeSherpa.db.recordTaskRun(params.id, result.passed);
    const run = server.codeSherpa.db.createTestRun({
      command: `python3 ${task.testPath ?? ''}`,
      durationMs,
      exitCode: result.exitCode,
      output: result.output,
      passed: result.passed,
      taskId: params.id,
    });

    return {
      result,
      run,
      task: updatedTask,
    };
  });

  server.get('/api/tasks/:id/runs', async (request) => {
    const params = idParamsSchema.parse(request.params);
    server.codeSherpa.db.getTask(params.id);

    return {
      runs: server.codeSherpa.db.listTestRuns(params.id),
    };
  });

  server.post('/api/tasks/:id/commit', async (request) => {
    const params = idParamsSchema.parse(request.params);
    const input = commitTaskSchema.parse(request.body);
    const task = server.codeSherpa.db.getTask(params.id);
    const message = input.message ?? `feat(${task.slug}): solve ${task.title}`;
    const result = await commitTask(await getConfiguredWorkspacePath(server), task, message);
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
    const agent = await createConfiguredAgentService(server);
    const answer = await answerTaskChatWithAgent({
      message: input.message,
      service: agent.service,
      setup: agent.setup,
      task,
    });
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

  server.get('/api/chat-threads', async (request) => {
    const query = threadScopeQuerySchema.parse(request.query);
    const thread = server.codeSherpa.db.findOrCreateChatThread(query.scopeType, query.scopeId);

    return { thread };
  });

  server.get('/api/chat-threads/:id/messages', async (request) => {
    const params = idParamsSchema.parse(request.params);

    return { messages: server.codeSherpa.db.listThreadMessages(params.id) };
  });

  server.post('/api/chat-threads/:id/messages', async (request, reply) => {
    const params = idParamsSchema.parse(request.params);
    const input = chatRequestSchema.parse(request.body);
    const userMessage = server.codeSherpa.db.addThreadMessage({
      contentMd: input.message,
      role: 'user',
      threadId: params.id,
    });

    return reply.status(201).send({ message: userMessage });
  });

  server.get('/api/visualizations/:id', async (request) => {
    const params = idParamsSchema.parse(request.params);
    return server.codeSherpa.db.getVisualization(params.id);
  });
}
