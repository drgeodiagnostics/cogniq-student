import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { CheckCircle, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

const ActiveExamInterface = ({ exam, questions, studentId, onComplete, isPWA }) => {
    
    // 🛡️ 1. DEFINE SECURE MEMORY KEYS
    const draftKey = `exam_draft_${exam.deployment_id}_${studentId}`;
    const timeKey = `exam_time_${exam.deployment_id}_${studentId}`;

    // 🛡️ 2. HYDRATE STATE FROM DEVICE MEMORY (Prevents loss on refresh)
    const [answers, setAnswers] = useState(() => {
        const savedDraft = localStorage.getItem(draftKey);
        return savedDraft ? JSON.parse(savedDraft) : {};
    });

    const [timeLeft, setTimeLeft] = useState(() => {
        const savedTime = localStorage.getItem(timeKey);
        return savedTime ? parseInt(savedTime, 10) : (exam.duration_minutes * 60);
    });

    const [isViolationAlert, setIsViolationAlert] = useState(false);

    // --- 🛡️ SECURE PROCTORING PROTOCOL ---
    useEffect(() => {
        const logIncident = async (type, desc, sev = 'medium') => {
            console.warn(`PROCTOR ALERT: ${type}`);
            await supabase
                .from('proctoring_logs')
                .insert([{
                    deployment_id: exam.deployment_id,
                    student_id: studentId,
                    incident_type: type,
                    description: desc,
                    severity: sev
                }]);
        };

        const handleVisibility = () => {
            if (document.hidden) {
                logIncident(
                    "Tab/App Switch", 
                    `Student left the exam interface. PWA Mode: ${isPWA}`, 
                    "high"
                );
                setIsViolationAlert(true);
                alert("⚠️ SECURITY ALERT: You have left the secure exam environment. This incident has been logged and the faculty has been notified.");
            }
        };

        const preventRightClick = (e) => e.preventDefault();
        document.addEventListener("contextmenu", preventRightClick);
        document.addEventListener("visibilitychange", handleVisibility);
        
        return () => {
            document.removeEventListener("visibilitychange", handleVisibility);
            document.removeEventListener("contextmenu", preventRightClick);
        };
    }, [exam.deployment_id, studentId, isPWA]);


    // --- ⏳ TIMER LOGIC (WITH AUTO-SAVE) ---
    useEffect(() => {
        if (timeLeft <= 0) {
            handleAutoSubmit();
            return;
        }
        
        const timerId = setInterval(() => {
            setTimeLeft(prev => {
                const newTime = prev - 1;
                // 🛡️ Save exact time to device so they can't cheat by refreshing
                localStorage.setItem(timeKey, newTime.toString());
                return newTime;
            });
        }, 1000);
        
        return () => clearInterval(timerId);
    }, [timeLeft]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // --- 📝 SUBMISSION & INSTANT-SAVE LOGIC ---
    
    // 🛡️ 3. INSTANT SAVE ON EVERY CLICK
    const handleAnswerSelect = (questionId, label) => {
        const updatedAnswers = { ...answers, [questionId]: label };
        setAnswers(updatedAnswers);
        // Write instantly to device physical memory
        localStorage.setItem(draftKey, JSON.stringify(updatedAnswers));
    };

    const calculateScore = () => {
        let score = 0;
        questions.forEach(q => {
            if (answers[q.question_id] === q.correct_answer) score++;
        });
        return score;
    };

    const handleManualSubmit = () => {
        const answeredCount = Object.keys(answers).length;
        const total = questions.length;
        
        const msg = answeredCount < total 
            ? `You have only answered ${answeredCount}/${total} questions. Submit anyway?` 
            : "Are you sure you want to finish the exam?";
            
        if (window.confirm(msg)) finalizeExam();
    };

    const handleAutoSubmit = () => {
        alert("Time is up! Your exam is being automatically submitted.");
        finalizeExam();
    };

    const finalizeExam = () => {
        const finalScore = calculateScore();
        
        // 🛡️ 4. WIPE MEMORY UPON SUCCESSFUL COMPLETION
        localStorage.removeItem(draftKey);
        localStorage.removeItem(timeKey);
        
        // Return results to App.jsx for database insertion
        onComplete(finalScore, questions.length, answers);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 pb-24 select-none">
            
            {/* STICKY HEADER - PROCTORING & TIMER */}
            <div className="fixed top-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center z-40 shadow-sm">
                <div className="flex items-center gap-3">
                    <ShieldAlert className={isViolationAlert ? "text-red-500 animate-bounce" : "text-indigo-500"} />
                    <div>
                        <h2 className="font-bold text-slate-800 dark:text-white text-sm md:text-lg truncate max-w-[150px] md:max-w-none">
                            {exam.title}
                        </h2>
                        <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" /> Live Proctoring
                        </span>
                    </div>
                </div>
                
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-lg border ${
                    timeLeft < 300 
                        ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 animate-pulse' 
                        : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                }`}>
                    <Clock size={18} />
                    {formatTime(timeLeft)}
                </div>
            </div>
            
            {/* CONTENT AREA */}
            <div className="mt-24 max-w-3xl mx-auto space-y-6">
                
                {/* Progress Bar */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 sticky top-20 z-30">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                        <span>Progress</span>
                        <span>{Object.keys(answers).length} / {questions.length} Answered</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="bg-indigo-600 h-full transition-all duration-500" 
                            style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Questions */}
                {questions.map((q, i) => (
                    <div key={q.question_id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                        <div className="flex gap-4 mb-6">
                            <span className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-sm">
                                {i + 1}
                            </span>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-relaxed pt-0.5">
                                {q.question_text}
                            </h3>
                        </div>
                        
                        <div className="space-y-3 pl-12">
                            {(() => {
                                let opts = [];
                                try {
                                    opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options);
                                } catch (e) { opts = ["Error loading options"]; }
                                
                                return opts.map((opt, j) => { 
                                    const label = ['A','B','C','D','E'][j]; 
                                    const isSelected = answers[q.question_id] === label; 
                                    
                                    return (
                                        <button 
                                            key={j} 
                                            onClick={() => handleAnswerSelect(q.question_id, label)}
                                            className={`w-full flex items-start p-4 rounded-xl border-2 transition-all text-left ${
                                                isSelected 
                                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' 
                                                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 mt-0.5 rounded-full border-2 mr-4 flex items-center justify-center shrink-0 ${
                                                isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'
                                            }`}>
                                                {isSelected && <CheckCircle size={12} />}
                                            </div>
                                            <span className={`text-base ${isSelected ? 'text-indigo-900 dark:text-indigo-100 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {opt}
                                            </span>
                                        </button>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                ))}
            </div>

            {/* SUBMIT FOOTER */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-40">
                <button 
                    onClick={handleManualSubmit} 
                    className="w-full max-w-3xl mx-auto flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95"
                >
                    Submit Secure Assessment
                </button>
            </div>
        </div>
    );
};

export default ActiveExamInterface;