import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNetworkStore } from '@/store/networkStore';
import { socketManager } from '@/lib/socket';

interface NetworkGraphProps {
  className?: string;
}

export const NetworkGraph = ({ className = '' }: NetworkGraphProps) => {
  const { nodes, links, updateNode, addLink, removeLink } = useNetworkStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const draggingNodeRef = useRef<string | null>(null);
  const mousePrevRef = useRef<{ x: number; y: number } | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  // Ensure a node exists by id; if missing, create a reasonable default
  const ensureNodeExists = (id: string, fallback: { name?: string; type?: 'real' | 'decoy' | 'attacker' } = {}) => {
    const { addNode } = useNetworkStore.getState();
    const existing = useNetworkStore.getState().nodes.find(n => n.id === id);
    if (!existing) {
      addNode({
        id,
        name: fallback.name || id.toUpperCase(),
        type: fallback.type || 'decoy',
        status: 'normal',
        x: Math.random() * dimensions.width - dimensions.width / 2,
        y: Math.random() * dimensions.height - dimensions.height / 2,
      } as any);
    }
  };

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Helpers to convert graph coordinates to screen for tooltips
  const graphToScreen = (x: number, y: number) => {
    return {
      x: (x * scale) + (dimensions.width / 2) + pan.x,
      y: (y * scale) + (dimensions.height / 2) + pan.y,
    };
  };

  // Zoom handler (wheel)
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const zoomFactor = delta > 0 ? 1.1 : 0.9;
    const newScale = Math.min(3, Math.max(0.4, scale * zoomFactor));

    // Zoom towards mouse position
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const dx = mouseX - dimensions.width / 2 - pan.x;
      const dy = mouseY - dimensions.height / 2 - pan.y;
      const factor = newScale / scale - 1;
      setPan({ x: pan.x - dx * factor, y: pan.y - dy * factor });
    }
    setScale(newScale);
  };

  // Background pan start
  const handlePanStart = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'circle') return; // avoid conflict with node drag
    isPanningRef.current = true;
    panStartRef.current = { x: pan.x, y: pan.y };
    mousePrevRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePanMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanningRef.current || !mousePrevRef.current) return;
    const dx = e.clientX - mousePrevRef.current.x;
    const dy = e.clientY - mousePrevRef.current.y;
    mousePrevRef.current = { x: e.clientX, y: e.clientY };
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handlePanEnd = () => {
    isPanningRef.current = false;
    panStartRef.current = null;
    mousePrevRef.current = null;
  };

  // Node dragging
  const onNodeMouseDown = (nodeId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    draggingNodeRef.current = nodeId;
    mousePrevRef.current = { x: e.clientX, y: e.clientY };
  };

  const onSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingNodeRef.current) {
      const id = draggingNodeRef.current;
      const prev = mousePrevRef.current;
      if (!prev) return;
      const dx = (e.clientX - prev.x) / scale;
      const dy = (e.clientY - prev.y) / scale;
      mousePrevRef.current = { x: e.clientX, y: e.clientY };
      const node = useNetworkStore.getState().nodes.find(n => n.id === id);
      if (node) {
        updateNode(id, { x: (node.x || 0) + dx, y: (node.y || 0) + dy } as any);
      }
    } else if (isPanningRef.current) {
      handlePanMove(e);
    }
  };

  const onSvgMouseUp = () => {
    draggingNodeRef.current = null;
    handlePanEnd();
  };

  // DRAMATIC ANIMATION CONDUCTOR - Responds instantly to synchronized events
  const handleGraphEvent = (command: any) => {
    const { addNode, updateNode, addLink, removeLink } = useNetworkStore.getState();
    const state = useNetworkStore.getState();
    const firstDecoy = state.nodes.find(n => n.type === 'decoy');

    // Map hardcoded decoy-1 used by scripts to the real honeypot decoy id if provided, else first decoy
    const realDecoyId = (window as any).__realDecoyId as string | undefined;
    const mapId = (id?: string) => {
      if (id === 'decoy-1') {
        if (realDecoyId) return realDecoyId;
        if (firstDecoy) return firstDecoy.id;
      }
      return id;
    };
    const mapped = {
      ...command,
      id: mapId(command.id),
      from: mapId(command.from),
      to: mapId(command.to),
    };
    
    switch (mapped.action) {
      case 'add-node':
        const newNode = {
          id: mapped.id,
          name: mapped.name || mapped.label || mapped.id,
          type: mapped.type || mapped.group || 'decoy',
          status: 'normal' as const,
          x: mapped.x || Math.random() * dimensions.width - dimensions.width / 2,
          y: mapped.y || Math.random() * dimensions.height - dimensions.height / 2,
        };
        addNode(newNode);
        break;
      
      case 'pulse-node':
        updateNode(mapped.id, { status: 'scanning' });
        setTimeout(() => updateNode(mapped.id, { status: 'normal' }), 900);
        break;
      
      case 'highlight-node':
        ensureNodeExists(mapped.id, { type: 'decoy' });
        updateNode(mapped.id, { status: 'highlighted' });
        break;
      
      case 'draw-line':
        ensureNodeExists(mapped.from);
        ensureNodeExists(mapped.to);
        const linkId = `${mapped.from}-${mapped.to}`;
        addLink({
          id: linkId,
          source: mapped.from,
          target: mapped.to,
          type: 'attack',
          status: 'active',
          color: mapped.color,
        });
        break;
        
      case 'scanning-pulse':
        updateNode(mapped.id, { status: 'scanning' });
        setTimeout(() => updateNode(mapped.id, { status: 'normal' }), 2000);
        break;
        
      case 'scan-wave':
        // Create scanning wave effect
        updateNode(mapped.from, { status: 'scanning-intense' });
        setTimeout(() => updateNode(mapped.from, { status: 'normal' }), 900);
        break;
        
      case 'target-lock':
        updateNode(mapped.id, { status: 'target-locked' });
        break;
        
      case 'attack-initiate':
        // Draw attack line with dramatic effect
        const attackLinkId = `${mapped.from}-${mapped.to}`;
        addLink({
          id: attackLinkId,
          source: mapped.from,
          target: mapped.to,
          type: mapped.type || 'attack',
          status: 'attacking',
          color: mapped.color || 'hsl(var(--cyber-danger))',
        });
        updateNode(mapped.to, { status: 'under-attack' });
        break;
        
      case 'attack-intensify':
        const intensifyLinkId = `${mapped.from}-${mapped.to}`;
        const existingLink = links.find(l => l.id === intensifyLinkId);
        if (existingLink) {
          removeLink(intensifyLinkId);
          setTimeout(() => {
            addLink({
              ...existingLink,
              status: 'intense-attack',
              color: '#ff0000'
            });
          }, 50);
        }
        break;
        
      case 'breach-success':
        updateNode(mapped.id, { status: 'breached' });
        // Explosion effect simulation
        setTimeout(() => updateNode(mapped.id, { status: 'compromised' }), 500);
        break;
        
      case 'establish-connection':
        const connLinkId = `${mapped.from}-${mapped.to}`;
        addLink({
          id: connLinkId,
          source: mapped.from,
          target: mapped.to,
          type: 'connection',
          status: 'established',
          color: 'hsl(var(--cyber-accent))',
        });
        break;
        
      case 'system-compromise':
        updateNode(mapped.id, { status: 'compromised' });
        break;
        
      case 'data-probe':
      case 'deep-scan':
        updateNode(mapped.id, { status: 'being-scanned' });
        setTimeout(() => updateNode(mapped.id, { status: 'compromised' }), 1000);
        break;
        
      case 'treasure-found':
      case 'critical-data-exposed':
        updateNode(mapped.id, { status: 'data-exposed' });
        break;
        
      case 'connection-severed':
        const severLinkId = `${mapped.from}-${mapped.to}`;
        removeLink(severLinkId);
        break;
        
      case 'decoy-revealed':
        updateNode(mapped.id, { status: 'decoy-revealed' });
        break;
        
      case 'full-containment':
        updateNode(mapped.id, { status: 'contained' });
        break;

      case 'contain-attacker': {
        const attackerId = mapped.nodeId || mapped.id || 'attacker';
        // Ensure attacker exists
        ensureNodeExists(attackerId, { type: 'attacker', name: 'ATTACKER' });
        // Darken the attacker node and mark contained
        updateNode(attackerId, { status: 'contained', colorOverride: '#8b0000' } as any);

        // Draw a containment ring around the attacker using an SVG circle with pulsing animation
        const attacker = useNetworkStore.getState().nodes.find(n => n.id === attackerId);
        if (attacker && svgRef.current) {
          const svg = svgRef.current;
          const existing = svg.querySelector(`#containment-${attackerId}`);
          if (!existing) {
            const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            ring.setAttribute('id', `containment-${attackerId}`);
            ring.setAttribute('cx', String(attacker.x || 0));
            ring.setAttribute('cy', String(attacker.y || 0));
            ring.setAttribute('r', '36');
            ring.setAttribute('fill', 'transparent');
            ring.setAttribute('stroke', '#ff3e3e');
            ring.setAttribute('stroke-width', '3');
            ring.setAttribute('pointer-events', 'none');

            // Add pulsing glow via SVG animation
            const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
            animate.setAttribute('attributeName', 'stroke-opacity');
            animate.setAttribute('values', '0.9;0.2;0.9');
            animate.setAttribute('dur', '2s');
            animate.setAttribute('repeatCount', 'indefinite');
            ring.appendChild(animate);

            const animateRadius = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
            animateRadius.setAttribute('attributeName', 'r');
            animateRadius.setAttribute('values', '32;40;32');
            animateRadius.setAttribute('dur', '2s');
            animateRadius.setAttribute('repeatCount', 'indefinite');
            ring.appendChild(animateRadius);

            svg.appendChild(ring);
          }
        }
        break;
      }

      // Legacy actions for backward compatibility
      case 'compromise-node':
        updateNode(command.id, { status: 'compromised' });
        break;
      case 'contain-node':
        updateNode(command.id, { status: 'contained' });
        break;
      case 'remove-line':
        const removeLinkId = `${command.from}-${command.to}`;
        removeLink(removeLinkId);
        break;
    }
  };

  // Expose the handler for socket events
  useEffect(() => {
    (window as any).handleGraphEvent = handleGraphEvent;
  }, [dimensions]);

  // Subscribe directly to socket events to ensure delivery
  useEffect(() => {
    const socket = socketManager.getSocket();
    const onCmd = (cmd: any) => handleGraphEvent(cmd);
    socket.on('graph:command', onCmd);
    return () => socket.off('graph:command', onCmd);
  }, [dimensions]);


  // DRAMATIC STATUS EFFECTS - Each status triggers unique visual effects
  const getNodeGlow = (node: any) => {
    switch (node.status) {
      case 'highlighted': return 'animate-pulse-secondary';
      case 'scanning': return 'animate-pulse-primary animate-bounce';
      case 'scanning-intense': return 'animate-pulse-primary animate-ping';
      case 'target-locked': return 'animate-pulse-danger animate-bounce';
      case 'under-attack': return 'animate-pulse-danger animate-spin';
      case 'breached': return 'animate-pulse animate-bounce';
      case 'compromised': return 'animate-pulse-danger';
      case 'being-scanned': return 'animate-pulse-secondary animate-spin';
      case 'data-exposed': return 'animate-pulse-danger animate-pulse';
      case 'decoy-revealed': return 'animate-pulse-secondary animate-ping';
      case 'contained': return 'animate-pulse-primary';
      default: return '';
    }
  };

  const getNodeColor = (node: any) => {
    // Status-based coloring overrides type-based coloring for dramatic effect
    switch (node.status) {
      case 'under-attack': return 'hsl(var(--cyber-danger))';
      case 'breached': return '#ff6b6b';
      case 'compromised': return 'hsl(var(--cyber-danger))';
      case 'data-exposed': return '#ff1744';
      case 'decoy-revealed': return 'hsl(var(--cyber-secondary))';
      case 'contained': return '#8b0000';
      case 'target-locked': return '#ffa726';
      default:
        // Fall back to type-based coloring
        if (node.type === 'real') return 'hsl(var(--cyber-primary))';
        if (node.type === 'decoy') return 'hsl(var(--cyber-secondary))';
        if (node.type === 'attacker') return 'hsl(var(--cyber-danger))';
        return 'hsl(var(--cyber-accent))';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-panel ${className}`}
    >
      <div id="network-graph-container" className="h-full w-full relative overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox={`${-dimensions.width/2} ${-dimensions.height/2} ${dimensions.width} ${dimensions.height}`}
          onWheel={handleWheel}
          onMouseDown={handlePanStart}
          onMouseMove={onSvgMouseMove}
          onMouseUp={onSvgMouseUp}
          onMouseLeave={onSvgMouseUp}
        >
          {/* Grid background */}
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="hsl(var(--cyber-accent) / 0.1)"
                strokeWidth="1"
              />
            </pattern>
            
            {/* Glowing effects */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <rect
            width="100%"
            height="100%"
            fill="url(#grid)"
            x={-dimensions.width/2}
            y={-dimensions.height/2}
          />

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
          {/* Network links */}
          {links.map((link) => {
            const sourceNode = nodes.find(n => n.id === link.source);
            const targetNode = nodes.find(n => n.id === link.target);
            
            if (!sourceNode || !targetNode) return null;
            
            const pathId = `path-${link.id}`;
            const x1 = sourceNode.x || 0;
            const y1 = sourceNode.y || 0;
            const x2 = targetNode.x || 0;
            const y2 = targetNode.y || 0;

            return (
              <g key={link.id}>
                <defs>
                  <path id={pathId} d={`M ${x1} ${y1} L ${x2} ${y2}`} />
                </defs>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={link.color || 'hsl(var(--cyber-accent))'}
                  strokeWidth={link.status === 'intense-attack' ? "6" : link.status === 'attacking' ? "4" : "3"}
                  filter="url(#glow)"
                  className={
                    link.status === 'attacking' ? 'animate-pulse animate-ping' :
                    link.status === 'intense-attack' ? 'animate-pulse animate-bounce' :
                    link.status === 'established' ? 'animate-pulse-secondary' :
                    link.status === 'pulsing' ? 'animate-laser-pulse' : ''
                  }
                />
                {/* Animated packet */}
                <circle r="3" fill={link.color || 'hsl(var(--cyber-accent))'} filter="url(#glow)">
                  <animateMotion dur="2s" repeatCount="indefinite">
                    <mpath href={`#${pathId}`} />
                  </animateMotion>
                </circle>
              </g>
            );
          })}

          {/* Network nodes */}
          {nodes.map((node) => (
            <g key={node.id}>
              {/* Hover ring */}
              <circle
                cx={node.x || 0}
                cy={node.y || 0}
                r="26"
                fill="transparent"
                stroke={hoveredNodeId === node.id ? 'hsl(var(--cyber-accent))' : 'transparent'}
                strokeWidth="2"
                opacity={hoveredNodeId === node.id ? 0.7 : 0}
              />
              <circle
                cx={node.x || 0}
                cy={node.y || 0}
                r="20"
                fill={(node as any).colorOverride || getNodeColor(node)}
                filter="url(#glow)"
                className={`cursor-pointer transition-all duration-300 ${getNodeGlow(node)}`}
                strokeWidth="2"
                stroke="hsl(var(--glass-border))"
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(prev => (prev === node.id ? null : prev))}
                onMouseDown={onNodeMouseDown(node.id)}
              />
              <text
                x={node.x || 0}
                y={(node.y || 0) + 35}
                textAnchor="middle"
                className="font-mono text-xs fill-foreground"
                filter="url(#glow)"
              >
                {node.name}
              </text>
            </g>
          ))}
          </g>
        </svg>
        
        {/* Network status overlay */}
        <div className="absolute top-4 left-4">
          <div className="glass-panel p-3">
            <h3 className="font-header text-sm text-cyber-accent mb-2">Network Status</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyber-primary animate-pulse-primary"></div>
                <span>Real Servers: {nodes.filter(n => n.type === 'real').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyber-secondary animate-pulse-secondary"></div>
                <span>Decoys: {nodes.filter(n => n.type === 'decoy').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyber-danger animate-pulse-danger"></div>
                <span>Threats: {nodes.filter(n => n.type === 'attacker').length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Node tooltip */}
        {hoveredNodeId && (() => {
          const n = nodes.find(nn => nn.id === hoveredNodeId);
          if (!n) return null;
          const pos = graphToScreen(n.x || 0, n.y || 0);
          return (
            <div
              className="absolute pointer-events-none glass-panel p-2 text-xs"
              style={{ left: pos.x + 14, top: pos.y + 14 }}
            >
              <div className="font-header text-cyber-accent mb-1">{n.name}</div>
              <div className="text-muted-foreground">Type: {n.type}</div>
              <div className="text-muted-foreground">Status: {n.status}</div>
            </div>
          );
        })()}
      </div>
    </motion.div>
  );
};