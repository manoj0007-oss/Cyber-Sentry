const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
// Load environment variables from possible locations (nested repo layout)
(() => {
  try {
    const dotenv = require('dotenv');
    const candidates = [
      path.join(__dirname, '.env'), // backend/src/.env (unlikely)
      path.join(__dirname, '..', '.env'), // backend/.env
      path.join(__dirname, '..', '..', '.env'), // project inner root
      path.join(__dirname, '..', '..', '..', '.env'), // project outer root
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        dotenv.config({ path: p });
        break;
      }
    }
  } catch (_) {
    // dotenv not installed yet; will be installed via package.json
  }
})();

// Simulation engine disabled in live mode
const { startSimulation } = require('./utils/simulationEngine');
const SSHBridge = require('./sshBridge');
const HoneypotMonitor = require('./honeypotMonitor');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Lightweight JSON persistence (avoid ESM/CJS lowdb friction)
const dbPath = path.join(__dirname, '..', 'database.json');
let db = { decoys: [], isSimulating: false };

const app = express();
// CORS
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const server = http.createServer(app);
const io = new Server(server, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
  allowEIO3: true,
  cors: {
    origin: CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Optional additional routes
try {
  const extraRoutes = require('./routes/api');
  app.use('/api', extraRoutes);
} catch (_) {
  // routes are optional
}

// Database initialization and helpers
async function initDb() {
  try {
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf8');
      db = JSON.parse(raw || '{}');
    }
    db.decoys ||= [];
    db.isSimulating ||= false;
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

async function dbRead() {
  try {
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf8');
      db = JSON.parse(raw || '{}');
      db.decoys ||= [];
      db.isSimulating ||= false;
    }
  } catch (error) {
    console.warn('DB read warning:', error.message);
  }
}

async function dbWrite() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  } catch (error) {
    console.warn('DB write warning:', error.message);
  }
}

// Gemini API key resolution with fallback support
function readEnvExampleLine5() {
  try {
    const candidates = [
      path.join(__dirname, '.env.example'),
      path.join(__dirname, '..', '.env.example'),
      path.join(__dirname, '..', '..', '.env.example'),
      path.join(__dirname, '..', '..', '..', '.env.example'),
    ];
    for (const p of candidates) {
      if (!fs.existsSync(p)) continue;
      const content = fs.readFileSync(p, 'utf8').split(/\r?\n/);
      if (content.length >= 5) {
        const line = content[4].trim();
        // Expect formats like KEY=VALUE or just VALUE
        const idx = line.indexOf('=');
        const value = idx >= 0 ? line.slice(idx + 1).trim() : line;
        if (value && !/^#/.test(value)) return value;
      }
    }
  } catch (_) {}
  return undefined;
}

function resolveGeminiKeys() {
  const primary = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const secondary = process.env.SECONDARY_GEMINI_API_KEY || readEnvExampleLine5();
  return { primary, secondary };
}

// REST API Endpoints
app.get('/api/network', async (req, res) => {
  try {
    await dbRead();
    res.json(db);
  } catch (error) {
    console.error('Error reading network data:', error);
    res.status(500).json({ error: 'Failed to read network data' });
  }
});

app.post('/api/decoys', async (req, res) => {
  try {
    // Input validation
    const { name, type, target } = req.body;
    if (!name || !type || !target) {
      return res.status(400).json({ error: 'name, type, and target are required' });
    }

    await dbRead();
    const newDecoy = { 
      id: `decoy-${Date.now()}`, 
      name: String(name).trim(),
      type: String(type).trim(),
      target: String(target).trim(),
      status: 'normal',
      ...req.body 
    };
    db.decoys.push(newDecoy);
    await dbWrite();
    io.emit('network:update', db);
    res.json(newDecoy);
  } catch (error) {
    console.error('Error creating decoy:', error);
    res.status(500).json({ error: 'Failed to create decoy' });
  }
});

// Live command to decoy via SSH
app.post('/api/command/live', async (req, res) => {
  try {
    const { command, sessionId = 'live-session' } = req.body || {};
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'command is required and must be a string' });
    }
    
    // Basic command sanitization
    const sanitizedCommand = command.trim();
    if (sanitizedCommand.length === 0) {
      return res.status(400).json({ error: 'command cannot be empty' });
    }
    
    const result = await sshBridge.executeLiveCommand(sanitizedCommand, sessionId, io);
    return res.json({ success: true, output: result.stdout, error: result.stderr });
  } catch (err) {
    console.error('SSH command execution failed:', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
});

