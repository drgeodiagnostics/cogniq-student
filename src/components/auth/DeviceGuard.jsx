import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Device } from '@capacitor/device';
import { Clock, Smartphone, RefreshCw, LogOut } from 'lucide-react';

const DeviceGuard = ({ status, onRefresh, sessionUser, strictMode = false }) => {
    const [loading, setLoading] = useState(false);

    // --- ACTIONS ---
    const handleSignOut = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setLoading(false);
    };

    const requestDeviceReset = async () => {
        if (!window.confirm("Request to switch to THIS device? This will require Admin approval.")) return;
        setLoading(true);
        
        try {
            const info = await Device.getId();
            const newDeviceId = info.uuid || info.identifier;
            const modelInfo = await Device.getInfo();
            
            const { error } = await supabase.from('device_registry')
                .update({ 
                    device_uuid: newDeviceId, 
                    device_name: `${modelInfo.model || 'Device'} (Reset Req)`, 
                    is_approved: false,
                    last_login: new Date().toISOString()
                })
                .eq('student_id', sessionUser.id);
            
            if (error) throw error;
            
            alert("Request Sent! Ask your HOD to approve."); 
            // Trigger the refresh function passed down from App.jsx
            if (onRefresh) onRefresh();
            
        } catch (e) {
            alert("Error submitting request: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl w-full max-w-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                
                {/* Visual Flair Background */}
                <div className={`absolute top-0 left-0 w-full h-1.5 ${status === 'pending' ? 'bg-amber-500' : 'bg-red-500'}`} />

                {status === 'pending' ? (
                    <div className="animate-in slide-in-from-bottom-4">
                        <div className="flex justify-center mb-6 text-amber-500 bg-amber-50 dark:bg-amber-900/20 w-24 h-24 rounded-full items-center mx-auto shadow-sm ring-4 ring-amber-50/50 dark:ring-amber-900/10">
                            <Clock size={48} className="animate-pulse" />
                        </div>
                        
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Approval Pending</h2>
                        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                            Your device registration is waiting for HOD or Administrator authorization.
                        </p>
                        
                        <button 
                            onClick={onRefresh} 
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl mb-4 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> 
                            Check Status Again
                        </button>
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-bottom-4">
                        <div className="flex justify-center mb-6 text-red-500 bg-red-50 dark:bg-red-900/20 w-24 h-24 rounded-full items-center mx-auto shadow-sm ring-4 ring-red-50/50 dark:ring-red-900/10">
                            <Smartphone size={48} />
                        </div>
                        
                        <h2 className="text-2xl font-bold text-red-600 dark:text-red-500 mb-2">Device Blocked</h2>
                        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                            Security mismatch detected. You are attempting to log in from an unauthorized device.
                            {strictMode && <span className="block mt-2 font-bold text-red-400">Strict Mode Enforced.</span>}
                        </p>
                        
                        <button 
                            onClick={requestDeviceReset} 
                            disabled={loading}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl mb-4 transition-all active:scale-95 disabled:opacity-50"
                        >
                            Request Device Switch
                        </button>
                    </div>
                )}

                {/* Common Sign Out Button */}
                <button 
                    onClick={handleSignOut} 
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors py-2"
                >
                    <LogOut size={16} /> Sign Out
                </button>
            </div>
        </div>
    );
};

export default DeviceGuard;