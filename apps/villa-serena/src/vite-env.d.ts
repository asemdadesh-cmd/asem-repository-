/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** comma-separated MQTT-over-WebSocket relay URLs (defaults to two public brokers) */
  readonly VITE_BROKERS?: string;
}
