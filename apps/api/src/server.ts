import Fastify from 'fastify';

const server = Fastify({
  logger: true,
});

server.get('/health', async () => ({ status: 'ok' }));

const start = async (): Promise<void> => {
  try {
    await server.listen({ host: '0.0.0.0', port: 3000 });
  } catch (error) {
    server.log.error(error);
    process.exitCode = 1;
  }
};

void start();
