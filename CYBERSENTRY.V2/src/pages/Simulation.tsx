import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NetworkGraph } from '@/components/NetworkGraph';
import { Terminal } from '@/components/Terminal';
import { SecurityAlertFeed } from '@/components/SecurityAlertFeed';
import { ThreatIntelPanel } from '@/components/ThreatIntelPanel';
import { AIChatbot } from '@/components/AIChatbot';
import { useNetworkStore } from '@/store/networkStore';
import { socketManager } from '@/lib/socket';
import { Activity, Shield, AlertTriangle, Target, Bot } from 'lucide-react';

const Simulation = () => {
  const navigate = useNavigate();
  const { 
    setSimulationActive, 
    simulationActive, 
    addAlert, 
    updateThreatIntel,
    nodes 
  } = useNetworkStore();
  const [simulationStep, setSimulationStep] = useState(0);

  const decoys = nodes.filter(n => n.type === 'decoy');
  const attackerNode = nodes.find(n => n.type === 'attacker');
  const threatText = attackerNode ? (attackerNode.status === 'contained' ? 'CONTAINED' : 'HIGH') : 'LOW';
  const threatSubtitle = threatText === 'LOW'
    ? 'No active incidents'
    : threatText === 'CONTAINED'
      ? 'Attacker contained'
      : 'Active intrusion detected';

  useEffect(() => {
    // Always allow dashboard in live mode

    // Wire global handlers so socket events can update UI immediately
    (window as any).handleAlertEvent = (data: any) => {
      addAlert(data);
      setSimulationStep(prev => prev + 1);
    };
    (window as any).handleAttackStart = (data: any) => {
      // Identify actor and reflect on graph & intel
      addAlert({ text: `Incoming connection from ${data.src_ip}`, level: 'info' });
      updateThreatIntel({ property: 'sourceIp', value: data.src_ip } as any);
      if ((window as any).handleGraphEvent) {
        (window as any).handleGraphEvent({ action: 'add-node', id: 'attacker', name: data.src_ip, type: 'attacker' });
        (window as any).handleGraphEvent({ action: 'pulse-node', id: 'attacker' });
      }
    };
    (window as any).handleAttackLogin = (data: any) => {
      addAlert({ text: `Login success by ${data.src_ip} as ${data.username}`, level: 'warning' });
      updateThreatIntel({ property: 'tactic', value: 'Credential Access' } as any);
      if ((window as any).handleGraphEvent) {
        const w = window as any;
        const targetId = data.honeypotId || w.__realDecoyId || w.__firstDecoyId;
        if (targetId) (window as any).handleGraphEvent({ action: 'establish-connection', from: 'attacker', to: targetId });
      }
    };
    (window as any).handleAttackCommand = (data: any) => {
      addAlert({ text: `Command from ${data.src_ip}: ${data.command}`, level: 'info' });
      if ((window as any).handleGraphEvent) {
        const w = window as any;
        const targetId = data.honeypotId || w.__realDecoyId || w.__firstDecoyId;
        if (targetId) (window as any).handleGraphEvent({ action: 'data-probe', id: targetId });
      }
    };
    // Threat intel updates -> push into store
    (window as any).handleThreatIntelUpdate = (intel: any) => {
      updateThreatIntel(intel);
    };
    (window as any).handleNetworkUpdate = (data: any) => {
      // Optional: sync store if needed in the future
    };
    (window as any).handleSimulationStatus = (isRunning: boolean) => {
      setSimulationActive(isRunning);
    };

    // Connect sockets for live honeypot mode and fetch real network
    const socket = socketManager.getSocket();
    if (socket && !socket.connected) socket.connect();

    // Drain any buffered threat intel captured before component mounted
    const w = window as any;
    if (Array.isArray(w.__threatIntelBuffer) && w.__threatIntelBuffer.length) {
      for (const item of w.__threatIntelBuffer) updateThreatIntel(item);
      w.__threatIntelBuffer = [];
    }

    // Load real network topology and render real assets and backend honeypots (no synthetic nodes)
    fetch('/api/network/real')
      .then(r => r.json())
      .then(data => {
        const add = (cmd: any) => (window as any).handleGraphEvent && (window as any).handleGraphEvent(cmd);
        const nodes = (data?.nodes || []) as Array<any>;

        const real = nodes.filter(n => n.type === 'real');
        const honeypots = nodes.filter(n => n.type === 'honeypot');

        // Fixed positions for readability
        const realPositions = [
          { x: -240, y: -100 },
          { x: 240, y: -80 },
          { x: 0, y: 200 },
          { x: -120, y: 80 },
          { x: 120, y: 80 },
        ];
        real.forEach((n, i) => {
          const p = realPositions[i % realPositions.length];
          add({ action: 'add-node', id: n.id, name: n.name, type: 'real', x: p.x, y: p.y });
        });

        // Place honeypots spread around the real assets (no initial connections)
        honeypots.forEach((n, idx) => {
          const nearReal = real[idx % Math.max(real.length, 1)];
          const base = nearReal ? realPositions[real.findIndex(r => r.id === nearReal.id) % realPositions.length] : { x: 0, y: 0 };
          const offsetAngle = (2 * Math.PI / Math.max(honeypots.length, 1)) * idx;
          const radius = 140;
          const defaultX = Math.round(base.x + radius * Math.cos(offsetAngle));
          const defaultY = Math.round(base.y + radius * Math.sin(offsetAngle));
          const x = typeof n.x === 'number' ? n.x : defaultX;
          const y = typeof n.y === 'number' ? n.y : defaultY;
          add({ action: 'add-node', id: n.id, name: n.name || n.id, type: 'decoy', x, y });
        });

        if (honeypots.length) (window as any).__firstDecoyId = honeypots[0].id;
      })
      .catch(() => {});
    
    return () => {
      setSimulationActive(false);
    };
  }, []);

  const startSimulation = () => {};

  const progressPercentage = 0;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-2">
          <AlertTriangle className="w-8 h-8 text-cyber-danger animate-pulse-danger bg-transparent" />
          <h1 className="font-header text-4xl text-cyber-danger font-bold">
            Live Attack Monitoring
          </h1>
          <AlertTriangle className="w-8 h-8 text-cyber-danger animate-pulse-danger bg-transparent" />
        </div>
        <p className="text-lg text-muted-foreground">
          Real-time honeypot telemetry. All systems monitored.
        </p>
        
      </motion.div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-panel border-cyber-danger/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-cyber-danger">
                <Activity className="w-5 h-5 animate-pulse-danger bg-transparent" />
                Threat Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyber-danger">
                {threatText}
              </div>
              <p className="text-sm text-muted-foreground">
                {threatSubtitle}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-panel border-cyber-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-cyber-primary">
                <Shield className="w-5 h-5 animate-pulse-primary bg-transparent" />
                Real Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyber-primary">
                SECURE
              </div>
              <p className="text-sm text-muted-foreground">
                All systems protected
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-panel border-cyber-secondary/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-cyber-secondary">
                Decoy/Honeypot Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyber-secondary">
                ACTIVE
              </div>
              <p className="text-sm text-muted-foreground">
                {decoys.length} honeypot{decoys.length !== 1 ? 's' : ''} online
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Simulation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Graph - Takes 2 columns */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="glass-panel h-[60vh] min-h-[420px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyber-danger">
                <Activity className="w-5 h-5 animate-pulse-danger bg-transparent" />
                Live Network Activity
              </CardTitle>
              <CardDescription>
                Real-time visualization of the ongoing cyber attack
              </CardDescription>
            </CardHeader>
            <CardContent className="h-full pb-4">
              <NetworkGraph className="h-full" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Threat Intel Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass-panel h-[60vh] min-h-[420px]">
            <CardContent className="p-0 h-full">
              <ThreatIntelPanel />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row - Terminal and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Terminal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="glass-panel h-[38vh] min-h-[320px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyber-accent">
                <Activity className="w-5 h-5" />
                Live Terminal Feed
              </CardTitle>
              <CardDescription>
                Attacker's real-time command execution
              </CardDescription>
            </CardHeader>
            <CardContent className="h-full pb-4">
              <Terminal className="h-full" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="glass-panel h-[38vh] min-h-[320px]">
            <CardContent className="p-0 h-full">
              <SecurityAlertFeed />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <AIChatbot />
    </div>
  );
};

export default Simulation;