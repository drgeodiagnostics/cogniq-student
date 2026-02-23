import React, { useState, useMemo } from 'react';
import { ReactFlow, Background, Controls, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { hierarchy, tree } from 'd3-hierarchy';
import { Info, ZoomIn, X, ChevronDown, ChevronUp } from 'lucide-react'; // 👈 Added UI Icons

// --- THE D3 TO REACT-FLOW LAYOUT ENGINE ---
const getLayoutedElements = (rawData) => {
    const root = hierarchy(rawData);
    const treeLayout = tree().nodeSize([60, 280]); 
    treeLayout(root);

    const nodes = [];
    const edges = [];

    root.descendants().forEach((node) => {
        nodes.push({
            id: node.data.id,
            position: { x: node.y, y: node.x },
            data: { 
                label: node.data.text,
                note: node.data.note,
                image: node.data.image,
                caption: node.data.caption,
                level: node.data.level
            },
            type: 'customNode',
        });
    });

    root.links().forEach((link) => {
        edges.push({
            id: `e-${link.source.data.id}-${link.target.data.id}`,
            source: link.source.data.id,
            target: link.target.data.id,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#cbd5e1', strokeWidth: 2 },
        });
    });

    return { initialNodes: nodes, initialEdges: edges };
};

// --- CUSTOM NODE STYLING ---
const CustomNode = ({ data }) => {
    let bgClass = 'bg-white';
    let textClass = 'text-slate-700';
    let borderClass = 'border border-slate-200';

    if (data.level === 1) { bgClass = 'bg-indigo-600'; textClass = 'text-white'; borderClass = 'border-none'; }
    if (data.level === 2) { bgClass = 'bg-sky-500'; textClass = 'text-white'; borderClass = 'border-none'; }
    if (data.level === 3) { borderClass = 'border-2 border-sky-500'; textClass = 'text-slate-800'; }

    return (
        <div className={`px-4 py-2 rounded-xl shadow-sm transition-transform hover:scale-105 hover:shadow-md min-w-[150px] text-center ${bgClass} ${textClass} ${borderClass}`}>
            {data.level !== 1 && <Handle type="target" position={Position.Left} className="opacity-0" />}
            <div className="font-bold text-sm">{data.label}</div>
            <Handle type="source" position={Position.Right} className="opacity-0" />
        </div>
    );
};

// --- MAIN COMPONENT ---
export default function InteractiveMindMap({ mapData }) {
    const activeData = mapData || fallbackData; 
    
    const { initialNodes, initialEdges } = useMemo(() => getLayoutedElements(activeData), [activeData]);
    const nodeTypes = useMemo(() => ({ customNode: CustomNode }), []);

    const [activeNode, setActiveNode] = useState(activeData); 
    const [isMinimized, setIsMinimized] = useState(false); // 👈 Added minimize state

    const onNodeClick = (event, node) => {
        setActiveNode(node.data);
        setIsMinimized(false); // Auto-expand when a new node is clicked
    };

    // 👈 Added Pane Click to easily close the hub
    const onPaneClick = () => {
        setActiveNode(null); 
    };

    return (
        <div className="w-full h-[70vh] bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative shadow-inner">
            <ReactFlow 
                nodes={initialNodes} 
                edges={initialEdges} 
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick} // 👈 Clicking the background closes the hub
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.2}
                proOptions={{ hideAttribution: true }}
            >
                <Background color="#cbd5e1" gap={16} size={1} />
                <Controls className="shadow-md rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 [&_button]:bg-white dark:[&_button]:bg-slate-800 [&_button]:text-slate-600 dark:[&_button]:text-slate-300 [&_button]:border-b [&_button]:border-slate-100 dark:[&_button]:border-slate-700 hover:[&_button]:bg-slate-50 dark:hover:[&_button]:bg-slate-700 [&_button:last-child]:border-none [&_path]:fill-current transition-colors" />
            </ReactFlow>

            {/* --- KNOWLEDGE HUB UI --- */}
            {activeNode && (
                <div className={`absolute top-4 right-4 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-in slide-in-from-right-4 z-10 transition-all duration-300 ${isMinimized ? 'h-12' : 'max-h-[90%]'}`}>
                    
                    {/* Header (Clickable to toggle minimize) */}
                    <div 
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="bg-slate-100 dark:bg-slate-800 p-3 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 cursor-pointer select-none group"
                    >
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                            <Info size={14}/> Knowledge Hub
                        </span>
                        
                        {/* Window Controls */}
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} 
                                className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                {isMinimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setActiveNode(null); }} 
                                className="p-1 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Body (Hides when minimized) */}
                    {!isMinimized && (
                        <div className="p-5 overflow-y-auto">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{activeNode.label || activeNode.text}</h3>
                            {activeNode.note && <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">{activeNode.note}</p>}
                            
                            {activeNode.image && (
                                <div className="mt-4">
                                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 relative group cursor-pointer">
                                        <img src={activeNode.image} alt="Node reference" className="w-full h-auto" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <ZoomIn className="text-white" size={24} />
                                        </div>
                                    </div>
                                    {activeNode.caption && <p className="text-[10px] text-slate-500 italic text-center mt-2">{activeNode.caption}</p>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// --- CHAPTER 1 FALLBACK DATA ---
const fallbackData = {
    "id": "node-0",
    "text": "Introduction to Pathology",
    "level": 1,
    "note": "Pathology is the scientific study of changes in the structure and function of the body in disease.",
    "children": [
      {
        "id": "node-1",
        "text": "Definition & Scope",
        "level": 2,
        "note": "Pathology provides the final diagnosis which is crucial for patient management.",
        "children": [
          { "id": "node-6", "text": "Etymology", "level": 3, "note": "Derived from Greek: 'Pathos' = Suffering, 'Logos' = Study." },
          { "id": "node-9", "text": "Pathophysiology", "level": 3, "note": "Study of disordered function." }
        ]
      },
      {
        "id": "node-2",
        "text": "Core Components",
        "level": 2,
        "note": "The four pillars of pathology.",
        "children": [
          { "id": "node-10", "text": "Etiology (Why?)", "level": 3, "note": "The causal factors responsible for lesions." },
          { "id": "node-11", "text": "Pathogenesis (How?)", "level": 3, "note": "The mechanism by which the lesions are produced." },
          { "id": "node-12", "text": "Morphology (What?)", "level": 3, "note": "Structural changes (Lesions)." }
        ]
      }
    ]
};