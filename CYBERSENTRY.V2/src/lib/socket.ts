import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;

  private makeUrl(): string {
    const envUrl = (import.meta as any)?.env?.VITE_BACKEND_URL as string | undefined;
    if (envUrl) return envUrl;
    // Connect directly to backend service on 3001 to avoid proxy issues
    const isHttps = false; // backend is http/ws on 3001
    const wsProto = isHttps ? 'wss' : 'ws';
    const host = location.hostname;
    return `${wsProto}://${host}:3001`;
  }

  private restBase(): string {
    const envUrl = (import.meta as any)?.env?.VITE_BACKEND_URL as string | undefined;
    if (envUrl) return envUrl.replace(/^ws/, 'http').replace(/^wss/, 'https');
    // Direct to backend API on 3001
    return `http://${location.hostname}:3001`;
  }

  connect() {
    if (!this.socket) {
      // Connect directly to backend first
      const options = { autoConnect: true, path: '/socket.io', transports: ['websocket','polling'], withCredentials: false } as const;
      const tryDirectBackend = () => io(this.makeUrl(), options);
      const trySameOrigin = () => io(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`, options);
      let socket = tryDirectBackend();

      socket.on('connect', () => {
        console.log('🔌 Connected to CyberSentry Command Center');
      });

      socket.on('disconnect', () => {
        console.log('🔌 Disconnected from Command Center');
      });

      // Backend-conducted synchronized events
      socket.on('terminal:data', (data: any) => {
        if ((window as any).handleTerminalEvent) {
          (window as any).handleTerminalEvent(data);
        }
      });
      socket.on('graph:command', (data: any) => {
        if ((window as any).handleGraphEvent) {
          (window as any).handleGraphEvent(data);
        }
      });
      socket.on('alert:new', (data: any) => {
        if ((window as any).handleAlertEvent) {
          (window as any).handleAlertEvent(data);
        }
      });
      socket.on('network:update', (data: any) => {
        if ((window as any).handleNetworkUpdate) {
          (window as any).handleNetworkUpdate(data);
        }
      });
      socket.on('simulation:status', (isRunning: boolean) => {
        if ((window as any).handleSimulationStatus) {
          (window as any).handleSimulationStatus(isRunning);
        }
      });
      socket.on('threat-intel:update', (data: any) => {
        const w = window as any;
        if (w.handleThreatIntelUpdate) {
          w.handleThreatIntelUpdate(data);
        } else {
          w.__threatIntelBuffer = w.__threatIntelBuffer || [];
          w.__threatIntelBuffer.push(data);
        }
      });

      // Live honeypot events
      socket.on('attack:start', (data: any) => {
        const w = window as any;
        w.__attackStarted = true;
        if (w.handleAttackStart) {
          w.handleAttackStart(data);
        } else {
          // Fallback: basic alert
          if (w.handleAlertEvent) w.handleAlertEvent({ text: `Connection from ${data.src_ip}`, level: 'info' });
          // Add/mark attacker node
          if (w.handleGraphEvent) w.handleGraphEvent({ action: 'add-node', id: 'attacker', name: data.src_ip, type: 'attacker' });
          // Pulse honeypot target if known
          const targetId = data.honeypotId || w.__realDecoyId || (w.__firstDecoyId);
          if (w.handleGraphEvent && targetId) w.handleGraphEvent({ action: 'pulse-node', id: targetId });
        }
      });
      socket.on('attack:login', (data: any) => {
        const w = window as any;
        if (w.handleAttackLogin) {
          w.handleAttackLogin(data);
        } else {
          if (w.handleAlertEvent) w.handleAlertEvent({ text: `Login success by ${data.src_ip} as ${data.username}`, level: 'warning' });
          const targetId = data.honeypotId || w.__realDecoyId || (w.__firstDecoyId);
          if (w.handleGraphEvent && targetId) w.handleGraphEvent({ action: 'establish-connection', from: 'attacker', to: targetId });
        }
      });
      socket.on('attack:command', (data: any) => {
        const w = window as any;
        if (w.handleAttackCommand) {
          w.handleAttackCommand(data);
        } else {
          if (w.handleAlertEvent) w.handleAlertEvent({ text: `Command from ${data.src_ip}: ${data.command}`, level: 'info' });
          const targetId = data.honeypotId || w.__realDecoyId || (w.__firstDecoyId);
          if (w.handleGraphEvent && targetId) w.handleGraphEvent({ action: 'data-probe', id: targetId });
        }
      });
      socket.on('terminal:live', (data: any) => {
        const w = window as any;
        // Feed into existing terminal handler as output lines
        if (w.handleTerminalEvent) {
          if (data.input) w.handleTerminalEvent({ type: 'command', text: data.input });
          if (data.output) w.handleTerminalEvent({ type: 'output', text: data.output });
          if (data.error) w.handleTerminalEvent({ type: 'output', text: data.error });
        }
      });

      // If cannot connect in time, switch to port 3002 automatically
      const fallbackTimer = setTimeout(() => {
        if (!socket.connected) {
          try { socket.close(); } catch {}
          socket = trySameOrigin();
        }
      }, 1500);

      socket.on('connect', () => clearTimeout(fallbackTimer));

      this.socket = socket;
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket || this.connect();
  }

  async startSimulation(): Promise<void> {
    try {
      // Use same-origin REST via Nginx proxy
      let res = await fetch(this.restBase() + '/api/simulation/start', { method: 'POST' });
      if (!res.ok) throw new Error('backend responded non-OK');
    } catch (err) {
      // Fallback: rich local synchronized script so UI is not blank
      const steps = [
        { delay: 500, terminal: { type: 'output', text: 'Initializing...' }, graph: { action: 'add-node', id: 'attacker', name: 'ATTACKER', type: 'attacker' } },
        { delay: 800, terminal: { type: 'command', text: 'nmap -sS 192.168.1.0/24' }, graph: { action: 'pulse-node', id: 'attacker' } },
        { delay: 900, terminal: { type: 'output', text: '-> Target identified: 192.168.1.15' }, graph: { action: 'highlight-node', id: 'decoy-1' }, threatIntel: { property: 'sourceIp', value: '185.243.115.105' } },
        { delay: 900, terminal: { type: 'command', text: 'ssh admin@192.168.1.15' }, graph: { action: 'draw-line', from: 'attacker', to: 'decoy-1', color: '#ff3e3e' } },
        { delay: 700, terminal: { type: 'output', text: '-> Login successful.' }, graph: { action: 'compromise-node', id: 'decoy-1' }, threatIntel: { property: 'tactic', value: 'T1110 - SSH Brute-Force' } },
        { delay: 1000, terminal: { type: 'command', text: 'whoami && hostname' }, graph: { action: 'data-probe', id: 'decoy-1' } },
        { delay: 700, terminal: { type: 'output', text: 'admin\nhr-files-01' }, threatIntel: { property: 'suspectedGroup', value: 'APT28 (Fancy Bear)', confidence: 85 } },
        { delay: 900, terminal: { type: 'command', text: 'cat /home/admin/passwords.txt' }, graph: { action: 'attack-intensify', from: 'attacker', to: 'decoy-1' } },
        { delay: 1200, terminal: { type: 'output', text: '=== EMPLOYEE CREDENTIALS ===\nadmin:password123\njdoe:Winter2023!' } , graph: { action: 'critical-data-exposed', id: 'decoy-1' }, alert: { text: 'CRITICAL: Sensitive data accessed on decoy!', level: 'critical' } },
        { delay: 1500, terminal: { type: 'alert', text: '🚨 Deception Network Engaged' }, graph: { action: 'decoy-revealed', id: 'decoy-1' }, threatIntel: { property: 'status', value: 'Contained' } },
        { delay: 900, terminal: { type: 'output', text: 'Connection reset by peer' }, graph: { action: 'connection-severed', from: 'attacker', to: 'decoy-1' } },
        { delay: 1000, terminal: { type: 'alert', text: '🛡️ ATTACKER CONTAINED IN CONTROLLED ENVIRONMENT' }, graph: { action: 'full-containment', id: 'attacker' }, alert: { text: 'SUCCESS: Attacker contained. No real assets compromised.', level: 'success' } },
      ];
      let total = 0;
      steps.forEach(step => {
        total += step.delay;
        setTimeout(() => {
          if ((window as any).handleTerminalEvent && step.terminal) (window as any).handleTerminalEvent(step.terminal);
          if ((window as any).handleGraphEvent && step.graph) (window as any).handleGraphEvent(step.graph);
          if ((window as any).handleAlertEvent && step.alert) (window as any).handleAlertEvent(step.alert);
          if ((window as any).handleThreatIntelUpdate && step.threatIntel) (window as any).handleThreatIntelUpdate(step.threatIntel);
        }, total);
      });
    }
  }
}

export const socketManager = new SocketManager();