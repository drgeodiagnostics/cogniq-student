import React from 'react';
import { RefreshCw, Bell, BookOpen } from 'lucide-react';

const DashboardView = ({ data, refresh }) => {
    // Destructure the data passed from App.jsx's dashboardData state
    const { announcements = [], myClassrooms = [] } = data || {};

    return (
        <div className="space-y-8 animate-in fade-in pb-20">
            {/* Header Section */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Overview</h1>
                    <p className="text-sm text-slate-500 mt-1">Your academic summary at a glance.</p>
                </div>
                <button 
                    onClick={refresh} 
                    className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors active:scale-95 shadow-sm border border-blue-100 dark:border-blue-800"
                    title="Refresh Data"
                >
                    <RefreshCw size={20} />
                </button>
            </div>
            
            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Announcements Column */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Bell size={18} className="text-amber-500" /> Announcements
                    </h3>
                    
                    {announcements.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                            <span className="italic">No new updates.</span>
                        </div>
                    ) : (
                        announcements.map(a => (
                            <div key={a.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                <b className="text-slate-800 dark:text-white text-lg">{a.title}</b>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">{a.body}</p>
                                <span className="text-xs font-medium text-slate-400 mt-3 block uppercase tracking-wider">
                                    {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                        ))
                    )}
                </div>
                
                {/* Classrooms Column */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <BookOpen size={18} className="text-blue-500" /> My Classrooms
                    </h3>
                    
                    {myClassrooms.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                            <span className="italic">Not enrolled in any classes.</span>
                        </div>
                    ) : (
                        myClassrooms.map(c => (
                            <div key={c.classroom_id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center gap-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-default">
                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-800">
                                    {c.name.substring(0, 1).toUpperCase()}
                                </div>
                                <span className="font-bold text-slate-700 dark:text-slate-200 text-lg">
                                    {c.name}
                                </span>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
};

export default DashboardView;