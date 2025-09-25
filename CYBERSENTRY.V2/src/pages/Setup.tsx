import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Users, Target, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NetworkGraph } from '@/components/NetworkGraph';
import { useNetworkStore } from '@/store/networkStore';
import { AIChatbot } from '@/components/AIChatbot';

const Setup = () => {
  const navigate = useNavigate();
  const { nodes } = useNetworkStore();
  const [isDeploying] = useState(false);

  const realServers = nodes.filter(n => n.type === 'real');
  const decoys = nodes.filter(n => n.type === 'decoy' || n.type === 'honeypot');

  return (
    <div className="space-y-6 pb-20">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <h1 className="font-header text-4xl text-cyber-primary font-bold mb-2">
          Live Honeypot Monitoring
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          View real-time activity from your SSH honeypots and monitor attacker behavior.
        </p>
      </motion.div>

      {/* Main Content Split: 70% / 30% */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Network Topology (~70%) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="lg:basis-[70%] lg:shrink-0"
        >
          <Card className="glass-panel h-[70vh] md:h-[70vh] min-h-[520px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyber-accent">
                <Target className="w-5 h-5 icon-clean" />
                Network Topology
              </CardTitle>
              <CardDescription>
                Your protected infrastructure and honeypot placement
              </CardDescription>
            </CardHeader>
            <CardContent className="h-full pb-4">
              <NetworkGraph className="h-full" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Stacked 2:1:1:1 */}
        <div className="lg:basis-[30%] grid grid-rows-[2fr_1fr_1fr_1fr] gap-4 h-[70vh] md:h-[70vh] min-h-[520px]">
          {/* Open Live Monitoring (2fr) */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
            <Card className="glass-panel h-full border-cyber-primary/30 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-cyber-primary">
                  <Activity className="w-5 h-5 icon-clean" />
                  Open Live Monitoring
                </CardTitle>
                <CardDescription>View real-time attacker activity</CardDescription>
              </CardHeader>
              <div className="flex-1" />
              <CardContent className="pb-5">
                <Button onClick={() => navigate('/simulation')} variant="cyber" size="lg" className="w-full font-header">Open Dashboard</Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Real Servers (1fr) */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card className="glass-panel h-full border-cyber-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-cyber-primary">
                  <Shield className="w-5 h-5 icon-clean" />
                  Real Servers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-cyber-primary">{realServers.length}</div>
                <p className="text-sm text-muted-foreground">Critical assets protected</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Active Honeypots (1fr) */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
            <Card className="glass-panel h-full border-cyber-secondary/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-cyber-secondary">
                  <Target className="w-5 h-5 icon-clean" />
                  Active Honeypots
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-cyber-secondary">{decoys.length}</div>
                <p className="text-sm text-muted-foreground">Honeypot sensors online</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Coverage Ratio (1fr) */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Card className="glass-panel h-full border-cyber-accent/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-cyber-accent">
                  <Users className="w-5 h-5 icon-clean" />
                  Coverage Ratio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-cyber-accent">{realServers.length > 0 ? Math.round((decoys.length / realServers.length) * 100) : 0}%</div>
                <p className="text-sm text-muted-foreground">Deception coverage</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <AIChatbot />
    </div>
  );
};

export default Setup;