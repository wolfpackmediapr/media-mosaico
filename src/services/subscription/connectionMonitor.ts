
import { ConnectionStatus } from "./types";

export class ConnectionMonitor {
  private _connectionStatus: ConnectionStatus = 'DISCONNECTED';
  private _connectionListeners: Set<(status: string) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupConnectionMonitoring();
    }
  }

  private setupConnectionMonitoring(): void {
    setInterval(() => {
      const status = this.getCurrentStatus();
      if (status !== this._connectionStatus) {
        this._connectionStatus = status;
        this.notifyListeners();
      }
    }, 10000);
  }

  private notifyListeners(): void {
    this._connectionListeners.forEach(listener => {
      try {
        listener(this._connectionStatus);
      } catch (error) {
        console.error('Error in subscription connection listener:', error);
      }
    });
  }

  getCurrentStatus(): ConnectionStatus {
    return this._connectionStatus;
  }

  setStatus(status: ConnectionStatus) {
    if (status !== this._connectionStatus) {
      this._connectionStatus = status;
      this.notifyListeners();
    }
  }

  addListener(listener: (status: string) => void): () => void {
    this._connectionListeners.add(listener);
    return () => this._connectionListeners.delete(listener);
  }
}

export const connectionMonitor = new ConnectionMonitor();
