// MASTER TIMELINE - Strict command→output ordering with synchronized graph
const simulationScript = [
  // Phase 1: Reconnaissance
  {
    delay: 800,
    terminal: { type: 'output', text: 'Initializing...' },
    graph: { action: 'add-node', id: 'attacker', label: '185.243.115.105', group: 'attacker' }
  },
  {
    delay: 1500,
    terminal: { type: 'command', text: 'nmap -sS 192.168.1.0/24' },
    graph: { action: 'pulse-node', id: 'attacker' }
  },
  {
    delay: 2500,
    terminal: { type: 'output', text: 'Starting Nmap 7.93 ( https://nmap.org ) at 2024-09-17 18:27 EST\nNmap scan report for 192.168.1.0/24\nHost is up (0.0050s latency).\nNot shown: 996 filtered tcp ports (no-response)\nPORT    STATE SERVICE\n22/tcp  open  ssh\n80/tcp  open  http\n443/tcp open  https\nMAC Address: 0A:1B:2C:3D:4E:5F (VMware)\n\nNmap done: 256 IP addresses (4 hosts up) scanned in 2.15 seconds' },
    graph: { action: 'highlight-node', id: 'decoy-1' }
  },
  // Threat intel: Source IP discovered after recon
  {
    delay: 500,
    threatIntel: { property: 'sourceIp', value: '185.243.115.105' }
  },

  // Phase 2: Initial Access
  {
    delay: 1000,
    terminal: { type: 'command', text: 'ssh admin@192.168.1.15' },
    graph: { action: 'draw-line', from: 'attacker', to: 'decoy-1', color: '#ff3e3e' }
  },
  {
    delay: 2200,
    terminal: { type: 'output', text: "The authenticity of host '192.168.1.15 (192.168.1.15)' can't be established.\nED25519 key fingerprint is SHA256:xyz123.\nThis key is not known by any other names.\nAre you sure you want to continue connecting (yes/no/[fingerprint])? yes\nWarning: Permanently added '192.168.1.15' (ED25519) to the list of known hosts.\nadmin@192.168.1.15's password: ********\nLast login: Tue Sep 17 18:19:43 2024 from 185.243.115.105" }
  },
  {
    delay: 400,
    terminal: { type: 'output', text: '' },
    graph: { action: 'compromise-node', id: 'decoy-1' }
  },
  // Threat intel: Tactic identified after compromise
  {
    delay: 400,
    threatIntel: { property: 'tactic', value: 'T1110 - SSH Brute-Force' }
  },

  // Phase 3: Discovery
  {
    delay: 900,
    terminal: { type: 'command', text: 'whoami' }
  },
  {
    delay: 400,
    terminal: { type: 'output', text: 'admin' }
  },
  // Threat intel: Group inferred with confidence
  {
    delay: 400,
    threatIntel: { property: 'suspectedGroup', value: 'APT28 (Fancy Bear)', confidence: 85 }
  },
  {
    delay: 600,
    terminal: { type: 'command', text: 'hostname' },
    graph: { action: 'data-probe', id: 'decoy-1' }
  },
  {
    delay: 400,
    terminal: { type: 'output', text: 'hr-files-01' }
  },

  // Phase 4: Collection
  {
    delay: 900,
    terminal: { type: 'command', text: 'cat /home/admin/passwords.txt' },
    graph: { action: 'attack-intensify', from: 'attacker', to: 'decoy-1' }
  },
  {
    delay: 1200,
    terminal: { type: 'output', text: '=== EMPLOYEE CREDENTIALS ===\nadmin:password123\njdoe:Winter2023!' },
    graph: { action: 'critical-data-exposed', id: 'decoy-1' },
    alert: { text: '🚨 ALERT: Sensitive credential file accessed on decoy system!', level: 'critical' }
  },

  // Phase 5: Containment
  {
    delay: 1200,
    terminal: { type: 'output', text: 'Connection reset by peer' },
    graph: { action: 'connection-severed', from: 'attacker', to: 'decoy-1' }
  },
  {
    delay: 1000,
    terminal: { type: 'alert', text: '\n\n🚨  --- ALERT: DECEPTIVE ENVIRONMENT ENGAGED --- 🚨\n🛡  ATTACKER HAS BEEN CONTAINED. THREAT NEUTRALIZED.' },
    graph: { action: 'full-containment', id: 'attacker' },
    alert: { text: 'SUCCESS: Attacker contained. No real assets compromised.', level: 'success' }
  },
  // FINAL STEP: THREAT NEUTRALIZATION VISUAL CLOSURE
  {
    delay: 0,
    terminal: {
      type: 'output',
      text: '🚨 THREAT NEUTRALIZED. Attacker has been contained within the deceptive environment.'
    },
    alert: {
      text: 'SUCCESS: Attack campaign contained. Zero real assets compromised.',
      level: 'success'
    },
    graph: {
      action: 'contain-attacker',
      nodeId: 'attacker'
    }
  }
];

module.exports = simulationScript;


