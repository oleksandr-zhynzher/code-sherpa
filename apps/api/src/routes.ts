import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { createPlanSchema, setupSchema } from './http/contracts.js';
import { errorResponse, NotFoundError, validationErrorResponse } from './http/errors.js';

export function registerRoutes(server: FastifyInstance): void {
  server.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(422).send(validationErrorResponse(error));
    }

    if (error instanceof NotFoundError) {
      return reply.status(404).send(errorResponse('NOT_FOUND', error.message));
    }

    server.log.error(error);
    return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'Unexpected server error'));
  });

  server.get('/api/setup', async () =>
    server.codeSherpa.db.getSetup(server.codeSherpa.workspacePath),
  );

  server.post('/api/setup', async (request, reply) => {
    const input = setupSchema.parse(request.body);
    const setup = server.codeSherpa.db.saveSetup({
      claudePath: input.claudePath,
      repoUrl: input.repoUrl,
      workspacePath: server.codeSherpa.workspacePath,
    });

    return reply.status(200).send(setup);
  });

  server.get('/api/plans', async () => ({
    data: server.codeSherpa.db.listPlans(),
  }));

  server.post('/api/plans', async (request, reply) => {
    const input = createPlanSchema.parse(request.body);
    const plan = server.codeSherpa.db.createPlan(input.goal);

    return reply.status(201).send(plan);
  });

  server.get('/api/plans/:id', async (request) => {
    const params = request.params as Readonly<{ id: string }>;
    return server.codeSherpa.db.getPlan(params.id);
  });

  server.get('/api/tasks/:id', async (request) => {
    const params = request.params as Readonly<{ id: string }>;
    return server.codeSherpa.db.getTask(params.id);
  });
}
