const chokidar = require('chokidar');
const fs = require('fs');
const { execFile } = require('child_process');

// Best-effort Windows firewall block for an attacker IP. No-ops on non-Windows.
function blockIpWindows(ip) {
  return new Promise((resolve) => {
    try {
      if (process.platform !== 'win32') return resolve();
      const base = ['advfirewall','firewall','add','rule'];
      const nameIn = `CyberSentry-Block-${ip}-in`;
      const nameOut = `CyberSentry-Block-${ip}-out`;
      const argsIn = [...base, `name=${nameIn}`, 'dir=in', 'action=block', `remoteip=${ip}`];
      const argsOut = [...base, `name=${nameOut}`, 'dir=out', 'action=block', `remoteip=${ip}`];
      execFile('netsh', argsIn, { windowsHide: true }, () => {
        execFile('netsh', argsOut, { windowsHide: true }, () => resolve());
      });
    } catch (_) { resolve(); }
  });
}

// Feature toggles to safely disable recent additions
const ENABLE_CONTAINMENT = String(process.env.ENABLE_CONTAINMENT || 'false').toLowerCase() === 'true';
const ENABLE_HEURISTICS = String(process.env.ENABLE_HEURISTICS || 'false').toLowerCase() === 'true';

// Simple per-source IP scoring state (in-memory)
const ipState = new Map(); // ip -> { confidence: number, lastAt: number, lastFailAt?: number }

function decayAndBump(ip, baseDelta, cap) {
  if (!ENABLE_HEURISTICS) return undefined;
  const now = Date.now();
  const st = ipState.get(ip) || { confidence: 0, lastAt: now };
  const elapsed = now - (st.lastAt || now);
  const decaySteps = Math.floor(elapsed / (10 * 60 * 1000));
  if (decaySteps > 0) st.confidence = Math.max(0, st.confidence - decaySteps * 10);
  st.confidence = Math.min(cap, st.confidence + baseDelta);
  st.lastAt = now;
  ipState.set(ip, st);
  return st.confidence;
}

class HoneypotMonitor {
	constructor(logPath, io, honeypotId = 'honeypot-1') {
		this.logPath = logPath;
		this.io = io;
		this.honeypotId = honeypotId;
		this.lastSize = 0;
	}

	start() {
		const watcher = chokidar.watch(this.logPath, {
			ignoreInitial: true,
			awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
			persistent: true,
		});
		watcher.on('change', (path) => this.handleLogChange(path));
		try {
			const stats = fs.statSync(this.logPath);
			this.lastSize = stats.size;
		} catch (_) {}
		console.log(`Monitoring honeypot logs at: ${this.logPath}`);
	}

	handleLogChange(filePath) {
		const stats = fs.statSync(filePath);
		if (stats.size > this.lastSize) {
			const newData = this.readNewData(filePath, this.lastSize, stats.size);
			this.processLogEntries(newData);
			this.lastSize = stats.size;
		}
	}

	readNewData(filePath, start, end) {
		const buffer = Buffer.alloc(end - start);
		const fd = fs.openSync(filePath, 'r');
		fs.readSync(fd, buffer, 0, buffer.length, start);
		fs.closeSync(fd);
		return buffer.toString('utf8');
	}

	processLogEntries(data) {
		data.split('\n').forEach(line => {
			if (!line.trim()) return;
			try {
				const event = JSON.parse(line);
				this.analyzeEvent(event);
			} catch (_) {}
		});
	}

