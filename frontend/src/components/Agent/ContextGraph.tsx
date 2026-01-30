import React, { useEffect, useRef } from 'react';
import { useThreeColumnContext } from '../../contexts/ThreeColumnContext';


export const ContextGraph: React.FC = () => {
  const { graphNodes, graphLinks, searchTerm, updateGraphData } = useThreeColumnContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);


  const renderGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match its display size
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Use the context data (which will be updated by the API call)
    const displayNodes = graphNodes;
    const displayLinks = graphLinks;

    // Draw links first (so they appear behind nodes)
    ctx.strokeStyle = 'rgba(100, 108, 255, 0.2)';
    ctx.lineWidth = 1;

    displayLinks.forEach(link => {
      const sourceNode = displayNodes.find(n => n.id === link.source);
      const targetNode = displayNodes.find(n => n.id === link.target);

      if (sourceNode && targetNode && sourceNode.x !== undefined && sourceNode.y !== undefined &&
          targetNode.x !== undefined && targetNode.y !== undefined) {
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();
      }
    });

    // Draw nodes
    displayNodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined && node.size !== undefined) {
        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fillStyle = node.color || '#646cff';
        ctx.fill();

        // Draw node border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(node.label, node.x, node.y + node.size + 4);
      }
    });
  };

  useEffect(() => {
    renderGraph();

    const handleResize = () => {
      renderGraph();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [graphNodes, graphLinks]);

  // Fetch graph data when search term changes
  useEffect(() => {
    if (searchTerm && searchTerm.trim() !== '') {
      const fetchData = async () => {
        try {
          const response = await fetch('/v1/graph/data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: searchTerm, limit: 20 })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          // Update the graph data in the context
          updateGraphData(data.nodes, data.links);
        } catch (error) {
          console.error('Error fetching graph data:', error);
        }
      };

      // Debounce the search to avoid too many requests
      const timeoutId = setTimeout(fetchData, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, updateGraphData]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-3 border-b border-gray-800/50 flex justify-between items-center bg-gray-900/20">
        <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500">ECE Context Graph</span>
        <span className="text-[10px] font-mono text-gray-700">•••</span>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full bg-black/20"
        />
        <div className="absolute bottom-2 left-2 text-[8px] font-mono text-gray-500 bg-black/50 px-2 py-1 rounded">
          Tag-Walker Protocol Visualization
        </div>
      </div>
    </div>
  );
};