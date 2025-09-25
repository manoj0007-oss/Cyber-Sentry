import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, RotateCcw, Download, Share, Target, Shield, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNetworkStore } from '@/store/networkStore';
import { AIChatbot } from '@/components/AIChatbot';

const Report = () => {
  const navigate = useNavigate();
  const { nodes, alerts, threatIntel, resetNetwork } = useNetworkStore();

  const realServers = nodes.filter(n => n.type === 'real');
  const decoys = nodes.filter(n => n.type === 'decoy');
  const compromisedDecoys = nodes.filter(n => n.type === 'decoy' && n.status === 'compromised');
  const criticalAlerts = alerts.filter(a => a.level === 'critical');

  const runNewSimulation = () => {
    resetNetwork();
    navigate('/');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-3">
          <CheckCircle className="w-12 h-12 text-cyber-primary animate-pulse-primary" />
          <h1 className="font-header text-4xl text-cyber-primary font-bold">
            Incident Report
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Attack successfully contained within deceptive environment. Your real infrastructure remains completely secure.
        </p>
      </motion.div>

      {/* Executive Summary */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass-panel border-cyber-primary/50 glow-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cyber-primary">
              <Shield className="w-6 h-6" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-cyber-primary/10 border border-cyber-primary/30 rounded-lg p-6 text-center">
              <h3 className="text-xl font-header text-cyber-primary mb-2">
                🛡️ MISSION ACCOMPLISHED
              </h3>
              <p className="text-lg mb-4">
                The attacker was successfully contained within the deceptive environment.
              </p>
              <p className="text-cyber-primary font-bold text-2xl">
                ZERO REAL ASSETS COMPROMISED
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-panel border-cyber-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-cyber-primary">
                <Shield className="w-5 h-5" />
                Protected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-cyber-primary mb-1">
                {realServers.length}
              </div>
              <p className="text-sm text-muted-foreground">
                Real servers secure
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-panel border-cyber-secondary/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-cyber-secondary">
                <Target className="w-5 h-5" />
                Engaged
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-cyber-secondary mb-1">
                {compromisedDecoys.length}
              </div>
              <p className="text-sm text-muted-foreground">
                Decoys compromised
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-panel border-cyber-danger/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-cyber-danger">
                <TrendingUp className="w-5 h-5" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-cyber-danger mb-1">
                {criticalAlerts.length}
              </div>
              <p className="text-sm text-muted-foreground">
                Critical incidents
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass-panel border-cyber-accent/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-cyber-accent">
                <Clock className="w-5 h-5" />
                Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-cyber-accent mb-1">
                ~2m
              </div>
              <p className="text-sm text-muted-foreground">
                Time to containment
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attack Timeline */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyber-accent">
                <Clock className="w-5 h-5" />
                Attack Timeline
              </CardTitle>
              <CardDescription>
                Step-by-step breakdown of the incident
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-cyber-accent mt-2"></div>
                  <div>
                    <h4 className="font-semibold text-sm text-cyber-accent">Reconnaissance</h4>
                    <p className="text-sm text-muted-foreground">
                      Attacker performed network scanning and target identification
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-cyber-danger mt-2"></div>
                  <div>
                    <h4 className="font-semibold text-sm text-cyber-danger">Initial Access</h4>
                    <p className="text-sm text-muted-foreground">
                      SSH brute-force attack launched against decoy HR-FILES system
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-cyber-secondary mt-2"></div>
                  <div>
                    <h4 className="font-semibold text-sm text-cyber-secondary">Discovery</h4>
                    <p className="text-sm text-muted-foreground">
                      Attacker attempted credential harvesting from compromised decoy
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-cyber-primary mt-2"></div>
                  <div>
                    <h4 className="font-semibold text-sm text-cyber-primary">Containment</h4>
                    <p className="text-sm text-muted-foreground">
                      Deception system activated, attacker contained and identified
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Threat Intelligence Summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyber-danger">
                <Target className="w-5 h-5" />
                Threat Intelligence
              </CardTitle>
              <CardDescription>
                Intelligence gathered during the incident
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-cyber-accent mb-2">Attribution</h4>
                <div className="glass-panel p-3">
                  <p className="text-sm">
                    <span className="text-cyber-danger font-mono">{threatIntel.sourceIp}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {threatIntel.suspectedGroup}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-cyber-accent mb-2">MITRE ATT&CK Mapping</h4>
                <div className="glass-panel p-3 space-y-1">
                  <p className="text-sm">
                    <span className="text-cyber-secondary">Tactic:</span> {threatIntel.tactic}
                  </p>
                  <p className="text-sm">
                    <span className="text-cyber-secondary">Technique:</span> {threatIntel.technique}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-cyber-accent mb-2">Confidence Score</h4>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-glass-border rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-cyber-danger"
                      style={{ width: `${threatIntel.confidence}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-cyber-danger">
                    {threatIntel.confidence}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex flex-wrap gap-4 justify-center"
      >
        <Button
          onClick={runNewSimulation}
          variant="cyber"
          size="xl"
          className="font-header px-8"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          RUN NEW SIMULATION
        </Button>
        
        <Button
          variant="cyber-outline"
          className="font-header px-6"
        >
          <Download className="w-5 h-5 mr-2" />
          Export Report
        </Button>
        
        <Button
          variant="cyber-outline"
          className="font-header px-6"
        >
          <Share className="w-5 h-5 mr-2" />
          Share Results
        </Button>
      </motion.div>

      <AIChatbot />
    </div>
  );
};

export default Report;