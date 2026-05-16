import { describe, expect, it } from 'vitest';

import { buildServer } from './server.js';

describe('api health endpoint', () => {
  it('returns the service health status', async () => {
    const server = buildServer();

    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      service: 'code-sherpa-api',
      status: 'ok',
    });
  });
});
