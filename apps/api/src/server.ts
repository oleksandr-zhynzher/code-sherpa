import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import type { CliProcessRunner } from './agent/cli-driver.js';
import { registerRoutes } from './routes.js';
import { type CodeSherpaDatabase, createDatabase } from './storage/database.js';

export type ServerOptions = Readonly<{
  agentProcessRunner?: CliProcessRunner | undefined;
  dbPath?: string;
  logger?: boolean;
  workspacePath?: string;
}>;

declare module 'fastify' {
  interface FastifyInstance {
    codeSherpa: Readonly<{
      agentProcessRunner?: CliProcessRunner | undefined;
      db: CodeSherpaDatabase;
      workspacePath: string;
    }>;
  }
}

export async function buildServer(options: ServerOptions = {}): Promise<FastifyInstance> {
  const server = Fastify({
    logger: options.logger ?? true,
  });
  const db = createDatabase(options.dbPath ?? './code-sherpa.db');

  server.decorate('codeSherpa', {
    agentProcessRunner: options.agentProcessRunner,
    db,
    workspacePath: options.workspacePath ?? './workspace',
  });

  server.addHook('onClose', async () => {
    db.close();
  });

  await server.register(cors, {
    origin: ['http://127.0.0.1:3000', 'http://localhost:3000'],
  });

  server.get('/health', async () => ({
    service: 'code-sherpa-api',
    status: 'ok',
  }));

  registerRoutes(server);

  return server;
}
