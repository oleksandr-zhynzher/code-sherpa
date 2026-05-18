import { buildServer } from './server.js';

const host = process.env['HOST'] ?? '127.0.0.1';
const port = Number.parseInt(process.env['PORT'] ?? '8000', 10);

const server = await buildServer();

const shutdown = async (signal: string) => {
  server.log.info({ signal }, 'Shutdown signal received');
  await server.close();
  process.exit(0);
};

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

try {
  await server.listen({ host, port });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
