import React, { useState } from 'react';
import { ShieldAlert, User, KeyRound } from 'lucide-react';

const ProfileView = ({ profile, onUpdatePassword }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match.' });
            return;
        }
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
            return;
        }

        setLoading(true);
        try {
            // We call the Enterprise function passed from App.jsx
            await onUpdatePassword(newPassword);
            
            setNewPassword('');
            setConfirmPassword('');
            setMessage({ type: 'success', text: 'Password secured successfully.' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Update failed. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in">
            {/* Header Section */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Student Profile</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage your account details and security settings.</p>
                </div>
                <div className="p-3 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
                    <User size={20} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Account Details Card */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 h-fit">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-8 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-500">
                            <ShieldAlert size={20} />
                        </div>
                        Identity & Access
                    </h3>
                    
                    <div className="space-y-6">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Legal Name</label>
                            <p className="text-slate-800 dark:text-slate-200 font-semibold text-lg">{profile?.full_name}</p>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                            <p className="text-slate-800 dark:text-slate-200 font-mono text-sm bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700 w-fit">
                                {profile?.email}
                            </p>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Institution Enrollment</label>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <p className="text-slate-800 dark:text-slate-200 font-medium">
                                    {profile?.org_master?.name || 'Not Assigned'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Password Reset Card */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 h-fit">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-8 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-500">
                            <KeyRound size={20} />
                        </div>
                        Security Credentials
                    </h3>
                    
                    <form onSubmit={handlePasswordSubmit} className="space-y-5">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                            <input 
                                type="password" 
                                required
                                className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
                                value={newPassword} 
                                onChange={e => setNewPassword(e.target.value)} 
                                placeholder="Min. 6 characters required"
                            />
                        </div>
                        
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm New Password</label>
                            <input 
                                type="password" 
                                required
                                className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
                                value={confirmPassword} 
                                onChange={e => setConfirmPassword(e.target.value)} 
                                placeholder="Re-type your new password"
                            />
                        </div>

                        {/* Status Message Container */}
                        <div className="min-h-[2.5rem] flex items-center">
                            {message && (
                                <div className={`w-full p-3.5 rounded-xl text-sm font-bold flex items-center justify-center animate-in fade-in slide-in-from-bottom-2 ${
                                    message.type === 'error' 
                                        ? 'bg-red-50 text-red-600 dark:bg-red-900/30 border border-red-100 dark:border-red-800' 
                                        : 'bg-green-50 text-green-700 dark:bg-green-900/30 border border-green-100 dark:border-green-800'
                                }`}>
                                    {message.text}
                                </div>
                            )}
                        </div>

                        <button 
                            disabled={loading || !newPassword || !confirmPassword} 
                            type="submit" 
                            className="w-full bg-slate-800 hover:bg-slate-900 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mt-2 flex justify-center items-center"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    Updating Vault...
                                </span>
                            ) : (
                                'Update Password'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfileView;