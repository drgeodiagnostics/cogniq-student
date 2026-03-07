import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
    Target, ShieldCheck, AlertTriangle, TrendingUp, 
    TrendingDown, Minus, ChevronRight, Activity, 
    FileText, Award, Loader2, X, Stethoscope 
} from 'lucide-react';

export default function EpaStudentTracker({ profile }) {
    const [loading, setLoading] = useState(true);
    const [epaData, setEpaData] = useState([]);
    const [selectedEpa, setSelectedEpa] = useState(null);
    const [facultyMap, setFacultyMap] = useState({});

    // Standardized Scale Colors (Matches Faculty App)
    const scaleColors = {
        1: 'bg-rose-500', 2: 'bg-orange-500', 
        3: 'bg-amber-500', 4: 'bg-blue-500', 5: 'bg-emerald-500'
    };

    useEffect(() => {
        if (profile?.org_id && profile?.user_id) fetchEpaTelemetry();
    }, [profile]);

    const fetchEpaTelemetry = async () => {
        setLoading(true);
        try {
            // 1. Fetch Organization EPAs
            const { data: epas, error: epaErr } = await supabase
                .from('epa_master')
                .select('*')
                .eq('org_id', profile.org_id)
                .order('title');
            if (epaErr) throw epaErr;

            // 2. Fetch Student's Clinical Logs
            const { data: logs, error: logErr } = await supabase
                .from('clinical_assessment_log')
                .select('*')
                .eq('student_id', profile.user_id)
                .order('date_time', { ascending: false });
            if (logErr) throw logErr;

            // 3. Fetch Faculty Names to resolve the Foreign Key locally
            const facultyIds = [...new Set((logs || []).map(l => l.faculty_id))];
            let mappedFaculty = {};
            if (facultyIds.length > 0) {
                const { data: faculty } = await supabase
                    .from('user_master')
                    .select('user_id, full_name')
                    .in('user_id', facultyIds);
                mappedFaculty = (faculty || []).reduce((acc, f) => ({ ...acc, [f.user_id]: f.full_name }), {});
                setFacultyMap(mappedFaculty);
            }

            // 4. Data Aggregation Engine
            const processedEpas = (epas || []).map(epa => {
                const relatedLogs = (logs || []).filter(l => l.epa_id === epa.epa_id);
                const currentLevel = relatedLogs.length > 0 ? relatedLogs[0].entrustment_rating : 0;
                
                // Trend Analysis (Compares last 2 logs)
                let trend = 'neutral';
                if (relatedLogs.length >= 2) {
                    if (relatedLogs[0].entrustment_rating > relatedLogs[1].entrustment_rating) trend = 'up';
                    else if (relatedLogs[0].entrustment_rating < relatedLogs[1].entrustment_rating) trend = 'down';
                }

                return {
                    ...epa,
                    logs: relatedLogs,
                    currentLevel,
                    isEntrusted: currentLevel >= epa.target_level,
                    trend
                };
            });

            setEpaData(processedEpas);
        } catch (error) {
            console.error("EPA Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex flex-col items-center justify-center py-20"><Loader2 className="animate-spin text-indigo-500 mb-4" size={32} /><p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Loading Clinical Portfolio...</p></div>;
    }

    const entrustedCount = epaData.filter(e => e.isEntrusted).length;
    const totalCount = epaData.length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto">
            
            {/* HEADER DASHBOARD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-900 p-8 rounded-[32px] border border-slate-800 shadow-xl relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 opacity-10 text-indigo-500"><Target size={200} /></div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3 relative z-10">
                        <Award className="text-indigo-400"/> EPA Portfolio
                    </h2>
                    <p className="text-slate-400 mt-2 max-w-lg relative z-10">Track your clinical "Ready-for-Practice" entrustment levels across all mandatory organizational procedures.</p>
                </div>

                <div className="bg-indigo-600 p-8 rounded-[32px] shadow-lg shadow-indigo-600/20 text-white flex flex-col justify-center items-center text-center">
                    <div className="text-5xl font-black mb-1">{entrustedCount} <span className="text-2xl text-indigo-300">/ {totalCount}</span></div>
                    <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck size={14}/> EPAs Entrusted
                    </div>
                </div>
            </div>

            {/* EPA MATRIX GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {epaData.map(epa => (
                    <div 
                        key={epa.epa_id} 
                        onClick={() => setSelectedEpa(epa)}
                        className="bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer group flex flex-col h-full"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-black text-slate-800 dark:text-white text-lg leading-tight pr-4 group-hover:text-indigo-600 transition-colors">{epa.title}</h3>
                            {epa.trend === 'up' && <TrendingUp size={20} className="text-emerald-500 shrink-0"/>}
                            {epa.trend === 'down' && <TrendingDown size={20} className="text-rose-500 shrink-0"/>}
                            {epa.trend === 'neutral' && <Minus size={20} className="text-slate-300 shrink-0"/>}
                        </div>

                        <div className="flex-1">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress to Target</span>
                                <span className={`text-xs font-black px-2 py-1 rounded-md uppercase ${epa.isEntrusted ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                    {epa.isEntrusted ? 'Ready for Practice' : 'Developing'}
                                </span>
                            </div>

                            {/* SEGMENTED PROGRESS BAR */}
                            <div className="flex gap-1 h-3 w-full mt-3 relative">
                                {/* Target Marker Arrow */}
                                <div 
                                    className="absolute -top-3 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800 dark:border-t-white transition-all"
                                    style={{ left: `calc(${(epa.target_level / 5) * 100}% - 10px)` }}
                                    title={`Graduation Target: Level ${epa.target_level}`}
                                />
                                {[1, 2, 3, 4, 5].map(level => (
                                    <div 
                                        key={level} 
                                        className={`flex-1 rounded-sm transition-all duration-700 ${level <= epa.currentLevel ? scaleColors[level] : 'bg-slate-100 dark:bg-slate-800'}`}
                                    />
                                ))}
                            </div>
                            <div className="flex justify-between mt-1 px-1">
                                <span className="text-[9px] font-bold text-slate-400">L1</span>
                                <span className="text-[9px] font-bold text-slate-400">L5</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Activity size={14}/> {epa.logs.length} Logs</span>
                            <span className="text-xs font-black text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">View Timeline <ChevronRight size={14}/></span>
                        </div>
                    </div>
                ))}

                {epaData.length === 0 && (
                    <div className="col-span-1 lg:col-span-2 p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-[32px]">
                        <AlertTriangle size={40} className="text-slate-300 mx-auto mb-4" />
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No Competencies Defined</p>
                        <p className="text-xs text-slate-400 mt-1">Your institution has not configured any EPAs yet.</p>
                    </div>
                )}
            </div>

            {/* CLINICAL TIMELINE MODAL */}
            {selectedEpa && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start bg-slate-50 dark:bg-slate-950 shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight mb-1">{selectedEpa.title}</h3>
                                <p className="text-xs text-slate-500 font-medium line-clamp-2">{selectedEpa.description}</p>
                            </div>
                            <button onClick={() => setSelectedEpa(null)} className="p-2 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-full shadow-sm shrink-0"><X size={20}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {selectedEpa.logs.length === 0 ? (
                                <div className="text-center py-12 opacity-50">
                                    <Stethoscope size={48} className="mx-auto mb-4" />
                                    <p className="text-xs font-bold uppercase tracking-widest">No clinical observations logged</p>
                                </div>
                            ) : (
                                <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 space-y-8 pb-4">
                                    {selectedEpa.logs.map((log, idx) => (
                                        <div key={log.log_id} className="relative pl-6">
                                            {/* Timeline Node */}
                                            <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${scaleColors[log.entrustment_rating]}`}></div>
                                            
                                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Observed By</span>
                                                        <span className="text-sm font-bold text-slate-800 dark:text-white">{facultyMap[log.faculty_id] || 'Faculty Member'}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{new Date(log.date_time).toLocaleDateString()}</span>
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${log.complexity === 'High' ? 'bg-red-50 text-red-600' : log.complexity === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                                            {log.complexity} Comp
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="mb-3 flex items-center gap-2">
                                                    <span className={`px-3 py-1 rounded-lg text-xs font-black text-white ${scaleColors[log.entrustment_rating]}`}>
                                                        Level {log.entrustment_rating}
                                                    </span>
                                                </div>

                                                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><FileText size={12}/> Faculty Feedback</p>
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed">"{log.feedback_text}"</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}