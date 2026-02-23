import React, { useState } from 'react';
import { 
    LayoutDashboard, BookOpen, Layers, Users, User, 
    LogOut, Menu, X, PanelLeftClose, PanelLeftOpen, ShieldCheck 
} from 'lucide-react';

export default function StudentDashboardLayout({ userProfile, onSignOut, onNavigate, currentView, children }) {
    // 📱 Mobile/iPad Portrait Drawer State
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    // 💻 Desktop/iPad Landscape Collapse State
    const [isCollapsed, setIsCollapsed] = useState(false);

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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-slate-900 dark:text-slate-100">
            
            {/* --- MOBILE / IPAD PORTRAIT TOP NAV --- */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-50 flex items-center justify-between px-4 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-lg tracking-tight">
                    <ShieldCheck size={24} />
                    <span>CogniQ<span className="text-slate-800 dark:text-white">Ed</span></span>
                </div>
                <button 
                    onClick={() => setIsMobileOpen(true)} 
                    className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg active:scale-95 transition-transform"
                >
                    <Menu size={24} />
                </button>
            </div>

            {/* --- SIDEBAR OVERLAY (Mobile/Tablet Portrait) --- */}
            {isMobileOpen && (
                <div 
                    className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 transition-opacity"
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
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div className={`flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xl tracking-tight overflow-hidden transition-opacity duration-300 ${isCollapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100 w-auto'}`}>
                        <ShieldCheck size={28} className="shrink-0" />
                        <span>CogniQ<span className="text-slate-800 dark:text-white">Ed</span></span>
                    </div>

                    {/* Desktop/iPad Landscape Collapse Button */}
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors shrink-0"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                    </button>

                    {/* Mobile Close Button */}
                    <button 
                        onClick={() => setIsMobileOpen(false)}
                        className="lg:hidden p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2 no-scrollbar">
                    {navItems.map((item) => {
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNav(item.id)}
                                title={isCollapsed ? item.label : ""}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-all group ${
                                    isActive 
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 shadow-sm' 
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                                } ${isCollapsed ? 'lg:justify-center' : 'justify-start'}`}
                            >
                                <item.icon size={22} className={`shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom User Profile Section */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
                    <button 
                        onClick={() => handleNav('profile')}
                        title={isCollapsed ? "Profile Settings" : ""}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors mb-2 ${
                            currentView === 'profile' ? 'bg-slate-100 dark:bg-slate-800' : ''
                        } ${isCollapsed ? 'lg:justify-center' : 'justify-start'}`}
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold shrink-0">
                            {userProfile?.initials || <User size={20} />}
                        </div>
                        <div className={`text-left overflow-hidden transition-opacity duration-300 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{userProfile?.name || 'Student'}</p>
                            <p className="text-xs text-slate-500 font-mono uppercase tracking-wider truncate">{userProfile?.regNo || 'Profile Settings'}</p>
                        </div>
                    </button>
                    
                    <button 
                        onClick={onSignOut}
                        title={isCollapsed ? "Secure Logout" : ""}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium ${isCollapsed ? 'lg:justify-center' : 'justify-start'}`}
                    >
                        <LogOut size={20} className="shrink-0" />
                        <span className={`whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                            Secure Logout
                        </span>
                    </button>
                </div>
            </aside>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 h-screen overflow-y-auto w-full">
                {/* Spacer for mobile fixed header */}
                <div className="h-16 lg:hidden w-full shrink-0"></div> 
                
                <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
                    {children}
                </div>
            </main>

        </div>
    );
}