// Real network status (static sample; in practice, load from DB or discovery)
app.get('/api/network/real', async (req, res) => {
  // Static real assets for demo; extend as needed
  const realAssets = [
    { id: 'web-server', name: 'Web Prod', type: 'real', status: 'normal' },
    { id: 'db-server', name: 'Database', type: 'real', status: 'normal' }
  ];
  // Honeypots derived from configured monitors
  const configured = (global.__honeypots || []).map((hp) => hp.id);
  const hpIds = [...configured];
  // Pad up to 3 honeypots for UI layout if fewer are configured
  for (let i = hpIds.length; i < 3; i++) {
    hpIds.push(`honeypot-${i + 1}`);
  }
  const honeypots = hpIds.map((id, i) => ({ id, name: `Honeypot ${i + 1}`, type: 'honeypot', status: 'waiting' }));
  res.json({ nodes: [...realAssets, ...honeypots], isLive: true });
});

// Fallback response generator for when API is unavailable
function generateFallbackResponse(message, context) {
  const lowerMessage = message.toLowerCase();
  
  // General greetings
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return "Hello! I'm the CyberSentry AI Analyst. I'm here to help with cybersecurity questions and general inquiries. However, I'm currently operating in offline mode due to network connectivity issues. I can still provide basic assistance with cybersecurity topics.";
  }
  
  // Cybersecurity questions
  if (lowerMessage.includes('security') || lowerMessage.includes('cyber') || lowerMessage.includes('threat') || lowerMessage.includes('attack')) {
    return "I can help with cybersecurity topics! Here are some key areas I can assist with:\n\n• Threat analysis and incident response\n• Security best practices\n• CyberSentry platform guidance\n• Network security concepts\n• Attack detection and prevention\n\nWhat specific security topic would you like to discuss?";
  }
  
  // CyberSentry platform questions
  if (lowerMessage.includes('cybersentry') || lowerMessage.includes('honeypot') || lowerMessage.includes('deception')) {
    return "CyberSentry is a cyber deception platform that uses honeypots to detect and contain attackers. Key features include:\n\n• Multiple honeypot systems (Cowrie SSH honeypots)\n• Real-time threat monitoring\n• Attack simulation capabilities\n• Network visualization\n• AI-powered threat analysis\n\nI can help explain how these components work together to protect your network.";
  }
  
  // General questions
  if (lowerMessage.includes('what') || lowerMessage.includes('how') || lowerMessage.includes('why')) {
    return "I'd be happy to help answer your question! I can assist with:\n\n• General knowledge questions\n• Cybersecurity topics\n• CyberSentry platform features\n• Technical concepts\n\nCould you be more specific about what you'd like to know?";
  }
  
  // Default response
  return "I'm the CyberSentry AI Analyst, and I'm here to help! I can assist with cybersecurity questions, general inquiries, and CyberSentry platform guidance. I'm currently operating in offline mode, but I can still provide helpful information. What would you like to know?";
}

// Gemini Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    console.log('🔍 Chat API called with message:', req.body?.message);
    const { message } = req.body || {};
    if (!message || typeof message !== 'string') {
      console.log('❌ Invalid message format');
      return res.status(400).json({ error: 'message is required and must be a string' });
    }

    if (message.trim().length === 0) {
      console.log('❌ Empty message');
      return res.status(400).json({ error: 'message cannot be empty' });
    }

    await dbRead();
    const context = {
      isSimulating: db.isSimulating,
      decoys: db.decoys,
    };

    const { primary, secondary } = resolveGeminiKeys();
    console.log('🔑 API Keys found:', { primary: !!primary, secondary: !!secondary });
    const keys = [primary, secondary].filter(Boolean);
    if (!keys.length) {
      console.error('❌ Gemini API keys not configured');
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const prompt = `You are a helpful, friendly AI assistant with expertise in cybersecurity and the CyberSentry deception platform. You can handle both general conversations and cybersecurity-related queries.

PERSONALITY:
- Be conversational, helpful, and approachable
- Adapt your response style to match the user's question type
- For general questions: be friendly and informative
- For cybersecurity questions: be knowledgeable and provide actionable insights
- Keep technical jargon minimal unless the user demonstrates technical knowledge

CAPABILITIES:
- General conversation and questions
- Cybersecurity analysis and threat intelligence
- CyberSentry platform guidance
- Security best practices and recommendations
- Threat analysis and incident response guidance

CONTEXT (JSON):\n${JSON.stringify(context)}\n\nUSER:\n${message.trim()}\n\nRESPONSE GUIDELINES:
- For general questions: Provide clear, helpful answers in a conversational tone
- For cybersecurity questions: Include relevant tactics, techniques, and actionable next steps
- Always be accurate and avoid speculation
- If you don't know something, say so and offer to help find the information
- Keep responses concise but comprehensive based on the question's complexity`;

    // Temporarily disable Gemini API due to network connectivity issues
    console.log('🔄 Using fallback response (Gemini API disabled due to network issues)');
    const fallbackResponse = generateFallbackResponse(message, context);
    return res.json({ text: fallbackResponse, used: 'fallback' });
  } catch (err) {
    console.error('Gemini chat error:', err);
    
    // Use fallback response when API fails
    console.log('🔄 Using fallback response due to API failure');
    const fallbackResponse = generateFallbackResponse(message, context);
    return res.json({ text: fallbackResponse, used: 'fallback' });
  }
});

