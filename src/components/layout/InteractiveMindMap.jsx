import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ReactFlow, Background, Controls, Handle, Position, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { hierarchy, tree } from 'd3-hierarchy';
import { Info, ZoomIn, X, ChevronDown, ChevronUp, Plus, Minus, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../supabaseClient'; // 🚀 Added Supabase import

// --- THE D3 TO REACT-FLOW LAYOUT ENGINE ---
const getLayoutedElements = (rawData, expandedIds, onToggleNode, reviewedNodes) => {
    if (!rawData) return { initialNodes: [], initialEdges: [] };

    try {
        const dataCopy = JSON.parse(JSON.stringify(rawData));
        
        let idCounter = 0;
        const assignIds = (n) => {
            if (!n.id) n.id = `auto-node-${idCounter++}`;
            if (n.children) n.children.forEach(assignIds);
        };
        assignIds(dataCopy);

        const root = hierarchy(dataCopy);

        root.each(node => {
            node.data.hasChildren = !!(node.children && node.children.length > 0);
            node.data.isCollapsed = node.data.hasChildren && !expandedIds.has(String(node.data.id));

            if (node.data.isCollapsed && node.children) {
                node._children = node.children;
                node.children = null; 
            }
        });

        const treeLayout = tree().nodeSize([60, 280]); 
        treeLayout(root);

        const nodes = [];
        const edges = [];

        root.descendants().forEach((node) => {
            nodes.push({
                id: String(node.data.id),
                position: { x: node.y, y: node.x },
                data: { 
                    id: String(node.data.id), // Passed ID into data for the sidebar
                    label: node.data.text || node.data.label || 'Concept',
                    note: node.data.note,
                    image: node.data.image,
                    caption: node.data.caption,
                    level: node.data.level,
                    hasChildren: node.data.hasChildren,
                    isCollapsed: node.data.isCollapsed,
                    isReviewed: reviewedNodes.has(String(node.data.id)), // 🚀 Pass Review Status
                    onToggle: () => onToggleNode(node.data.id) 
                },
                type: 'customNode',
            });
        });

        root.links().forEach((link) => {
            edges.push({
                id: `e-${link.source.data.id}-${link.target.data.id}`,
                source: String(link.source.data.id),
                target: String(link.target.data.id),
                type: 'smoothstep',
                animated: true,
                style: { stroke: '#cbd5e1', strokeWidth: 2 },
            });
        });

        return { initialNodes: nodes, initialEdges: edges };
    } catch (err) {
        console.error("D3 Layout Error:", err);
        return { initialNodes: [], initialEdges: [] };
    }
};

// --- CUSTOM NODE STYLING ---
const CustomNode = ({ data }) => {
    let bgClass = 'bg-white dark:bg-slate-800';
    let textClass = 'text-slate-700 dark:text-slate-200';
    let borderClass = 'border border-slate-200 dark:border-slate-700';

    if (data.level === 1) { 
        bgClass = 'bg-indigo-600'; 
        textClass = 'text-white'; 
        borderClass = 'border-none shadow-lg shadow-indigo-500/30'; 
    }
    if (data.level === 2) { 
        bgClass = 'bg-sky-500'; 
        textClass = 'text-white'; 
        borderClass = 'border-none shadow-md shadow-sky-500/20'; 
    }
    if (data.level === 3) { 
        borderClass = 'border-2 border-sky-500 dark:border-sky-400'; 
        textClass = 'text-slate-800 dark:text-slate-100'; 
    }

    return (
        <div className={`relative px-4 py-2 rounded-xl shadow-sm transition-transform hover:scale-105 hover:shadow-md min-w-[150px] text-center ${bgClass} ${textClass} ${borderClass}`}>
            
            {/* 🚀 VISUAL MASTERY BADGE */}
            {data.isReviewed && (
                <div className="absolute -top-2 -left-2 bg-green-500 text-white rounded-full p-0.5 shadow-sm border-2 border-white dark:border-slate-900 z-20">
                    <CheckCircle2 size={12} strokeWidth={3} />
                </div>
            )}

            {data.level !== 1 && <Handle type="target" position={Position.Left} className="opacity-0" />}
            
            <div className="font-bold text-sm">{data.label}</div>
            
            {data.hasChildren && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation(); 
                        data.onToggle();
                    }}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-md hover:bg-indigo-50 hover:text-indigo-600 hover:scale-110 hover:border-indigo-200 transition-all z-10"
                    title={data.isCollapsed ? "Expand" : "Collapse"}
                >
                    {data.isCollapsed ? <Plus size={14} strokeWidth={3} /> : <Minus size={14} strokeWidth={3} />}
                </button>
            )}

            <Handle type="source" position={Position.Right} className="opacity-0" />
        </div>
    );
};

