import React from 'react';
import { RefreshCw, Bell, BookOpen, Clock, ShieldCheck } from 'lucide-react';

const DashboardView = ({ data, refresh }) => {
    // Destructure the data passed from App.jsx's dashboardData state
    const { announcements = [], myClassrooms = [] } = data || {};

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            
            {/* 🚀 COMMAND HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-800 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Overview</h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Your academic summary at a glance</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-800/50">
                        <ShieldCheck size={14} className="text-green-600 dark:text-green-500" />
                        <span className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest">System Secure</span>
                    </div>
                    <button 
                        onClick={refresh} 
                        className="p-3.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all active:scale-95 shadow-sm border border-indigo-100 dark:border-indigo-800 flex items-center justify-center"
                        title="Refresh Data"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>
            
            {/* 🚀 GRID LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* ANNOUNCEMENTS COLUMN */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <Bell size={16} className="text-amber-500" /> Official Broadcasts
                    </h3>
                    
                    {announcements.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-[24px] border border-dashed border-slate-200 dark:border-slate-800 shadow-sm">
                            <span className="text-xs font-bold uppercase tracking-widest">No recent broadcasts.</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {announcements.map(a => (
                                <div key={a.id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-800/50">
                                            {a.classroom?.name || 'Classroom Notice'}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                                            <Clock size={10}/> {new Date(a.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <b className="text-slate-800 dark:text-white text-base md:text-lg leading-tight block mb-2">{a.title}</b>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium whitespace-pre-wrap">
                                        {/* 🚀 THE FIX: Properly map the new `message` schema */}
                                        {a.message || a.body || a.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* CLASSROOMS COLUMN */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <BookOpen size={16} className="text-indigo-500" /> Active Enrollments
                    </h3>
                    
                    {myClassrooms.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-[24px] border border-dashed border-slate-200 dark:border-slate-800 shadow-sm">
                            <span className="text-xs font-bold uppercase tracking-widest">Not enrolled in any units.</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {myClassrooms.map(c => (
                                <div key={c.classroom_id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] shadow-sm flex items-center gap-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-lg border border-indigo-100 dark:border-indigo-800/50 group-hover:scale-105 transition-transform shrink-0">
                                        {c.name.substring(0, 1).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <span className="font-black text-slate-800 dark:text-slate-100 text-lg block leading-none mb-1 truncate">
                                            {c.name}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            ID: {c.classroom_id.substring(0,8)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default DashboardView;