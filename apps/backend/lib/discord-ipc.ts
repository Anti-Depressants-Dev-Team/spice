import net from 'net';
import path from 'path';

export interface DiscordActivity {
  state?: string;
  details?: string;
  timestamps?: {
    start?: number;
    end?: number;
  };
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
  buttons?: Array<{
    label: string;
    url: string;
  }>;
}

function getIpcPaths(): string[] {
  const paths: string[] = [];
  if (process.platform === 'win32') {
    for (let i = 0; i < 10; i++) {
      paths.push(`\\\\?\\pipe\\discord-ipc-${i}`);
      paths.push(`\\\\.\\pipe\\discord-ipc-${i}`);
    }
  } else {
    const envs = [
      process.env.XDG_RUNTIME_DIR,
      process.env.TMPDIR,
      process.env.TMP,
      process.env.TEMP,
      '/tmp'
    ];
    for (const dir of envs) {
      if (!dir) continue;
      for (let i = 0; i < 10; i++) {
        paths.push(path.join(dir, `discord-ipc-${i}`));
      }
    }
  }
  return paths;
}

export class DiscordIpcClient {
  private clientId: string;
  private socket: net.Socket | null = null;
  private isHandshakeComplete = false;
  private isConnecting = false;
  private pendingActivity: DiscordActivity | null = null;
  private buffer = Buffer.alloc(0);

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  public async connect(): Promise<void> {
    if (this.socket || this.isConnecting) return;
    this.isConnecting = true;
    this.isHandshakeComplete = false;
    this.buffer = Buffer.alloc(0);

    const paths = getIpcPaths();
    for (const ipcPath of paths) {
      try {
        await new Promise<void>((resolve, reject) => {
          const socket = net.createConnection(ipcPath);
          let connected = false;

          socket.on('connect', () => {
            connected = true;
            this.socket = socket;
            this.setupSocketHandlers();
            // Send handshake
            this.send(0, { v: 1, client_id: this.clientId });
            resolve();
          });

          socket.on('error', (err) => {
            if (!connected) {
              socket.destroy();
              reject(err);
            }
          });

          // 500ms timeout per pipe to quickly scan for the active one
          setTimeout(() => {
            if (!connected) {
              socket.destroy();
              reject(new Error('Connection timeout'));
            }
          }, 500);
        });

        // Break if connection succeeded
        break;
      } catch {
        // Suppress and try next path
      }
    }

    this.isConnecting = false;
  }

  private setupSocketHandlers() {
    if (!this.socket) return;

    this.socket.on('data', (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      while (this.buffer.length >= 8) {
        const opcode = this.buffer.readUInt32LE(0);
        const length = this.buffer.readUInt32LE(4);
        if (this.buffer.length >= 8 + length) {
          const payloadStr = this.buffer.toString('utf8', 8, 8 + length);
          this.buffer = this.buffer.subarray(8 + length);

          try {
            const payload = JSON.parse(payloadStr);
            this.handleFrame(opcode, payload);
          } catch (err) {
            console.error('[Discord RPC] Failed to parse payload:', err);
          }
        } else {
          break;
        }
      }
    });

    this.socket.on('close', () => {
      this.cleanup();
    });

    this.socket.on('error', (err) => {
      console.error('[Discord RPC] Socket error:', err);
      this.cleanup();
    });
  }

  private handleFrame(opcode: number, payload: Record<string, unknown>) {
    if (opcode === 1 && payload.evt === 'READY') {
      this.isHandshakeComplete = true;
      console.log('[Discord RPC] Handshake complete. Connected to Discord client.');
      if (this.pendingActivity !== null) {
        const act = this.pendingActivity;
        this.pendingActivity = null;
        void this.setActivity(act);
      }
    }
  }

  public async setActivity(activity: DiscordActivity | null): Promise<void> {
    if (!this.socket || !this.isHandshakeComplete) {
      this.pendingActivity = activity;
      await this.connect();
      return;
    }

    const nonce = Math.random().toString(36).substring(2);
    const payload = {
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity: activity,
      },
      nonce,
    };

    this.send(1, payload);
  }

  private send(opcode: number, payload: object) {
    if (!this.socket) return;
    const payloadStr = JSON.stringify(payload);
    const payloadBuffer = Buffer.from(payloadStr, 'utf8');
    const header = Buffer.alloc(8);
    header.writeUInt32LE(opcode, 0);
    header.writeUInt32LE(payloadBuffer.length, 4);
    this.socket.write(Buffer.concat([header, payloadBuffer]));
  }

  private cleanup() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.isHandshakeComplete = false;
    this.buffer = Buffer.alloc(0);
  }
}

const GLOBAL_DISCORD_KEY = Symbol.for('spice.discordRpc');

let discordRpcClient: DiscordIpcClient;
if (typeof window === 'undefined') {
  const globalAny = globalThis as unknown as { [key: symbol]: DiscordIpcClient };
  if (!globalAny[GLOBAL_DISCORD_KEY]) {
    const clientId = process.env.DISCORD_CLIENT_ID || '1255288277259161600';
    globalAny[GLOBAL_DISCORD_KEY] = new DiscordIpcClient(clientId);
  }
  discordRpcClient = globalAny[GLOBAL_DISCORD_KEY];
} else {
  discordRpcClient = new DiscordIpcClient('1255288277259161600');
}

export default discordRpcClient;