// --- MAIN COMPONENT ---
export default function InteractiveMindMap({ mapData, studentId, mapId }) {
    
    const activeData = useMemo(() => {
        const raw = mapData || fallbackData;
        try {
            let parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);

            let idCounter = 0;
            const assignStableIds = (node) => {
                if (!node.id) node.id = `auto-node-${idCounter++}`;
                if (node.children) node.children.forEach(assignStableIds);
            };
            assignStableIds(parsed);
            return parsed;
        } catch {
            return fallbackData;
        }
    }, [mapData]);

    const [expandedIds, setExpandedIds] = useState(new Set());
    const [reviewedNodes, setReviewedNodes] = useState(new Set()); // 🚀 NEW: Progress Tracking State
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [activeNode, setActiveNode] = useState(null); 
    const [isMinimized, setIsMinimized] = useState(false);

    // 🚀 NEW: Fetch Progress from Supabase
    useEffect(() => {
        if (!studentId || !mapId) return;
        const fetchProgress = async () => {
            const { data } = await supabase
                .from('flashcard_progress')
                .select('card_id')
                .eq('student_id', studentId)
                .eq('deck_id', mapId);
            
            if (data) {
                setReviewedNodes(new Set(data.map(d => d.card_id)));
            }
        };
        fetchProgress();
    }, [studentId, mapId]);

    // 🚀 NEW: Handle Marking a Node as Reviewed
    const handleMarkReviewed = async (nodeId) => {
        if (!studentId || !mapId || !nodeId) return;

        // Optimistic UI Update
        setReviewedNodes(prev => new Set(prev).add(nodeId));

        // Background Sync
        await supabase.from('flashcard_progress').upsert({
            student_id: studentId,
            deck_id: mapId,
            card_id: nodeId,
            status: 'reviewed',
            reviewed_at: new Date().toISOString()
        }, { onConflict: 'student_id, deck_id, card_id' });
    };

    useEffect(() => {
        if (activeData && activeData.id) {
            setExpandedIds(new Set([String(activeData.id)]));
        } else {
            setExpandedIds(new Set());
        }
    }, [activeData]);

    const toggleNode = useCallback((id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    // 🚀 Pass reviewedNodes to layout engine
    useEffect(() => {
        if (!activeData) return;
        const { initialNodes, initialEdges } = getLayoutedElements(activeData, expandedIds, toggleNode, reviewedNodes);
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [activeData, expandedIds, toggleNode, reviewedNodes]);

    const nodeTypes = useMemo(() => ({ customNode: CustomNode, default: CustomNode }), []);
    const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

    const onNodeClick = (event, node) => {
        setActiveNode(node.data);
        setIsMinimized(false); 
    };

    return (
        <div className="w-full h-[70vh] bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative shadow-inner">
            <style>{`.react-flow__node { transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); }`}</style>

            <ReactFlow 
                nodes={nodes} 
                edges={edges} 
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onPaneClick={() => setActiveNode(null)} 
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.2}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={true}
            >
                <Background color="#cbd5e1" gap={16} size={1} />
                <Controls className="shadow-md rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 [&_button]:bg-white dark:[&_button]:bg-slate-800 [&_button]:text-slate-600 dark:[&_button]:text-slate-300 [&_button]:border-b [&_button]:border-slate-100 dark:[&_button]:border-slate-700 hover:[&_button]:bg-slate-50 dark:hover:[&_button]:bg-slate-700 [&_button:last-child]:border-none [&_path]:fill-current transition-colors" />
            </ReactFlow>

            {/* --- KNOWLEDGE HUB UI --- */}
            {activeNode && (
                <div className={`absolute top-4 right-4 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-in slide-in-from-right-4 z-10 transition-all duration-300 ${isMinimized ? 'h-12' : 'max-h-[90%]'}`}>
                    
                    <div 
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="bg-slate-100 dark:bg-slate-800 p-3 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 cursor-pointer select-none group shrink-0"
                    >
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                            <Info size={14}/> Knowledge Hub
                        </span>
                        
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                {isMinimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setActiveNode(null); }} className="p-1 text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <div className="p-5 overflow-y-auto flex-1 flex flex-col">
                            <div className="flex-1">
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

                            {/* 🚀 NEW: MARK AS UNDERSTOOD BUTTON */}
                            {studentId && mapId && (
                                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
                                    <button
                                        onClick={() => handleMarkReviewed(activeNode.id)}
                                        disabled={activeNode.isReviewed}
                                        className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                                            activeNode.isReviewed
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-not-allowed'
                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 active:scale-95'
                                        }`}
                                    >
                                        <CheckCircle2 size={18} />
                                        {activeNode.isReviewed ? 'Mastered' : 'Mark as Understood'}
                                    </button>
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
    "children": []
};