	analyzeEvent(event) {
			switch (event.eventid) {
			case 'cowrie.session.connect':
					console.log(`[HP:${this.honeypotId}] connect from`, event.src_ip);
				this.io.emit('attack:start', {
					src_ip: event.src_ip,
					timestamp: event.timestamp,
					honeypotId: this.honeypotId
				});
					this.io.emit('alert:new', { text: `Connection from ${event.src_ip} → ${this.honeypotId}`, level: 'info' });
					// Draw an attack line from attacker to the specific honeypot being accessed
					this.io.emit('graph:command', { action: 'draw-line', from: 'attacker', to: this.honeypotId, color: 'hsl(var(--cyber-danger))' });
					// Live terminal notification (use fields expected by frontend)
					this.io.emit('terminal:live', { output: `ssh connection from ${event.src_ip} → ${this.honeypotId}` });
					// Threat intel: record source IP immediately
					this.io.emit('threat-intel:update', { property: 'sourceIp', value: event.src_ip });
                    // Heuristic: initial confidence floor 20 on first contact
                    const c1 = decayAndBump(event.src_ip, 20, 95);
                    if (c1 !== undefined) this.io.emit('threat-intel:update', { property: 'confidence', value: c1 });
				break;
				case 'cowrie.login.failed':
					console.log(`[HP:${this.honeypotId}] login failed`, event.src_ip, event.username);
					// Reflect failed logins as alerts and graph pulses
					this.io.emit('alert:new', {
						text: `Failed SSH login from ${event.src_ip} as ${event.username || 'unknown'}`,
						level: 'warning'
					});
					this.io.emit('graph:command', { action: 'pulse-node', id: this.honeypotId });
					// Mark a single shared attacker node; update its name to latest src_ip
					this.io.emit('graph:command', { action: 'add-node', id: 'attacker', name: event.src_ip, type: 'attacker' });
					// Keep visual line while the attacker is attempting; then sever shortly after
					this.io.emit('graph:command', { action: 'draw-line', from: 'attacker', to: this.honeypotId, color: '#ff3e3e' });
					setTimeout(() => this.io.emit('graph:command', { action: 'connection-severed', from: 'attacker', to: this.honeypotId }), 2000);
					// Live terminal permission denied line
					this.io.emit('terminal:live', { output: `Permission denied for ${event.username || 'unknown'} from ${event.src_ip}` });
					// If cowrie provided the attempted password, display it
					if (event.password) {
						this.io.emit('terminal:live', { output: `Attempted credential → ${event.username || 'unknown'} / '${event.password}'` });
					}
					// Threat intel: mark tactic and raise confidence slightly on repeated failures
					this.io.emit('threat-intel:update', { property: 'tactic', value: 'T1110 - SSH Brute Force' });
                    // Heuristic: +10 per failure (cap 70); if rapid (≤5s since last), add +15 extra
                    if (ENABLE_HEURISTICS) {
                      const now = Date.now();
                      const st = ipState.get(event.src_ip) || { lastFailAt: 0 };
                      const rapid = now - (st.lastFailAt || 0) <= 5000;
                      let bump = 10 + (rapid ? 15 : 0);
                      const c2 = decayAndBump(event.src_ip, bump, 70);
                      st.lastFailAt = now; ipState.set(event.src_ip, { ...(ipState.get(event.src_ip)||{}), ...st, lastAt: now, confidence: c2 });
                      if (c2 !== undefined) this.io.emit('threat-intel:update', { property: 'confidence', value: c2 });
                    }
					break;
			case 'cowrie.login.success':
					console.log(`[HP:${this.honeypotId}] login success`, event.src_ip, event.username);
				this.io.emit('attack:login', {
					src_ip: event.src_ip,
					username: event.username,
					timestamp: event.timestamp,
					honeypotId: this.honeypotId
				});
				// Immediately trigger containment to block the attacker
				this.io.emit('alert:new', {
					text: `CRITICAL: Attacker ${event.src_ip} contained upon login to ${this.honeypotId}`,
					level: 'critical'
				});
				// Inform threat intel panel
				this.io.emit('threat-intel:update', { status: 'Contained', sourceIp: event.src_ip });
                    // Heuristic: jump confidence to 95 on success
                    const c3 = decayAndBump(event.src_ip, 95, 95);
                    if (c3 !== undefined) this.io.emit('threat-intel:update', { property: 'confidence', value: c3 });
				// Mark attacker contained and sever connection to the honeypot
				this.io.emit('graph:command', { action: 'contain-attacker', nodeId: 'attacker' });
				this.io.emit('graph:command', { action: 'connection-severed', from: 'attacker', to: this.honeypotId });
				// Send terminal message to dashboard
				this.io.emit('terminal:live', { input: null, output: null, error: 'Session terminated by defense. Access contained.' });
				// Optional: actively block attacker IP at OS firewall (Windows only)
				if (String(process.env.ENABLE_ACTIVE_BLOCK || 'false').toLowerCase() === 'true') {
					blockIpWindows(event.src_ip).catch(() => {});
					this.io.emit('alert:new', { text: `Active block applied to ${event.src_ip}`, level: 'success' });
				}
				break;
			case 'cowrie.command.input':
				this.io.emit('attack:command', {
					src_ip: event.src_ip,
					command: event.input,
					timestamp: event.timestamp,
					honeypotId: this.honeypotId
				});
				// Stream the attacker's typed command to the live terminal
				this.io.emit('terminal:live', { input: event.input });
				// Reinforce that the attacker is contained
				this.io.emit('alert:new', { text: `Blocked command from ${event.src_ip}: ${event.input}`, level: 'warning' });
				// Threat intel: technique inference for reconnaissance
				if (typeof event.input === 'string') {
					const cmd = event.input.toLowerCase();
					if (/(nmap|masscan)/.test(cmd)) this.io.emit('threat-intel:update', { property: 'technique', value: 'Discovery/Network Scanning' });
					else if (/(wget|curl|ftp|http)/.test(cmd)) this.io.emit('threat-intel:update', { property: 'technique', value: 'Command and Control' });
                    // Heuristic: +10 on suspicious commands (cap 90)
                    if (ENABLE_HEURISTICS && /(nmap|masscan|wget|curl|ftp|http)/.test(cmd)) {
                      const c4 = decayAndBump(event.src_ip, 10, 90);
                      if (c4 !== undefined) this.io.emit('threat-intel:update', { property: 'confidence', value: c4 });
                    }
                    // Containment trigger: accessing password files (guarded by flag)
                    if (ENABLE_CONTAINMENT && /(cat\s+.*\/etc\/passwd|cat\s+.*passwords?\.txt)/.test(cmd)) {
						this.io.emit('alert:new', { text: `CRITICAL: Sensitive file access attempt by ${event.src_ip}. Containing attacker.`, level: 'critical' });
						this.io.emit('graph:command', { action: 'contain-attacker', nodeId: 'attacker' });
						this.io.emit('graph:command', { action: 'connection-severed', from: 'attacker', to: this.honeypotId });
						this.io.emit('terminal:live', { output: 'Session terminated by defense due to sensitive file access.' });
						// Optional host-level block
						if (String(process.env.ENABLE_ACTIVE_BLOCK || 'false').toLowerCase() === 'true') {
							blockIpWindows(event.src_ip).catch(() => {});
							this.io.emit('alert:new', { text: `Active block applied to ${event.src_ip}`, level: 'success' });
						}
					}
				}
				break;
		}
	}
}

module.exports = HoneypotMonitor;


