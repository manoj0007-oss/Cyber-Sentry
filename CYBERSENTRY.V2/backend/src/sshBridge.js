const NodeSSH = require('node-ssh');

class SSHBridge {
	constructor() {
		this.ssh = new NodeSSH();
		this.isConnected = false;
		this.sessions = new Map();
		this.connectionAttempts = 0;
		this.maxRetries = 3;
	}

	async connectToDecoy(decoyConfig = {
		host: process.env.DECOY_HOST || 'localhost',
		port: parseInt(process.env.DECOY_PORT) || 2222,
		username: process.env.DECOY_USERNAME || 'admin',
		password: process.env.DECOY_PASSWORD || 'password123'
	}) {
		this.connectionAttempts++;
		
		try {
			// Validate configuration
			if (!decoyConfig.host || !decoyConfig.port || !decoyConfig.username) {
				throw new Error('Invalid SSH configuration: host, port, and username are required');
			}
			
			console.log(`🔗 Attempting SSH connection to ${decoyConfig.host}:${decoyConfig.port} (attempt ${this.connectionAttempts})`);
			
			await this.ssh.connect({
				...decoyConfig,
				tryKeyboard: true,
				readyTimeout: 10000
			});
			
			this.isConnected = true;
			this.connectionAttempts = 0; // Reset on success
			console.log('✅ SSH connection established');
			return true;
		} catch (error) {
			console.error(`❌ SSH connection failed (attempt ${this.connectionAttempts}):`, error.message);
			this.isConnected = false;
			
			if (this.connectionAttempts < this.maxRetries) {
				console.log(`🔄 Retrying SSH connection in 2 seconds...`);
				await new Promise(resolve => setTimeout(resolve, 2000));
				return this.connectToDecoy(decoyConfig);
			}
			
			return false;
		}
	}

	async executeLiveCommand(command, sessionId, io) {
		if (!this.isConnected) {
			console.log('🔄 SSH not connected, attempting to connect...');
			const connected = await this.connectToDecoy();
			if (!connected) {
				throw new Error('Cannot establish SSH connection to decoy');
			}
		}

		try {
			console.log(`🖥️  Executing command: ${command}`);
			const result = await this.ssh.execCommand(command, {
				execOptions: { pty: false },
				stream: 'both'
			});
			
			const eventData = {
				type: 'command',
				sessionId: sessionId,
				input: command,
				output: result.stdout || '',
				error: result.stderr || '',
				code: result.code || 0,
				timestamp: new Date().toISOString()
			};
			
			io.emit('terminal:live', eventData);
			console.log(`✅ Command executed successfully (exit code: ${result.code})`);
			
			return result;
		} catch (error) {
			console.error('❌ Command execution failed:', error.message);
			this.isConnected = false; // Mark as disconnected on error
			
			const errorEvent = {
				type: 'error',
				sessionId: sessionId,
				input: command,
				output: '',
				error: error.message,
				timestamp: new Date().toISOString()
			};
			
			io.emit('terminal:live', errorEvent);
			throw error;
		}
	}
	
	// Graceful disconnect
	async disconnect() {
		if (this.isConnected && this.ssh) {
			try {
				this.ssh.dispose();
				this.isConnected = false;
				console.log('🔌 SSH connection closed');
			} catch (error) {
				console.error('Error closing SSH connection:', error.message);
			}
		}
	}
}

module.exports = SSHBridge;
