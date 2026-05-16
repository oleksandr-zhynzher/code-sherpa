import Fastify, { type FastifyInstance } from 'fastify';

export function buildServer(): FastifyInstance {
  const server = Fastify({
    logger: true,
  });

  server.get('/health', async () => ({
    service: 'code-sherpa-api',
    status: 'ok',
  }));

  return server;
}
