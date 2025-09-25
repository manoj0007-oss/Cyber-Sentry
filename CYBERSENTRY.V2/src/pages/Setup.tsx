import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Users, Target } from 'lucide-react';
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-panel border-cyber-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-cyber-primary">
                <Shield className="w-5 h-5" />
                Real Servers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyber-primary">
                {realServers.length}
              </div>
              <p className="text-sm text-muted-foreground">
                Critical assets protected
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-panel border-cyber-secondary/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-cyber-secondary">
                <Target className="w-5 h-5" />
                Active Honeypots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyber-secondary">
                {decoys.length}
              </div>
              <p className="text-sm text-muted-foreground">
                Honeypot sensors online
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-panel border-cyber-accent/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-cyber-accent">
                <Users className="w-5 h-5" />
                Coverage Ratio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyber-accent">
                {realServers.length > 0 ? Math.round((decoys.length / realServers.length) * 100) : 0}%
              </div>
              <p className="text-sm text-muted-foreground">
                Deception coverage
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="glass-panel h-[500px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyber-accent">
                <Target className="w-5 h-5" />
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

        {/* Live Monitoring Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-4"
        >
          <Card className="glass-panel border-cyber-primary/30">
            <CardHeader>
              <CardTitle className="text-cyber-primary">Open Live Monitoring</CardTitle>
              <CardDescription>
                View real-time attacker activity from honeypot logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/simulation')}
                variant="cyber"
                size="xl"
                className="w-full font-header"
              >
                Open Dashboard
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <AIChatbot />
    </div>
  );
};

export default Setup;