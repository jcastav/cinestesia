import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/v1/health", async () => ({ status: "ok" }));

const port = Number(process.env.PORT ?? 3001);

app
  .listen({ port, host: "0.0.0.0" })
  .catch((error: unknown) => {
    app.log.error(error);
    process.exit(1);
  });
