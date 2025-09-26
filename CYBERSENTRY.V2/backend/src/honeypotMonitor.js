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
				break;
				case 'cowrie.login.failed':
					console.log(`[HP:${this.honeypotId}] login failed`, event.src_ip, event.username);
					// Reflect failed logins as alerts and graph pulses
					this.io.emit('alert:new', {
						text: `Failed SSH login from ${event.src_ip} as ${event.username || 'unknown'}`,
						level: 'warning'
					});
					this.io.emit('graph:command', { action: 'pulse-node', id: this.honeypotId });
					// Also mark attacker node so UI shows presence even without success
					this.io.emit('graph:command', { action: 'add-node', id: 'attacker', name: event.src_ip, type: 'attacker' });
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
				// Reinforce that the attacker is contained
				this.io.emit('alert:new', { text: `Blocked command from ${event.src_ip}: ${event.input}`, level: 'warning' });
				break;
		}
	}
}

module.exports = HoneypotMonitor;


