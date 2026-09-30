import type { FastifyInstance } from 'fastify';

export const registerHealthRoute = async (
  app: FastifyInstance,
  options: { readinessCheck?: () => Promise<void> } = {},
): Promise<void> => {
  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async (_request, reply) => {
    try {
      await options.readinessCheck?.();
      return { status: 'ready' };
    } catch {
      return reply.status(503).send({
        status: 'not_ready',
        error: { code: 'DEPENDENCY_UNAVAILABLE', message: 'Required dependencies are unavailable.' },
      });
    }
  });
};
