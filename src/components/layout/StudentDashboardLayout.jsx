import React, { useState } from 'react';
import { 
    LayoutDashboard, BookOpen, Layers, Users, User, 
    LogOut, Menu, X, ShieldCheck, Ban, RefreshCw, Bell 
} from 'lucide-react';

import NotificationBell from './NotificationBell';

// --- DRAWER NAVIGATION COMPONENT ---
const SideDrawer = ({ isOpen, onClose, userProfile, onSignOut, onNavigate, activeView }) => {
  const handleNavClick = (viewName) => {
    onNavigate(viewName);
    onClose();
  };

  const navItems = [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
      { id: 'exams', icon: BookOpen, label: 'Assessments' },
      { id: 'atlas', icon: Layers, label: 'Study Atlas' },
      { id: 'mentorship', icon: Users, label: 'Mentorship' },
      { id: 'notifications', icon: Bell, label: 'Notifications' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} 
        onClick={onClose} 
      />
      
      {/* Sliding Drawer */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        
        {/* Drawer Header (Profile Snapshot) */}
        <div className="p-6 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start flex-shrink-0">
          <div>
            <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg mb-3 shadow-lg shadow-indigo-500/20">
                {userProfile?.initials || 'ST'}
            </div>
            <h2 className="font-black text-slate-800 dark:text-white text-lg line-clamp-1 leading-tight">
                {userProfile?.name || 'Student Candidate'}
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                {userProfile?.regNo || 'Enrolled Scholar'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-300 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Drawer Links */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-3">Academic Modules</p>
            
            {navItems.map((item) => {
                const isActive = activeView === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all group ${
                            isActive 
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-black border border-indigo-100 dark:border-indigo-800/50' 
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 font-bold border border-transparent'
                        }`}
                    >
                        <item.icon size={20} className={`shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                        <span>{item.label}</span>
                    </button>
                );
            })}

            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-3">Account</p>
                <button
                    onClick={() => handleNavClick('profile')}
                    className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all group ${
                        activeView === 'profile' 
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-black border border-indigo-100 dark:border-indigo-800/50' 
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 font-bold border border-transparent'
                    }`}
                >
                    <User size={20} className={`shrink-0 transition-transform ${activeView === 'profile' ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span>My Profile</span>
                </button>
            </div>
        </nav>

        {/* Secure Logout */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-shrink-0">
          <button 
            onClick={onSignOut} 
            className="flex items-center justify-center w-full px-4 py-3 text-sm font-black uppercase tracking-widest text-red-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
          >
            <LogOut size={16} className="mr-2" /> Secure Logout
          </button>
        </div>
      </div>
    </>
  );
};


// --- MAIN LAYOUT COMPONENT ---
export default function StudentDashboardLayout({ userProfile, onSignOut, onNavigate, currentView, onRefresh, children }) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const handleGlobalSync = async () => {
        setIsSyncing(true);
        if (onRefresh) await onRefresh();
        setTimeout(() => setIsSyncing(false), 800); 
    };

    // View Title Mapping for the Header
    const viewTitles = {
        'dashboard': 'Overview',
        'exams': 'Assessments',
        'atlas': 'Study Atlas',
        'mentorship': 'Mentorship',
        'profile': 'My Profile'
    };
    const headerTitle = viewTitles[currentView] || 'Student Portal';

    // 🚨 INTERCEPTOR: SUSPENDED STUDENT LOCKOUT
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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
            
            {/* --- THE PERMANENT TOP HEADER --- */}
            <header className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 h-[72px] flex items-center justify-between z-30 shadow-sm">
                
                {/* Left Side: Brand & Menu */}
                <div className="flex items-center gap-2 md:gap-4">
                    <button 
                        onClick={() => setIsDrawerOpen(true)} 
                        className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors active:scale-95"
                    >
                        <Menu size={24} />
                    </button>
                    
                    <div className="flex flex-col">
                        <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <ShieldCheck size={12} className="text-indigo-500 hidden sm:block" />
                            CogniQ Ed • Student Portal
                        </span>
                        <span className="text-sm md:text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">
                            {headerTitle}
                        </span>
                    </div>
                </div>
                
                {/* Right Side: Tools & Profile */}
                <div className="flex items-center gap-1 md:gap-3">
                    
                    {/* SYNC BUTTON */}
                    <button 
                        onClick={handleGlobalSync}
                        disabled={isSyncing}
                        className="relative p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 active:scale-95"
                        title="Sync Database"
                    >
                        <RefreshCw size={20} className={isSyncing ? "animate-spin text-indigo-500" : ""} />
                    </button>

                    {/* DYNAMIC NOTIFICATION BELL */}
                    <div className="shrink-0 mr-1 md:mr-2">
                        <NotificationBell userId={userProfile?.user_id} onNavigate={onNavigate} /> {/* 👈 Added onNavigate here */}
                    </div>

                    {/* PROFILE BUTTON (Hidden text on small mobile) */}
                    <button 
                        onClick={() => onNavigate('profile')}
                        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 group active:scale-95"
                    >
                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center font-black text-xs shadow-sm group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                            {userProfile?.initials || 'ST'}
                        </div>
                        <span className="text-sm font-bold hidden sm:block text-slate-700 dark:text-slate-200">
                            {userProfile?.name?.split(' ')[0]} {/* First name only for clean header */}
                        </span>
                    </button>
                </div>
            </header>

            {/* --- THE SLIDING DRAWER --- */}
            <SideDrawer 
                isOpen={isDrawerOpen} 
                onClose={() => setIsDrawerOpen(false)} 
                userProfile={userProfile} 
                onSignOut={onSignOut} 
                onNavigate={onNavigate} 
                activeView={currentView} 
            />
            
            {/* --- MAIN CONTENT AREA --- */}
            <main className="max-w-7xl mx-auto p-4 md:p-8 w-full animate-in fade-in duration-500">
                {children}
            </main>

        </div>
    );
}