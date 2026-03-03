import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import InteractiveMindMap from '../layout/InteractiveMindMap'; 
import { Folder, ChevronDown, ChevronRight, Layers, FileText, CheckCircle2, Users, Book } from 'lucide-react';

const AtlasView = ({ session }) => {
    const [activeTab, setActiveTab] = useState('flashcards');
    const [flashcards, setFlashcards] = useState([]);
    const [mindmaps, setMindmaps] = useState([]);
    const [deployments, setDeployments] = useState([]);
    const [classMap, setClassMap] = useState({});
    const [orgId, setOrgId] = useState(null); 
    const [loading, setLoading] = useState(true);
    
    // 🛡️ PROGRESS & UI STATE ENGINE
    const [flippedCards, setFlippedCards] = useState({}); 
    const [reviewedCards, setReviewedCards] = useState(new Set()); 
    const [expandedChapters, setExpandedChapters] = useState({});
    const [expandedClassrooms, setExpandedClassrooms] = useState({});

// 1. DATA FETCHING ENGINE
    useEffect(() => {
        const fetchAtlasData = async () => {
            if (!session?.user?.id) return;
            setLoading(true);
            
            try {
                // 1. Fetch the student's org_id
                const { data: userProfile } = await supabase
                    .from('user_master')
                    .select('org_id')
                    .eq('user_id', session.user.id)
                    .single();
                
                const fetchedOrgId = userProfile?.org_id;
                setOrgId(fetchedOrgId);

                // 2. Fetch Enrollments (🚀 SHIELD ACTIVATED: IGNORES SUSPENDED USERS)
                const { data: enrollments } = await supabase
                    .from('classroom_enrollments')
                    .select('classroom_id, classroom_master(name, subject)')
                    .eq('student_id', session.user.id)
                    .eq('is_suspended', false);
                
                const myClassIds = [];
                const cMap = {};
                (enrollments || []).forEach(e => {
                    myClassIds.push(e.classroom_id);
                    if (e.classroom_master) {
                        cMap[e.classroom_id] = {
                            name: e.classroom_master.name,
                            subject: e.classroom_master.subject || 'General Studies'
                        };
                    }
                });

                if (myClassIds.length === 0 || !fetchedOrgId) {
                    setFlashcards([]); setMindmaps([]); setDeployments([]); setClassMap({});
                    setLoading(false); return;
                }

                // 3. Fetch Authorized Folders from the Bridge Table
                const { data: deploymentData } = await supabase
                    .from('material_deployments')
                    .select('material_type, material_reference_id, classroom_id')
                    .eq('org_id', fetchedOrgId)
                    .in('classroom_id', myClassIds);
                
                const authorizedFlashcardFolders = [...new Set((deploymentData || []).filter(d => d.material_type === 'flashcard_folder').map(d => d.material_reference_id))];
                const authorizedMindmapFolders = [...new Set((deploymentData || []).filter(d => d.material_type === 'mindmap_folder').map(d => d.material_reference_id))];

                // 🚀 4. OPTIMIZED FETCH WITH AUTO-PAGINATION
                const authorizedFlashcardNames = [...new Set(authorizedFlashcardFolders.map(ref => ref.split('_').slice(1).join('_')))];
                const authorizedMindmapNames = [...new Set(authorizedMindmapFolders.map(ref => ref.split('_').slice(1).join('_')))];

                let allCards = [];
                if (authorizedFlashcardNames.length > 0) {
                    let fetchMore = true;
                    let startIdx = 0;
                    const step = 1000;
                    let fullCardData = [];

                    while (fetchMore) {
                        const { data: cardData } = await supabase
                            .from('atlas_flashcards')
                            .select('*')
                            .eq('org_id', fetchedOrgId)
                            .in('chapter', authorizedFlashcardNames)
                            .range(startIdx, startIdx + step - 1);

                        if (cardData && cardData.length > 0) {
                            fullCardData = [...fullCardData, ...cardData];
                            startIdx += step;
                            if (cardData.length < step) fetchMore = false; 
                        } else {
                            fetchMore = false;
                        }
                    }
                     
                    allCards = fullCardData.filter(card => {
                        const uniqueRef = `${card.department_id}_${card.chapter}`;
                        return authorizedFlashcardFolders.includes(uniqueRef);
                    });
                }

                let allMaps = [];
                if (authorizedMindmapNames.length > 0) {
                    let fetchMore = true;
                    let startIdx = 0;
                    const step = 1000;
                    let fullMapData = [];

                    while (fetchMore) {
                        const { data: mapData } = await supabase
                            .from('atlas_mindmaps')
                            .select('*')
                            .eq('org_id', fetchedOrgId)
                            .in('chapter', authorizedMindmapNames)
                            .range(startIdx, startIdx + step - 1);
                        
                        if (mapData && mapData.length > 0) {
                            fullMapData = [...fullMapData, ...mapData];
                            startIdx += step;
                            if (mapData.length < step) fetchMore = false;
                        } else {
                            fetchMore = false;
                        }
                    }
                    
                    allMaps = fullMapData.filter(map => {
                        const uniqueRef = `${map.department_id}_${map.chapter}`;
                        return authorizedMindmapFolders.includes(uniqueRef);
                    });
                }

                // 5. FETCH CLOUD PROGRESS
                const { data: progressData } = await supabase.from('flashcard_progress').select('card_id').eq('student_id', session.user.id);
                if (progressData) setReviewedCards(new Set(progressData.map(p => p.card_id)));

                // Save to state
                setFlashcards(allCards);
                setMindmaps(allMaps);
                setDeployments(deploymentData || []);
                setClassMap(cMap);

            } catch (error) {
                console.error("Atlas Data Fetch Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAtlasData();
    }, [session]);

    // 2. SILENT LOCAL STORAGE MIGRATION ENGINE
    useEffect(() => {
        const migrateLocalData = async () => {
            if (!session?.user?.id || flashcards.length === 0) return;
            const localSaved = localStorage.getItem('atlas_reviewed_cards');
            if (!localSaved) return; 

            try {
                const localIds = JSON.parse(localSaved);
                if (!Array.isArray(localIds) || localIds.length === 0) { localStorage.removeItem('atlas_reviewed_cards'); return; }

                const payload = localIds.map(id => {
                    const card = flashcards.find(c => c.id === id);
                    return { student_id: session.user.id, deck_id: card?.chapter || 'Uncategorized', card_id: id, status: 'reviewed', reviewed_at: new Date().toISOString() };
                });

                const { error } = await supabase.from('flashcard_progress').upsert(payload, { onConflict: 'student_id, deck_id, card_id' });
                if (!error) {
                    setReviewedCards(prev => { const next = new Set(prev); localIds.forEach(id => next.add(id)); return next; });
                    localStorage.removeItem('atlas_reviewed_cards');
                }
            } catch (err) {}
        };
        migrateLocalData();
    }, [flashcards, session]); 

    // --- INTERACTION HANDLERS ---
    const toggleFlip = async (card) => {
        setFlippedCards(prev => ({ ...prev, [card.id]: !prev[card.id] }));
        if (!reviewedCards.has(card.id)) {
            setReviewedCards(prev => new Set(prev).add(card.id));
            try {
                await supabase.from('flashcard_progress').upsert({
                    student_id: session.user.id, org_id: orgId, deck_id: card.chapter || 'Uncategorized', card_id: card.id, status: 'reviewed', reviewed_at: new Date().toISOString()
                }, { onConflict: 'student_id, deck_id, card_id' });
            } catch (err) {}
        }
    };

    const toggleFolder = (folderKey) => setExpandedChapters(prev => ({ ...prev, [folderKey]: !prev[folderKey] }));
    const toggleClassroom = (classId) => setExpandedClassrooms(prev => ({ ...prev, [classId]: prev[classId] === false ? true : false }));

    // --- 🚀 THE NESTED GROUPING ENGINE (CLASSROOM -> FOLDER -> ITEMS) ---
    const groupedFlashcards = useMemo(() => {
        const acc = {};
        deployments.filter(d => d.material_type === 'flashcard_folder').forEach(d => {
            const cId = d.classroom_id;
            const cInfo = classMap[cId] || { name: 'Unknown Classroom', subject: 'General' };
            const fullRef = d.material_reference_id; // e.g. "deptId_Chapter 1"
            
            // Find cards that match this specific deployment uniqueRef
            const cardsInFolder = flashcards.filter(c => `${c.department_id}_${c.chapter}` === fullRef);
            
            if (cardsInFolder.length > 0) {
                if (!acc[cId]) acc[cId] = { id: cId, name: cInfo.name, subject: cInfo.subject, folders: {} };
                // Use the clean chapter name for the UI label
                const cleanName = cardsInFolder[0].chapter; 
                acc[cId].folders[cleanName] = cardsInFolder;
            }
        });
        return acc;
    }, [flashcards, deployments, classMap]);

    const groupedMindmaps = useMemo(() => {
        const acc = {};
        deployments.filter(d => d.material_type === 'mindmap_folder').forEach(d => {
            const cId = d.classroom_id;
            const cInfo = classMap[cId] || { name: 'Unknown Classroom', subject: 'General' };
            const fullRef = d.material_reference_id;

            const mapsInFolder = mindmaps.filter(m => `${m.department_id}_${m.chapter}` === fullRef);
            
            if (mapsInFolder.length > 0) {
                if (!acc[cId]) acc[cId] = { id: cId, name: cInfo.name, subject: cInfo.subject, folders: {} };
                const cleanName = mapsInFolder[0].chapter;
                acc[cId].folders[cleanName] = mapsInFolder;
            }
        });
        return acc;
    }, [mindmaps, deployments, classMap]);

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
                    <button onClick={() => setActiveTab('flashcards')} className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'flashcards' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        Flashcards
                    </button>
                    <button onClick={() => setActiveTab('mindmaps')} className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'mindmaps' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
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
                    
                    {/* =========================================================
                        FLASHCARDS TAB 
                    ========================================================= */}
                    {activeTab === 'flashcards' && (
                        Object.keys(groupedFlashcards).length === 0 ? (
                            <div className="p-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center gap-3">
                                <Folder size={32} className="opacity-50" />
                                <span className="italic font-medium">No flashcards deployed to your classrooms yet.</span>
                            </div>
                        ) : (
                            Object.values(groupedFlashcards)
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((classGroup) => (
                                <div key={classGroup.id} className="mb-8 bg-slate-50 dark:bg-slate-900/30 rounded-3xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm">
                                    
                                    {/* 🚀 CLASSROOM HEADER */}
                                    <div 
                                        onClick={() => toggleClassroom(classGroup.id)}
                                        className="flex items-center justify-between p-4 cursor-pointer select-none group rounded-2xl hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900 transition-colors">
                                                {expandedClassrooms[classGroup.id] !== false ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                                    <Users size={20} className="text-indigo-500"/> {classGroup.name}
                                                </h2>
                                                {classGroup.subject && (
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                                        <Book size={12} /> {classGroup.subject}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                                            {Object.keys(classGroup.folders).length} Folders
                                        </span>
                                    </div>

                                    {/* 📂 FOLDERS WRAPPER */}
                                    {expandedClassrooms[classGroup.id] !== false && (
                                        <div className="space-y-4 mt-4 px-1 md:px-2 pb-2 animate-in slide-in-from-top-2">
                                            {Object.entries(classGroup.folders)
                                                .sort(([chapA], [chapB]) => chapA.localeCompare(chapB, undefined, { numeric: true, sensitivity: 'base' }))
                                                .map(([chapterName, cards]) => {
                                                    const folderKey = `${classGroup.id}-${chapterName}`;
                                                    const reviewedCount = cards.filter(c => reviewedCards.has(c.id)).length;
                                                    const totalCount = cards.length;
                                                    const progressPercent = Math.round((reviewedCount / totalCount) * 100);

                                                    return (
                                                        <div key={folderKey} className="space-y-4 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
                                                            <div onClick={() => toggleFolder(folderKey)} className="flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none group">
                                                                <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                                    <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                                                                        {expandedChapters[folderKey] ? <ChevronDown size={20} className="text-slate-500" /> : <ChevronRight size={20} className="text-slate-500" />}
                                                                    </div>
                                                                    <Folder size={24} className="text-indigo-500 shrink-0" /> 
                                                                    <span className="truncate">{chapterName}</span>
                                                                </h3>
                                                                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700/50 ml-11 md:ml-0">
                                                                    <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                        <div className={`h-full transition-all duration-500 ${progressPercent === 100 ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${progressPercent}%` }} />
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-widest">{reviewedCount} / {totalCount}</span>
                                                                </div>
                                                            </div>
                                                            
                                                            {expandedChapters[folderKey] && (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                                                                    {cards.map(card => {
                                                                        const isReviewed = reviewedCards.has(card.id);
                                                                        return (
                                                                            <div key={card.id} onClick={() => toggleFlip(card)} className="cursor-pointer group perspective-1000 h-64 w-full">
                                                                                <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${flippedCards[card.id] ? 'rotate-y-180' : ''}`}>
                                                                                    <div className={`absolute inset-0 backface-hidden bg-slate-50 dark:bg-slate-800 rounded-2xl border p-6 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md transition-all ${isReviewed ? 'border-green-200 dark:border-green-900/30 bg-green-50/30 dark:bg-green-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'}`}>
                                                                                        <span className="absolute top-4 left-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div> Question</span>
                                                                                        {isReviewed && <span className="absolute top-4 right-4 text-[10px] font-bold text-green-600 dark:text-green-500 uppercase tracking-widest flex items-center gap-1 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-md"><CheckCircle2 size={12} /> Reviewed</span>}
                                                                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-relaxed">{card.question}</h3>
                                                                                        <span className="absolute bottom-4 text-xs font-medium text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">Click to flip</span>
                                                                                    </div>
                                                                                    <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 p-6 flex flex-col justify-center items-center text-center shadow-sm">
                                                                                        <span className="absolute top-4 left-4 text-[10px] font-bold text-indigo-400 dark:text-indigo-500 uppercase tracking-widest flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> Answer</span>
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
                                                })}
                                        </div>
                                    )}
                                </div>
                            ))
                        )
                    )}

                    {/* =========================================================
                        MIND MAPS TAB 
                    ========================================================= */}
                    {activeTab === 'mindmaps' && (
                        Object.keys(groupedMindmaps).length === 0 ? (
                            <div className="p-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center gap-3">
                                <FileText size={32} className="opacity-50" />
                                <span className="italic font-medium">No mind maps deployed to your classrooms yet.</span>
                            </div>
                        ) : (
                            Object.values(groupedMindmaps)
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((classGroup) => (
                                <div key={classGroup.id} className="mb-8 bg-slate-50 dark:bg-slate-900/30 rounded-3xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm">
                                    
                                    {/* 🚀 CLASSROOM HEADER */}
                                    <div 
                                        onClick={() => toggleClassroom(classGroup.id)}
                                        className="flex items-center justify-between p-4 cursor-pointer select-none group rounded-2xl hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900 transition-colors">
                                                {expandedClassrooms[classGroup.id] !== false ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                                    <Users size={20} className="text-indigo-500"/> {classGroup.name}
                                                </h2>
                                                {classGroup.subject && (
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                                        <Book size={12} /> {classGroup.subject}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                                            {Object.keys(classGroup.folders).length} Folders
                                        </span>
                                    </div>

                                    {/* 📂 FOLDERS WRAPPER */}
                                    {expandedClassrooms[classGroup.id] !== false && (
                                        <div className="space-y-4 mt-4 px-1 md:px-2 pb-2 animate-in slide-in-from-top-2">
                                            {Object.entries(classGroup.folders)
                                                .sort(([chapA], [chapB]) => chapA.localeCompare(chapB, undefined, { numeric: true, sensitivity: 'base' }))
                                                .map(([chapterName, maps]) => {
                                                    const folderKey = `${classGroup.id}-${chapterName}`;
                                                    return (
                                                        <div key={folderKey} className="space-y-4 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
                                                            <h3 onClick={() => toggleFolder(folderKey)} className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-3 cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group">
                                                                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                                                                    {expandedChapters[folderKey] ? <ChevronDown size={20} className="text-slate-500" /> : <ChevronRight size={20} className="text-slate-500" />}
                                                                </div>
                                                                <Folder size={24} className="text-indigo-500" /> 
                                                                {chapterName}
                                                            </h3>
                                                            
                                                            {expandedChapters[folderKey] && (
                                                                <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                                                                    {maps.map(map => (
                                                                        <div key={map.id} className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                                                                            <div className="bg-slate-100 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                                                                                <FileText size={18} className="text-slate-500 dark:text-slate-400" />
                                                                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">{map.title}</h3>
                                                                            </div>
                                                                            <div className="p-6">
                                                                                {map.summary_html && map.summary_html !== '<p></p>' && (
                                                                                    <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 mb-8 leading-relaxed prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-a:text-indigo-500 hover:prose-a:text-indigo-600 [&_p:empty]:h-4" dangerouslySetInnerHTML={{ __html: map.summary_html }} />
                                                                                )}
                                                                                {map.map_data && (
                                                                                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-inner">
                                                                                        <InteractiveMindMap mapData={map.map_data} studentId={session?.user?.id} mapId={map.id} orgId={orgId} />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
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