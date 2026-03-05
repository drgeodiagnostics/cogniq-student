import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Bell, BookOpen, Layers, Megaphone, Trophy, Info, CheckCircle2, Loader2 } from 'lucide-react';

export default function NotificationsView({ profile }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile?.user_id) fetchHistory();
    }, [profile]);

    const fetchHistory = async () => {
        setLoading(true);
        const { data } = await supabase.from('notifications').select('*').eq('user_id', profile.user_id).order('created_at', { ascending: false }).limit(50);
        setNotifications(data || []); setLoading(false);
    };

    const getIcon = (type) => {
        switch(type) {
            case 'exam': return <BookOpen size={18} className="text-pink-500" />;
            case 'atlas': return <Layers size={18} className="text-indigo-500" />;
            case 'announcement': return <Megaphone size={18} className="text-amber-500" />;
            case 'grade': return <Trophy size={18} className="text-yellow-500" />;
            case 'success': return <CheckCircle2 size={18} className="text-green-500" />;
            default: return <Info size={18} className="text-slate-400" />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
                    <Bell size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Notification History</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Your past academic updates and alerts</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400"><Loader2 className="animate-spin mb-4 text-indigo-500" size={32} /><p className="text-xs font-bold uppercase tracking-widest">Loading Records...</p></div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400"><Bell className="mb-4 opacity-20" size={48} /><p className="text-xs font-bold uppercase tracking-widest">No history found.</p></div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {notifications.map(n => (
                            <div key={n.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-5">
                                <div className="mt-1 shrink-0 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-fit">{getIcon(n.type)}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-black text-slate-800 dark:text-white text-base">{n.title}</h4>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md shrink-0">{new Date(n.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-1">{n.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}