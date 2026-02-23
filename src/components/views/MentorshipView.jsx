import React from 'react';
import { UserPlus, Mail, Calendar, Video } from 'lucide-react';

const MentorshipView = ({ mentor }) => {
    return (
        <div className="space-y-6 pb-20 animate-in fade-in">
            {/* Header Section */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Academic Mentorship</h1>
                    <p className="text-sm text-slate-500 mt-1">Connect with your assigned faculty guide.</p>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full shadow-sm border border-indigo-100 dark:border-indigo-800">
                    <UserPlus size={20} />
                </div>
            </div>

            {mentor ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
                        {/* Avatar */}
                        <div className="w-32 h-32 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400 border-4 border-white dark:border-slate-800 shadow-lg shrink-0">
                            <span className="font-bold text-4xl">
                                {mentor.full_name?.substring(0, 2).toUpperCase() || 'M'}
                            </span>
                        </div>

                        {/* Details & Actions */}
                        <div className="flex-1 text-center md:text-left space-y-4">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-800 dark:text-white">
                                    {mentor.full_name}
                                </h2>
                                <p className="text-slate-500 font-medium flex items-center justify-center md:justify-start gap-2 mt-1">
                                    <Mail size={16} /> {mentor.email}
                                </p>
                            </div>
                            
                            <p className="text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                                Your mentor is here to guide your academic journey, help you navigate challenges, and assist with career planning.
                            </p>

                            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                                <a 
                                    href={`mailto:${mentor.email}?subject=Mentorship%20Meeting%20Request`}
                                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
                                >
                                    <Mail size={18} /> Email Mentor
                                </a>
                                <button 
                                    className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95"
                                    onClick={() => alert("Meeting scheduler integration coming soon!")}
                                >
                                    <Calendar size={18} /> Request Meeting
                                </button>
                                <button 
                                    className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95"
                                    onClick={() => alert("Virtual office hours integration coming soon!")}
                                >
                                    <Video size={18} /> Office Hours
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-12 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-6">
                        <UserPlus size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No Mentor Assigned</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        You have not been assigned an academic mentor yet. Please contact your department head or organization administrator to request assignment.
                    </p>
                </div>
            )}
        </div>
    );
};

export default MentorshipView;