import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface Props {
  chart: string;
}

const MermaidRenderer: React.FC<Props> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      fontFamily: 'Inter'
    });
  }, []);

  useEffect(() => {
    const renderChart = async () => {
      if (ref.current && chart) {
        try {
          ref.current.innerHTML = '';
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, chart);
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
        } catch (error) {
          console.error('Mermaid render error', error);
          if (ref.current) ref.current.innerHTML = '<p class="text-red-400 text-xs">Failed to render diagram.</p>';
        }
      }
    };
    renderChart();
  }, [chart]);

  return (
    <div className="my-6 p-4 bg-white border border-upsc-200 rounded-lg shadow-sm overflow-x-auto flex justify-center">
      <div ref={ref} className="w-full flex justify-center" />
    </div>
  );
};

export default MermaidRenderer;