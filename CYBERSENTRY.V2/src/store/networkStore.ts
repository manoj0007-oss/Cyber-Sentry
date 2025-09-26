import { create } from 'zustand';

export interface NetworkNode {
  id: string;
  name: string;
  type: 'real' | 'decoy' | 'attacker';
  x?: number;
  y?: number;
  status: 'normal' | 'highlighted' | 'compromised' | 'contained' | 'scanning' | 'scanning-intense' | 'target-locked' | 'under-attack' | 'breached' | 'being-scanned' | 'data-exposed' | 'decoy-revealed';
  target?: string; // For decoys, which real server they protect
}

export interface NetworkLink {
  id: string;
  source: string;
  target: string;
  type: 'normal' | 'attack' | 'data' | 'connection' | 'brute-force' | 'secure-tunnel';
  status: 'active' | 'inactive' | 'pulsing' | 'attacking' | 'intense-attack' | 'established';
  color?: string;
}

export interface AlertItem {
  id: string;
  text: string;
  level: 'info' | 'warning' | 'critical' | 'success';
  timestamp: Date;
}

export interface ThreatIntelData {
  sourceIp?: string;
  suspectedGroup?: string;
  tactic?: string;
  technique?: string;
  confidence?: number;
}

interface NetworkState {
  nodes: NetworkNode[];
  links: NetworkLink[];
  alerts: AlertItem[];
  threatIntel: ThreatIntelData;
  simulationActive: boolean;
  simulationStep: number;
  
  // Actions
  addNode: (node: NetworkNode) => void;
  updateNode: (id: string, updates: Partial<NetworkNode>) => void;
  addLink: (link: NetworkLink) => void;
  removeLink: (id: string) => void;
  addAlert: (alert: Omit<AlertItem, 'id' | 'timestamp'>) => void;
  updateThreatIntel: (intel: Partial<ThreatIntelData>) => void;
  setSimulationActive: (active: boolean) => void;
  setSimulationStep: (step: number) => void;
  resetNetwork: () => void;
}

// Initial real servers in the network
const initialNodes: NetworkNode[] = [
  { 
    id: 'prod-db', 
    name: 'PROD-DB', 
    type: 'real', 
    status: 'normal',
    x: -200,
    y: -100
  },
  { 
    id: 'auth-server', 
    name: 'AUTH-SERVER', 
    type: 'real', 
    status: 'normal',
    x: 0,
    y: -150
  },
  { 
    id: 'hr-files', 
    name: 'HR-FILES', 
    type: 'real', 
    status: 'normal',
    x: 200,
    y: -100
  },
  { 
    id: 'backup-sys', 
    name: 'BACKUP-SYS', 
    type: 'real', 
    status: 'normal',
    x: 100,
    y: 50
  },
  { 
    id: 'file-server', 
    name: 'FILE-SERVER', 
    type: 'real', 
    status: 'normal',
    x: -100,
    y: 50
  }
];

export const useNetworkStore = create<NetworkState>((set, get) => ({
  nodes: initialNodes,
  links: [],
  alerts: [],
  threatIntel: {},
  simulationActive: false,
  simulationStep: 0,

  addNode: (node) =>
    set((state) => {
      const existingIndex = state.nodes.findIndex((n) => n.id === node.id);
      if (existingIndex >= 0) {
        // Merge updates (e.g., rename attacker with src_ip) without creating duplicates
        const updated = [...state.nodes];
        updated[existingIndex] = { ...updated[existingIndex], ...node } as any;
        return { nodes: updated } as any;
      }
      return { nodes: [...state.nodes, node] } as any;
    }),

  updateNode: (id, updates) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, ...updates } : node
      ),
    })),

  addLink: (link) =>
    set((state) => ({
      links: [...state.links, link],
    })),

  removeLink: (id) =>
    set((state) => ({
      links: state.links.filter((link) => link.id !== id),
    })),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [
        {
          ...alert,
          id: Date.now().toString(),
          timestamp: new Date(),
        },
        ...state.alerts.slice(0, 9), // Keep only 10 latest alerts
      ],
    })),

  updateThreatIntel: (intel) =>
    set((state) => ({
      threatIntel: { ...state.threatIntel, ...intel },
    })),

  setSimulationActive: (active) =>
    set({ simulationActive: active }),

  setSimulationStep: (step) =>
    set({ simulationStep: step }),

  resetNetwork: () =>
    set({
      nodes: initialNodes,
      links: [],
      alerts: [],
      threatIntel: {},
      simulationActive: false,
      simulationStep: 0,
    }),
}));