// Socket.IO connection handling
io.on('connection', async (socket) => {
  try {
    await dbRead();
    socket.emit('network:update', db);
    // Emit a test alert on connect to verify frontend wiring
    socket.emit('alert:new', { text: 'Connected to CyberSentry backend', level: 'info' });
    console.log('🔌 Client connected:', socket.id);
    
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  } catch (error) {
    console.error('Socket connection error:', error);
    socket.emit('error', { message: 'Failed to initialize connection' });
  }
});

const PORT = process.env.PORT || 3001;

const sshBridge = new SSHBridge();

// Ensure required directories exist
function ensureDirectories() {
  const cowrieDir = path.join(__dirname, '..', 'cowrie', 'log');
  if (!fs.existsSync(cowrieDir)) {
    fs.mkdirSync(cowrieDir, { recursive: true });
    console.log('📁 Created cowrie log directory');
  }
}

// Initialize application
async function startServer() {
  try {
    await initDb();
    ensureDirectories();
    
    server.listen(PORT, () => {
      console.log(`🚀 Backend running on port ${PORT}`);
      console.log(`📊 Dashboard available at http://localhost:${PORT}`);
    });
    
    // Start honeypot monitors
    try {
      let rawPaths = process.env.COWRIE_LOG_PATHS
        ? process.env.COWRIE_LOG_PATHS.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      // Auto-detect mounted cowrie logs in container/dev if env not set
      if (!rawPaths.length) {
        const candidates = [
          path.join('/', 'cowrie-logs', 'log1', 'cowrie.json'),
          path.join('/', 'cowrie-logs', 'log2', 'cowrie.json'),
          path.join('/', 'cowrie-logs', 'log3', 'cowrie.json'),
        ];
        rawPaths = candidates.filter((p) => {
          try { return fs.existsSync(p); } catch { return false; }
        });
      }
      const defaultPath = process.env.COWRIE_LOG_PATH || path.join(__dirname, '..', 'cowrie', 'log', 'cowrie.json');
      const paths = rawPaths.length ? rawPaths : [defaultPath];

      global.__honeypots = [];
      paths.forEach((p, idx) => {
        const id = `honeypot-${idx + 1}`;
        const monitor = new HoneypotMonitor(p, io, id);
        try {
          monitor.start();
          console.log(`🍯 Honeypot monitor started [${id}] -> ${p}`);
          global.__honeypots.push({ id, path: p });
        } catch (e) {
          console.warn(`⚠️  Honeypot monitor failed to start [${id}]:`, String(e));
        }
      });
      if (!paths.length) console.warn('⚠️  No honeypot log paths configured');
    } catch (e) {
      console.warn('⚠️  Honeypot monitors failed to initialize:', String(e));
    }
    
    // Attempt decoy SSH connection (optional)
    try {
      const autoConnect = String(process.env.SSH_AUTO_CONNECT || 'true').toLowerCase() !== 'false';
      if (!autoConnect) {
        console.log('🔒 SSH auto-connect disabled (set SSH_AUTO_CONNECT=true to enable)');
      } else {
        const connected = await sshBridge.connectToDecoy();
        if (connected) {
          console.log('✅ SSH bridge connected - Ready for real attacks');
        } else {
          console.warn('⚠️  SSH bridge connection failed - Live commands unavailable');
        }
      }
    } catch (error) {
      console.warn('⚠️  SSH bridge initialization failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();



