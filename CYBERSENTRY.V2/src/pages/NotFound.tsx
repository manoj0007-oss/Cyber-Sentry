import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Cyberpunk background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyber-danger/5 rounded-full blur-3xl animate-pulse-danger"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyber-accent/5 rounded-full blur-3xl animate-pulse-primary"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6 z-10 relative"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center"
        >
          <AlertTriangle className="w-24 h-24 text-cyber-danger animate-pulse-danger" />
        </motion.div>

        <div className="space-y-4">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-6xl font-header font-bold text-cyber-danger"
          >
            404
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-2xl font-header text-cyber-accent mb-2"
          >
            SECTOR NOT FOUND
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-lg text-muted-foreground max-w-md mx-auto"
          >
            The requested sector <span className="font-mono text-cyber-danger">{location.pathname}</span> does not exist in the CyberSentry network.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-4 justify-center"
        >
          <Button
            onClick={() => window.history.back()}
            variant="cyber-outline"
            className="font-header"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          
          <Button
            onClick={() => window.location.href = '/'}
            variant="cyber"
            className="font-header"
          >
            <Home className="w-4 h-4 mr-2" />
            Command Center
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="glass-panel p-4 max-w-md mx-auto mt-8"
        >
          <p className="text-xs text-muted-foreground text-center">
            Security protocols active. All navigation attempts are logged.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
