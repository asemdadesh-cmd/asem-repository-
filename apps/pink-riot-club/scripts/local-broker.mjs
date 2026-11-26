// Local stand-ins for the public MQTT relays (dev + e2e tests).
// Two independent brokers so failover between relays can be tested.
import { Aedes } from 'aedes';
import { WebSocketServer, createWebSocketStream } from 'ws';

export async function startBroker(port) {
  const aedes = await Aedes.createBroker();
  const wss = new WebSocketServer({ port });
  wss.on('connection', (ws, req) => aedes.handle(createWebSocketStream(ws), req));
  await new Promise((resolve, reject) => {
    wss.once('listening', resolve);
    wss.once('error', (e) => {
      aedes.close();
      reject(e);
    });
  });
  return {
    port,
    async close() {
      for (const c of wss.clients) c.terminate();
      await new Promise((r) => wss.close(r));
      await new Promise((r) => aedes.close(r));
    },
  };
}

export async function startBrokers(ports = [8884, 8885]) {
  return Promise.all(ports.map(startBroker));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ports = (process.argv[2] ?? '8884,8885').split(',').map(Number);
  await startBrokers(ports);
  console.log('[broker] listening on', ports.map((p) => `ws://localhost:${p}`).join(' '));
}
