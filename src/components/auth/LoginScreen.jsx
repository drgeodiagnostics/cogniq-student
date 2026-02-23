import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

const LoginScreen = () => {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // --- ACTIONS ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Note: We don't need to manually update App.jsx state here because 
      // Supabase's onAuthStateChange listener in App.jsx will automatically detect the login!
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      alert("Reset link sent to your email!");
      setAuthMode('login');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 dark:border-slate-800">
        
        <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Student Portal</h2>
            <p className="text-sm text-slate-500 mt-1">Sign in to access your assessments.</p>
        </div>

        {authMode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <input 
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
                    type="email"
                    placeholder="Student Email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    required
                />
            </div>
            <div>
                <input 
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
                    type="password" 
                    placeholder="Password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    required
                />
            </div>
            
            <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 mt-2" 
                disabled={loading}
            >
                {loading ? 'Authenticating...' : 'Log In'}
            </button>
            
            <div 
                className="text-center text-blue-600 dark:text-blue-400 text-sm font-medium cursor-pointer hover:underline mt-4" 
                onClick={() => setAuthMode('forgot')}
            >
                Forgot Password?
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div>
                <input 
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
                    type="email"
                    placeholder="Enter your registered email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    required
                />
            </div>
            
            <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 mt-2" 
                disabled={loading}
            >
                {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            
            <div 
                className="text-center text-slate-500 dark:text-slate-400 text-sm font-medium cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors mt-4" 
                onClick={() => setAuthMode('login')}
            >
                Back to Login
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;