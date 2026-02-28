import React, { useState } from 'react';
import { 
    LayoutDashboard, BookOpen, Layers, Users, User, 
    LogOut, Menu, X, PanelLeftClose, PanelLeftOpen, ShieldCheck, Ban // 🚀 IMPORTED BAN ICON
} from 'lucide-react';

export default function StudentDashboardLayout({ userProfile, onSignOut, onNavigate, currentView, children }) {
    // 📱 Mobile/iPad Portrait Drawer State
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    // 💻 Desktop/iPad Landscape Collapse State
    const [isCollapsed, setIsCollapsed] = useState(false);

    // 🚀 INTERCEPTOR: SUSPENDED STUDENT LOCKOUT
    if (userProfile?.is_suspended) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-slate-100 p-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="max-w-md w-full text-center bg-slate-900 border border-red-900/50 p-10 rounded-[40px] shadow-2xl shadow-red-900/20">
                    <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                        <Ban size={48} className="animate-pulse" />
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-4">Access Revoked</h1>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8">
                        Your account has been suspended by the faculty administration due to security or integrity violations. You cannot access the assessment portal at this time.
                    </p>
                    <div className="bg-slate-800 border border-white/5 p-4 rounded-2xl mb-8">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Registration Record</span>
                        <span className="text-sm font-mono text-indigo-400">{userProfile?.regNo || 'UNKNOWN'}</span>
                    </div>
                    <button 
                        onClick={onSignOut}
                        className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-95 text-xs"
                    >
                        <LogOut size={18} /> Secure Logout
                    </button>
                </div>
            </div>
        );
    }

    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
        { id: 'exams', icon: BookOpen, label: 'Assessments' },
        { id: 'atlas', icon: Layers, label: 'Study Atlas' },
        { id: 'mentorship', icon: Users, label: 'Mentorship' },
    ];

    const handleNav = (id) => {
        onNavigate(id);
        setIsMobileOpen(false); // Auto-close drawer on mobile after clicking
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex font-sans text-slate-900 dark:text-slate-100 selection:bg-indigo-500/30">
            
            {/* --- MOBILE / IPAD PORTRAIT TOP NAV --- */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-[72px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-50 flex items-center justify-between px-4 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xl tracking-tight">
                    <ShieldCheck size={26} />
                    <span>CogniQ<span className="text-slate-800 dark:text-white">Ed</span></span>
                </div>
                <button 
                    onClick={() => setIsMobileOpen(true)} 
                    className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl active:scale-95 transition-all border border-slate-200 dark:border-slate-700"
                >
                    <Menu size={24} />
                </button>
            </div>

            {/* --- SIDEBAR OVERLAY (Mobile/Tablet Portrait) --- */}
            {isMobileOpen && (
                <div 
                    className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* --- THE SIDEBAR --- */}
            <aside 
                className={`fixed lg:static top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 flex flex-col transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
                ${isCollapsed ? 'lg:w-20' : 'w-72 lg:w-72'}`}
            >
                {/* Brand Header & Toggle */}
                <div className="h-[72px] flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div className={`flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-2xl tracking-tight overflow-hidden transition-opacity duration-300 ${isCollapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100 w-auto'}`}>
                        <ShieldCheck size={28} className="shrink-0" />
                        <span>CogniQ<span className="text-slate-800 dark:text-white">Ed</span></span>
                    </div>

                    {/* Desktop/iPad Landscape Collapse Button */}
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors shrink-0"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                    </button>

                    {/* Mobile Close Button */}
                    <button 
                        onClick={() => setIsMobileOpen(false)}
                        className="lg:hidden p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 no-scrollbar">
                    {!isCollapsed && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-4">Main Menu</p>}
                    
                    {navItems.map((item) => {
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNav(item.id)}
                                title={isCollapsed ? item.label : ""}
                                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all group ${
                                    isActive 
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-black' 
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 font-bold'
                                } ${isCollapsed ? 'lg:justify-center px-0' : 'justify-start'}`}
                            >
                                <item.icon size={22} className={`shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                {/* 🚀 UPGRADED: Secure ID Badge Profile Section */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
                    <div className={`flex flex-col gap-2 ${isCollapsed ? 'items-center' : ''}`}>
                        <button 
                            onClick={() => handleNav('profile')}
                            title={isCollapsed ? "Profile Settings" : "View Profile"}
                            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all border ${
                                currentView === 'profile' 
                                    ? 'bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800/50' 
                                    : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                            } ${isCollapsed ? 'lg:justify-center' : 'justify-start'}`}
                        >
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-black text-sm shrink-0">
                                {userProfile?.initials || <User size={18} />}
                            </div>
                            <div className={`text-left overflow-hidden transition-opacity duration-300 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                                <p className="text-sm font-black text-slate-800 dark:text-white truncate leading-tight">{userProfile?.name || 'Student Candidate'}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate mt-0.5">{userProfile?.regNo || 'Profile Settings'}</p>
                            </div>
                        </button>
                        
                        <button 
                            onClick={onSignOut}
                            title={isCollapsed ? "Secure Logout" : ""}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-bold ${isCollapsed ? 'lg:justify-center px-0' : 'justify-start'}`}
                        >
                            <LogOut size={20} className="shrink-0" />
                            <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                                Secure Logout
                            </span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 h-screen overflow-y-auto w-full custom-scrollbar relative">
                {/* Spacer for mobile fixed header */}
                <div className="h-[72px] lg:hidden w-full shrink-0"></div> 
                
                <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
                    {children}
                </div>
            </main>

        </div>
    );
}