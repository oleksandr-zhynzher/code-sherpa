import { buildServer } from './server.js';

const host = process.env['HOST'] ?? '127.0.0.1';
const port = Number.parseInt(process.env['PORT'] ?? '8000', 10);

const server = buildServer();

try {
  await server.listen({ host, port });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
