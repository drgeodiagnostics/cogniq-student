import React, { useState } from 'react';
import { Users, History, ChevronDown, ChevronRight } from 'lucide-react';

// 🔒 PATCH 4: COLLAPSIBLE GROUPED CLASSROOM ARCHITECTURE
const ExamsView = ({ availableExams = [], pastExams = [], onStart }) => {
    const now = new Date();

    // --- 🎛️ COLLAPSE STATES (Default to false/open) ---
    const [collapsedActive, setCollapsedActive] = useState({});
    const [collapsedPast, setCollapsedPast] = useState({});

    const toggleActive = (className) => setCollapsedActive(prev => ({ ...prev, [className]: !prev[className] }));
    const togglePast = (className) => setCollapsedPast(prev => ({ ...prev, [className]: !prev[className] }));

    // --- 🧩 THE GROUPING ENGINE ---
    const groupedAvailable = availableExams.reduce((acc, d) => {
        const cName = d.classroom?.name || 'Direct Assessments';
        if (!acc[cName]) acc[cName] = [];
        acc[cName].push(d);
        return acc;
    }, {});

    const groupedPast = pastExams.reduce((acc, e) => {
        const cName = e.exam_master?.classroom_master?.name || 'Recent Results';
        if (!acc[cName]) acc[cName] = [];
        acc[cName].push(e);
        return acc;
    }, {});

    return (
        <div className="space-y-8 pb-20 animate-in fade-in">
            {/* Header Section */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Assessments</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage your active exams and review past performance.</p>
                </div>
            </div>

            {/* --- ACTIVE & UPCOMING EXAMS --- */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Active & Upcoming</h2>
                
                {Object.keys(groupedAvailable).length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                        <span className="italic">No active exams found for your enrolled classes.</span>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedAvailable).map(([className, exams]) => (
                            <div key={className} className="space-y-4">
                                {/* Collapsible Classroom Group Header */}
                                <button 
                                    onClick={() => toggleActive(className)}
                                    className="w-full flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
                                            <Users size={16} />
                                        </div>
                                        {className}
                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full ml-2">
                                            {exams.length}
                                        </span>
                                    </div>
                                    <div className="text-slate-400 group-hover:text-indigo-500 transition-colors">
                                        {collapsedActive[className] ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                </button>

                                {/* Exams in this Classroom (Hidden if collapsed) */}
                                {!collapsedActive[className] && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                                        {exams.map(d => {
                                            const scheduledTime = new Date(d.scheduled_at);
                                            const isLive = d.status.toLowerCase() === 'live' || now >= scheduledTime;

                                            return (
                                                <div 
                                                    key={d.deployment_id} 
                                                    className={`p-6 bg-white dark:bg-slate-900 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm gap-4 transition-all ml-2 md:ml-6 ${
                                                        isLive 
                                                            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md transform hover:-translate-y-1' 
                                                            : 'border border-slate-200 dark:border-slate-800 opacity-80'
                                                    }`}
                                                >
                                                    <div>
                                                        <div className="flex gap-2 items-center mb-2">
                                                            {isLive ? (
                                                                <span className="text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 rounded-full uppercase flex items-center gap-1.5 shadow-sm">
                                                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE NOW
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-3 py-1 rounded-full uppercase tracking-wider">
                                                                    UPCOMING
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h3 className="font-bold text-xl text-slate-800 dark:text-white mt-1">
                                                            {d.exam?.title || 'Secure Assessment'}
                                                        </h3>
                                                        <p className="text-sm text-slate-500 font-mono mt-1 flex items-center gap-2">
                                                            {d.duration_minutes} mins • Opens: {scheduledTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="w-full md:w-auto mt-4 md:mt-0 shrink-0">
                                                        {isLive ? (
                                                            <button 
                                                                onClick={() => onStart(d)} 
                                                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-xl shadow-md transition-all active:scale-95 w-full focus:ring-4 focus:ring-blue-500/30"
                                                            >
                                                                Start Secure Exam
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                disabled 
                                                                className="bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold px-8 py-3.5 rounded-xl cursor-not-allowed w-full text-sm border border-slate-200 dark:border-slate-700"
                                                            >
                                                                Opens at {scheduledTime.toLocaleTimeString([], { timeStyle: 'short' })}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- PAST RESULTS --- */}
            <div className="pt-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <History size={20} className="text-slate-400" /> Past Results
                </h2>
                
                {Object.keys(groupedPast).length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                        <span className="italic">No assessment history available.</span>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedPast).map(([className, exams]) => (
                            <div key={className} className="space-y-3">
                                {/* Collapsible Past Results Header */}
                                <button 
                                    onClick={() => togglePast(className)}
                                    className="w-full flex items-center justify-between text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-2 mb-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{className}</span>
                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full lowercase tracking-normal">
                                            {exams.length} result{exams.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div className="text-slate-400 group-hover:text-indigo-400 transition-colors pr-2">
                                        {collapsedPast[className] ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                </button>
                                
                                {/* Past Exams (Hidden if collapsed) */}
                                {!collapsedPast[className] && (
                                    <div className="space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                                        {exams.map(e => (
                                            <div key={e.submission_id} className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity ml-2 md:ml-6">
                                                <div>
                                                    <h4 className="font-bold text-slate-700 dark:text-slate-200 text-lg">
                                                        {e.exam_master?.title || 'Exam'}
                                                    </h4>
                                                    <span className="text-xs text-slate-500 mt-1 block">
                                                        Submitted: {new Date(e.submitted_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                
                                                {e.status === 'published' ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-2xl font-black text-green-600 dark:text-green-400">
                                                            {e.score} <span className="text-sm font-medium text-slate-400 dark:text-slate-500">/ {e.total_marks}</span>
                                                        </span>
                                                        <span className="text-[10px] font-bold text-green-700 dark:text-green-500 uppercase tracking-widest mt-0.5">
                                                            Published
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-4 py-1.5 rounded-full border border-amber-100 dark:border-amber-800/50 text-xs shadow-sm uppercase tracking-wider">
                                                        Pending Release
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamsView;