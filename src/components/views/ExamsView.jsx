import React from 'react';

// 🔒 PATCH 2: JIT PROTOCOL ENFORCEMENT IS NOW HANDLED HERE
const ExamsView = ({ availableExams = [], pastExams = [], onStart }) => {
    const now = new Date();

    return (
        <div className="space-y-6 pb-20 animate-in fade-in">
            {/* Header Section */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Active & Upcoming Exams</h1>
                    <p className="text-sm text-slate-500 mt-1">Your scheduled assessments and past performance.</p>
                </div>
            </div>

            {/* Available Exams List */}
            <div className="space-y-4">
                {availableExams.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                        <span className="italic">No active exams found for your enrolled classes.</span>
                    </div>
                ) : (
                    availableExams.map(d => {
                        const scheduledTime = new Date(d.scheduled_at);
                        
                        // JIT Validation: Is the current time >= the scheduled time?
                        const isLive = d.status.toLowerCase() === 'live' || now >= scheduledTime;

                        return (
                            <div 
                                key={d.deployment_id} 
                                className={`p-6 bg-white dark:bg-slate-900 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm gap-4 transition-all ${
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
                                    <p className="text-sm text-slate-500 font-mono mt-1.5 flex items-center gap-2">
                                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                                            {d.classroom?.name}
                                        </span>
                                        • {d.duration_minutes} mins • 
                                        {scheduledTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                </div>
                                
                                <div className="w-full md:w-auto mt-4 md:mt-0">
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
                    })
                )}
            </div>

            {/* Past Results Section */}
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-12 mb-6">Past Results</h2>
            <div className="space-y-3">
                {pastExams.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                        <span className="italic">No assessment history available.</span>
                    </div>
                ) : (
                    pastExams.map(e => (
                        <div key={e.submission_id} className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity">
                            <div>
                                <h4 className="font-bold text-slate-700 dark:text-slate-200 text-lg">
                                    {e.exam_master?.title || 'Exam'}
                                </h4>
                                <span className="text-xs text-slate-500 mt-1 block">
                                    {new Date(e.submitted_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                            
                            <span className="font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-4 py-1.5 rounded-full border border-amber-100 dark:border-amber-800/50 text-xs shadow-sm uppercase tracking-wider">
                                SUBMITTED • Pending Release
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ExamsView;