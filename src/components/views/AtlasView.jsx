import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import InteractiveMindMap from '../layout/InteractiveMindMap'; // Or wherever your file is
import { Folder, ChevronDown, ChevronRight, Layers, FileText, CheckCircle2 } from 'lucide-react';

// 🚀 ADDED 'session' PROP to identify the student
const AtlasView = ({ session }) => {
    const [activeTab, setActiveTab] = useState('flashcards');
    const [flashcards, setFlashcards] = useState([]);
    const [mindmaps, setMindmaps] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // 🛡️ PROGRESS TRACKING ENGINE
    const [flippedCards, setFlippedCards] = useState({}); 
    const [reviewedCards, setReviewedCards] = useState(new Set()); // Start empty, hydrate from cloud
    const [expandedChapters, setExpandedChapters] = useState({});

    useEffect(() => {
        const fetchAtlasData = async () => {
            if (!session?.user?.id) return;
            setLoading(true);
            
            try {
                // 1. Paginated Fetch for Flashcards
                let allCards = [];
                let start = 0;
                const step = 1000;
                
                while (true) {
                    const { data, error } = await supabase
                        .from('atlas_flashcards')
                        .select('*')
                        .eq('is_published', true)
                        .range(start, start + step - 1);
                    
                    if (error) throw error;
                    if (!data || data.length === 0) break;
                    
                    allCards = [...allCards, ...data];
                    if (data.length < step) break; 
                    start += step; 
                }

                // 2. Paginated Fetch for Mind Maps
                let allMaps = [];
                let mStart = 0;
                
                while (true) {
                    const { data, error } = await supabase
                        .from('atlas_mindmaps')
                        .select('*')
                        .eq('is_published', true)
                        .range(mStart, mStart + step - 1);
                    
                    if (error) throw error;
                    if (!data || data.length === 0) break;
                    
                    allMaps = [...allMaps, ...data];
                    if (data.length < step) break;
                    mStart += step;
                }

                // 🚀 3. FETCH CLOUD PROGRESS
                const { data: progressData } = await supabase
                    .from('flashcard_progress')
                    .select('card_id')
                    .eq('student_id', session.user.id);

                if (progressData) {
                    setReviewedCards(new Set(progressData.map(p => p.card_id)));
                }

                setFlashcards(allCards);
                setMindmaps(allMaps);

            } catch (error) {
                console.error("Atlas Data Fetch Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAtlasData();
    }, [session]);

    // 🚀 CLOUD SYNC: Handle Flip and save to Database
    const toggleFlip = async (card) => {
        // Toggle the visual flip animation instantly
        setFlippedCards(prev => ({ ...prev, [card.id]: !prev[card.id] }));
        
        // If not already reviewed, mark it and sync to Supabase
        if (!reviewedCards.has(card.id)) {
            // Optimistic UI update
            setReviewedCards(prev => new Set(prev).add(card.id));

            // Background Cloud Sync
            try {
                await supabase.from('flashcard_progress').upsert({
                    student_id: session.user.id,
                    deck_id: card.chapter || 'Flashcards', // Group by chapter
                    card_id: card.id,
                    status: 'reviewed',
                    reviewed_at: new Date().toISOString()
                }, { onConflict: 'student_id, deck_id, card_id' });
            } catch (err) {
                console.error("Failed to sync progress:", err);
            }
        }
    };

    const toggleFolder = (chapter) => {
        setExpandedChapters(prev => ({ ...prev, [chapter]: !prev[chapter] }));
    };

    // --- THE GROUPING ENGINE ---
    const groupedFlashcards = flashcards.reduce((acc, card) => {
        const chap = card.chapter || 'Uncategorized';
        if (!acc[chap]) acc[chap] = [];
        acc[chap].push(card);
        return acc;
    }, {});

    const groupedMindmaps = mindmaps.reduce((acc, map) => {
        const chap = map.chapter || 'Uncategorized';
        if (!acc[chap]) acc[chap] = [];
        acc[chap].push(map);
        return acc;
    }, {});

    return (
        <div className="space-y-6 pb-20 animate-in fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Layers size={24} className="text-indigo-500" /> Study Atlas
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Interactive review materials curated by your faculty.</p>
                </div>
                
                {/* Tab Navigation */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-full md:w-auto">
                    <button 
                        onClick={() => setActiveTab('flashcards')} 
                        className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${
                            activeTab === 'flashcards' 
                                ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' 
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        Flashcards
                    </button>
                    <button 
                        onClick={() => setActiveTab('mindmaps')} 
                        className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${
                            activeTab === 'mindmaps' 
                                ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' 
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        Mind Maps
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-bold tracking-widest uppercase text-xs animate-pulse">Loading Atlas Data...</p>
                </div>
            ) : (
                <div className="space-y-8">
                    
                    {/* --- FLASHCARDS TAB --- */}
                    {activeTab === 'flashcards' && (
                        Object.keys(groupedFlashcards).length === 0 ? (
                            <div className="p-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center gap-3">
                                <Folder size={32} className="opacity-50" />
                                <span className="italic font-medium">No flashcards published yet.</span>
                            </div>
                        ) : (
                            Object.entries(groupedFlashcards)
                                .sort(([chapA], [chapB]) => chapA.localeCompare(chapB, undefined, { numeric: true, sensitivity: 'base' }))
                                .map(([chapterName, cards]) => {
                                    
                                    const reviewedCount = cards.filter(c => reviewedCards.has(c.id)).length;
                                    const totalCount = cards.length;
                                    const progressPercent = Math.round((reviewedCount / totalCount) * 100);

                                    return (
                                        <div key={chapterName} className="space-y-4 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
                                            
                                            {/* Folder Header */}
                                            <div 
                                                onClick={() => toggleFolder(chapterName)}
                                                className="flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none group"
                                            >
                                                <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                                                        {expandedChapters[chapterName] ? <ChevronDown size={20} className="text-slate-500" /> : <ChevronRight size={20} className="text-slate-500" />}
                                                    </div>
                                                    <Folder size={24} className="text-indigo-500 shrink-0" /> 
                                                    <span className="truncate">{chapterName}</span>
                                                </h3>

                                                {/* Folder Progress Bar */}
                                                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700/50 ml-11 md:ml-0">
                                                    <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-500 ${progressPercent === 100 ? 'bg-green-500' : 'bg-indigo-500'}`} 
                                                            style={{ width: `${progressPercent}%` }} 
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-widest">
                                                        {reviewedCount} / {totalCount}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {/* Folder Content (Cards) */}
                                            {expandedChapters[chapterName] && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                                                    {cards.map(card => {
                                                        const isReviewed = reviewedCards.has(card.id);

                                                        return (
                                                            // 🚀 UPDATED: Pass the whole card object instead of just the ID
                                                            <div key={card.id} onClick={() => toggleFlip(card)} className="cursor-pointer group perspective-1000 h-64 w-full">
                                                                <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${flippedCards[card.id] ? 'rotate-y-180' : ''}`}>
                                                                    
                                                                    {/* Front of Card (Question) */}
                                                                    <div className={`absolute inset-0 backface-hidden bg-slate-50 dark:bg-slate-800 rounded-2xl border p-6 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md transition-all
                                                                        ${isReviewed 
                                                                            ? 'border-green-200 dark:border-green-900/30 bg-green-50/30 dark:bg-green-900/10' 
                                                                            : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                                                        }
                                                                    `}>
                                                                        <span className="absolute top-4 left-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div> Question
                                                                        </span>

                                                                        {/* Reviewed Badge */}
                                                                        {isReviewed && (
                                                                            <span className="absolute top-4 right-4 text-[10px] font-bold text-green-600 dark:text-green-500 uppercase tracking-widest flex items-center gap-1 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-md">
                                                                                <CheckCircle2 size={12} /> Reviewed
                                                                            </span>
                                                                        )}

                                                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-relaxed">{card.question}</h3>
                                                                        
                                                                        <span className="absolute bottom-4 text-xs font-medium text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">Click to flip</span>
                                                                    </div>
                                                                    
                                                                    {/* Back of Card (Answer) */}
                                                                    <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 p-6 flex flex-col justify-center items-center text-center shadow-sm">
                                                                        <span className="absolute top-4 left-4 text-[10px] font-bold text-indigo-400 dark:text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> Answer
                                                                        </span>
                                                                        <p className="text-md font-medium text-indigo-900 dark:text-indigo-100 leading-relaxed overflow-y-auto w-full no-scrollbar px-2">{card.answer}</p>
                                                                    </div>

                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                        )
                    )}

                    {/* --- MIND MAPS TAB --- */}
                    {activeTab === 'mindmaps' && (
                        Object.keys(groupedMindmaps).length === 0 ? (
                            <div className="p-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center gap-3">
                                <FileText size={32} className="opacity-50" />
                                <span className="italic font-medium">No mind maps published yet.</span>
                            </div>
                        ) : (
                            Object.entries(groupedMindmaps)
                                .sort(([chapA], [chapB]) => chapA.localeCompare(chapB, undefined, { numeric: true, sensitivity: 'base' }))
                                .map(([chapterName, maps]) => (
                                <div key={chapterName} className="space-y-4 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
                                    <h3 
                                        onClick={() => toggleFolder(chapterName)}
                                        className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-3 cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
                                    >
                                        <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                                            {expandedChapters[chapterName] ? <ChevronDown size={20} className="text-slate-500" /> : <ChevronRight size={20} className="text-slate-500" />}
                                        </div>
                                        <Folder size={24} className="text-indigo-500" /> 
                                        {chapterName}
                                    </h3>
                                    
                                    {expandedChapters[chapterName] && (
                                        <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                                            {maps.map(map => (
                                                <div key={map.id} className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                                                    
                                                    {/* Map Title Header */}
                                                    <div className="bg-slate-100 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                                                        <FileText size={18} className="text-slate-500 dark:text-slate-400" />
                                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{map.title}</h3>
                                                    </div>

                                                    <div className="p-6">
                                                        {/* Summary Content */}
                                                        {map.summary_html && map.summary_html !== '<p></p>' && (
                                                            <div 
                                                                className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 mb-8 leading-relaxed prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-a:text-indigo-500 hover:prose-a:text-indigo-600 [&_p:empty]:h-4" 
                                                                dangerouslySetInnerHTML={{ __html: map.summary_html }} 
                                                            />
                                                        )}

                                                        {/* Interactive Diagram */}
                                                        {map.map_data && (
                                                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-inner">
                                                                {/* 🚀 ADDED STUDENT ID AND MAP ID PROPS */}
                                                                <InteractiveMindMap 
                                                                    mapData={map.map_data} 
                                                                    studentId={session?.user?.id}
                                                                    mapId={map.id}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default AtlasView;