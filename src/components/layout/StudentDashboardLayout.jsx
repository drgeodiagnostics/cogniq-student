import React, { useState } from 'react';
import { 
  Menu, LogOut, LayoutDashboard, User, 
  BookOpen, Users, X, GraduationCap, ShieldCheck, Library 
} from 'lucide-react';

export default function StudentDashboardLayout({ children, userProfile, onSignOut, onNavigate, currentView }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 🔒 PATCHED: Added 'atlas' route for Mind Maps & Flashcards
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={20}/> },
    { id: 'exams', label: 'Exams & Results', icon: <BookOpen size={20}/> },
    { id: 'atlas', label: 'Study Atlas', icon: <Library size={20}/> }, 
    { id: 'mentorship', label: 'My Mentor', icon: <Users size={20}/> },
    { id: 'profile', label: 'Profile', icon: <User size={20}/> },
  ];

  const handleNav = (view) => {
    onNavigate(view);
    setIsDrawerOpen(false); 
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200">
      
      {/* 1. MOBILE HEADER */}
      <header className="md:hidden sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 h-16 flex items-center justify-between z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsDrawerOpen(true)} className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <Menu size={24} />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CognIQ Ed</span>
            <span className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1">
              <GraduationCap size={16} className="text-blue-600" /> Student Portal
            </span>
          </div>
        </div>
        <div onClick={() => handleNav('profile')} className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs border border-blue-200 dark:border-blue-800 cursor-pointer">
          {userProfile.initials}
        </div>
      </header>

      {/* 2. SIDEBAR NAVIGATION */}
      <aside className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl md:shadow-none transform transition-transform duration-300 ease-in-out
          ${isDrawerOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:h-screen
      `}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
           <div>
              <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg mb-3">
                <ShieldCheck size={28} />
              </div>
              <h2 className="font-bold text-slate-800 dark:text-white text-lg tracking-tight">CognIQ Ed</h2>
              <p className="text-xs text-slate-500 font-mono uppercase">Student Portal</p>
           </div>
           <button onClick={() => setIsDrawerOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600">
             <X size={24} />
           </button>
        </div>

        <div className="px-6 py-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                    {userProfile.initials}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{userProfile.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{userProfile.regNo}</p>
                </div>
            </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-1">
          {navItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => handleNav(item.id)} 
              className={`
                w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group
                ${currentView === item.id 
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm border border-blue-100 dark:border-blue-900/50" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }
              `}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {currentView === item.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button 
            onClick={onSignOut} 
            className="flex items-center justify-center w-full px-4 py-3 text-sm font-bold text-red-600 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <LogOut size={18} className="mr-2" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay for Mobile Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsDrawerOpen(false)} />
      )}

      {/* 3. MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-6 overflow-y-auto h-screen">
          {children}
      </main>
    </div>
  );
}