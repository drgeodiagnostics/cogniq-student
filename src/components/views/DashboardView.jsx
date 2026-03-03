import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Bell, BookOpen, Clock, ShieldCheck, ThumbsUp, Users, User, Megaphone } from 'lucide-react';

// --- SUB-COMPONENT: ANNOUNCEMENT CARD ---
const AnnouncementCard = ({ a, currentUserId }) => {
    // Safely check if current student has already acknowledged this
    const [liked, setLiked] = useState(a.likes?.some(l => l.student_id === currentUserId) || false);
    const [likeCount, setLikeCount] = useState(a.likes?.length || 0);
    const [loading, setLoading] = useState(false);

    const toggleAcknowledge = async () => {
        if (loading || !currentUserId) return;
        setLoading(true);

        try {
            if (liked) {
                // Optimistic UI update (feels instant to the user)
                setLikeCount(prev => Math.max(0, prev - 1));
                setLiked(false);
                await supabase
                    .from('announcement_likes')
                    .delete()
                    .match({ announcement_id: a.id, student_id: currentUserId });
            } else {
                setLikeCount(prev => prev + 1);
                setLiked(true);
                await supabase
                    .from('announcement_likes')
                    .insert({ 
                        announcement_id: a.id, 
                        student_id: currentUserId,
                        org_id: a.org_id // 🚀 SECURE: Pass the org_id down from the announcement
                    });
            }
        } catch (error) {
            console.error("Failed to acknowledge:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all group flex flex-col">
            
            {/* Meta Tags (Classroom, Faculty, Date) */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="flex items-center gap-1 text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-800/50">
                    <Users size={10}/> {a.classroom?.name || a.classroom_master?.name || 'Classroom Notice'}
                </span>
                
                {/* Will only show if you updated the App.jsx fetch query! */}
                {(a.faculty?.full_name || a.user_master?.full_name) && (
                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-800 text-slate-500 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                        <User size={10}/> {a.faculty?.full_name || a.user_master?.full_name}
                    </span>
                )}
                
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700 ml-auto">
                    <Clock size={10}/> {new Date(a.created_at).toLocaleDateString()}
                </span>
            </div>

            {/* Message Content */}
            <b className="text-slate-800 dark:text-white text-base md:text-lg leading-tight flex items-start gap-2 mb-2">
                <Megaphone size={18} className="text-amber-500 shrink-0 mt-0.5" /> 
                {a.title}
            </b>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium whitespace-pre-wrap flex-1 mb-6">
                {a.message || a.body || a.content}
            </p>

            {/* Acknowledge Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-auto">
                <button 
                    onClick={toggleAcknowledge}
                    disabled={loading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50
                        ${liked 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                        }`}
                >
                    <ThumbsUp size={14} className={liked ? "fill-white" : ""} />
                    {liked ? 'Acknowledged' : 'Acknowledge'}
                </button>

                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {likeCount} {likeCount === 1 ? 'Acknowledgment' : 'Acknowledgements'}
                </div>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD VIEW ---
const DashboardView = ({ data, currentUserId }) => {
    const { announcements = [], myClassrooms = [] } = data || {};

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            
            {/* COMMAND HEADER */}
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
                </div>
            </div>
            
            {/* GRID LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* ANNOUNCEMENTS COLUMN */}
                <div className="space-y-4 flex flex-col">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <Bell size={16} className="text-amber-500" /> Official Broadcasts
                    </h3>
                    
                    {announcements.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-[24px] border border-dashed border-slate-200 dark:border-slate-800 shadow-sm flex-1">
                            <span className="text-xs font-bold uppercase tracking-widest">No recent broadcasts.</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {announcements.map(a => (
                                <AnnouncementCard 
                                    key={a.id} 
                                    a={a} 
                                    currentUserId={currentUserId} 
                                />
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
                                <div 
                                    key={c.classroom_id} 
                                    className={`p-5 bg-white dark:bg-slate-900 border rounded-[24px] shadow-sm flex items-center gap-4 transition-all group ${
                                        c.is_suspended 
                                        ? 'border-red-100 dark:border-red-900/30 opacity-80' 
                                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                                    }`}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border shrink-0 transition-transform ${
                                        c.is_suspended 
                                        ? 'bg-red-50 text-red-500 border-red-100 dark:bg-red-900/20 dark:border-red-800/50' 
                                        : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/50 group-hover:scale-105'
                                    }`}>
                                        {c.name.substring(0, 1).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className={`font-black text-lg block leading-none truncate ${
                                                c.is_suspended ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'
                                            }`}>
                                                {c.name}
                                            </span>
                                            {/* 🚨 THE RED SUSPENDED BADGE */}
                                            {c.is_suspended && (
                                                <span className="text-[9px] font-black text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded border border-red-100 dark:border-red-900/30 uppercase tracking-widest shrink-0">
                                                    Suspended
                                                </span>
                                            )}
                                        </div>
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