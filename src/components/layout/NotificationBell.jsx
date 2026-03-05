import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Bell, BookOpen, Layers, Megaphone, Trophy, Info, CheckCircle2, Trash2, ExternalLink } from 'lucide-react';

export default function NotificationBell({ userId, onNavigate }) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!userId) return;
        const fetchNotifications = async () => {
            const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).eq('is_archived', false).order('created_at', { ascending: false }).limit(10);
            if (data) { setNotifications(data); setUnreadCount(data.filter(n => !n.is_read).length); }
        };
        fetchNotifications();

        const sub = supabase.channel('student_notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, 
            (payload) => {
                if (!payload.new.is_archived) {
                    setNotifications(prev => [payload.new, ...prev].slice(0, 10));
                    setUnreadCount(prev => prev + 1);
                }
            }).subscribe();

        return () => supabase.removeChannel(sub);
    }, [userId]);

    const markAllAsRead = async () => {
        if (unreadCount === 0) return;
        setUnreadCount(0); setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    };

    const handleClearAll = async () => {
        setNotifications([]); setUnreadCount(0);
        await supabase.from('notifications').update({ is_archived: true }).eq('user_id', userId).eq('is_archived', false);
        setIsOpen(false);
    };

    const toggleDropdown = () => { if (!isOpen) markAllAsRead(); setIsOpen(!isOpen); };

    // Student-specific icons
    const getIcon = (type) => {
        switch(type) {
            case 'exam': return <BookOpen size={16} className="text-pink-500" />;
            case 'atlas': return <Layers size={16} className="text-indigo-500" />;
            case 'announcement': return <Megaphone size={16} className="text-amber-500" />;
            case 'grade': return <Trophy size={16} className="text-yellow-500" />;
            case 'success': return <CheckCircle2 size={16} className="text-green-500" />;
            default: return <Info size={16} className="text-slate-400" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={toggleDropdown} className={`relative p-2 rounded-xl transition-all ${isOpen ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800'}`}>
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white dark:border-slate-900"></span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 origin-top-right flex flex-col max-h-[500px]">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                        <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">Academic Alerts</h3>
                        {unreadCount > 0 && <span className="text-[9px] font-black bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 px-2.5 py-1 rounded-md uppercase tracking-widest">{unreadCount} New</span>}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-10 text-center flex flex-col items-center gap-3">
                                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center"><CheckCircle2 size={24} className="text-green-500 opacity-50" /></div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No new assignments!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {notifications.map(n => (
                                    <div key={n.id} className={`p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!n.is_read ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : 'bg-white dark:bg-slate-900'}`}>
                                        <div className="flex gap-4">
                                            <div className="mt-1 shrink-0 bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 h-fit">{getIcon(n.type)}</div>
                                            <div>
                                                <h4 className={`text-sm leading-tight ${!n.is_read ? 'font-black text-slate-800 dark:text-white' : 'font-bold text-slate-600 dark:text-slate-300'}`}>{n.title}</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-3">{n.message}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0 flex gap-2">
                        {notifications.length > 0 && (
                            <button onClick={handleClearAll} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                                <Trash2 size={14}/> Clear
                            </button>
                        )}
                        <button onClick={() => { setIsOpen(false); if (onNavigate) onNavigate('notifications'); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 transition-colors">
                            View History <ExternalLink size={14}/>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}