import React, { useState, useEffect } from 'react';
import { useWebProctor } from '../../hooks/useWebProctor';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';

const ActiveExamInterface = ({ exam, questions, studentId, onComplete, stopHeartbeat }) => {
    // 🛡️ INJECT PROCTORING HOOK
    useWebProctor(exam.deployment_id, studentId, true);
    
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(exam.duration_minutes * 60);

    // --- TIMER LOGIC ---
    useEffect(() => {
        if (timeLeft <= 0) {
            handleAutoSubmit();
            return;
        }
        
        const timerId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        
        return () => clearInterval(timerId);
    }, [timeLeft]);

    // Format timer (MM:SS)
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // --- SUBMISSION LOGIC ---
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
        
        if (answeredCount < total) {
            if (!window.confirm(`You have only answered ${answeredCount} out of ${total} questions. Are you sure you want to submit?`)) {
                return;
            }
        } else {
            if (!window.confirm("Are you sure you want to finish the exam?")) return;
        }

        finalizeExam();
    };

    const handleAutoSubmit = () => {
        alert("Time is up! Your exam is being automatically submitted.");
        finalizeExam();
    };

    const finalizeExam = () => {
        if (stopHeartbeat) stopHeartbeat();
        const finalScore = calculateScore();
        onComplete(finalScore, questions.length, answers);
    };

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 pb-24 select-none">
            
            {/* STICKY HEADER - PROCTORING & TIMER */}
            <div className="fixed top-0 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center z-40 shadow-sm backdrop-blur-md bg-opacity-90 dark:bg-opacity-90">
                <div>
                    <h2 className="font-bold text-slate-800 dark:text-white text-lg">{exam.title}</h2>
                    <div className="flex gap-2 mt-1 items-center">
                        <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm border border-red-200 dark:border-red-800/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE PROCTORING
                        </span>
                    </div>
                </div>
                
                {/* Timer Display */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-lg border shadow-inner ${
                    timeLeft < 300 
                        ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800/50 animate-pulse' 
                        : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                }`}>
                    <Clock size={18} className={timeLeft < 300 ? 'text-red-500' : 'text-slate-500'} />
                    {formatTime(timeLeft)}
                </div>
            </div>
            
            {/* EXAM CONTENT ENGINE */}
            <div className="mt-24 max-w-3xl mx-auto space-y-6">
                
                {/* Progress Bar */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 sticky top-20 z-30">
                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        <span>Progress</span>
                        <span>{Object.keys(answers).length} / {questions.length} Answered</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Questions Loop */}
                {questions.map((q, i) => (
                    <div 
                        key={q.question_id} 
                        className={`bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border transition-colors ${
                            answers[q.question_id] 
                                ? 'border-blue-200 dark:border-blue-900/30 ring-1 ring-blue-50 dark:ring-blue-900/10' 
                                : 'border-slate-200 dark:border-slate-800'
                        }`}
                    >
                        <div className="flex gap-4 items-start mb-6">
                            <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700">
                                {i + 1}
                            </span>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-relaxed">
                                {q.question_text}
                            </h3>
                        </div>
                        
                        {/* Options Render Engine */}
                        <div className="space-y-3 pl-12">
                            {(() => {
                                let opts = [];
                                try {
                                    if (Array.isArray(q.options)) {
                                        opts = q.options;
                                    } else if (typeof q.options === 'string') {
                                        const parsed = JSON.parse(q.options);
                                        opts = Array.isArray(parsed) ? parsed : Object.values(parsed);
                                    } else if (typeof q.options === 'object') {
                                        opts = Object.values(q.options);
                                    }
                                } catch (e) {
                                    opts = ["Error loading options."];
                                }
                                
                                return opts.map((opt, j) => { 
                                    const label = ['A','B','C','D','E'][j]; 
                                    const isSelected = answers[q.question_id] === label; 
                                    
                                    return (
                                        <label 
                                            key={j} 
                                            className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                isSelected 
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm' 
                                                    : 'border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 mt-0.5 rounded-full border-2 mr-4 flex items-center justify-center shrink-0 transition-colors ${
                                                isSelected 
                                                    ? 'bg-blue-500 border-blue-500 text-white' 
                                                    : 'border-slate-300 dark:border-slate-600'
                                            }`}>
                                                {isSelected && <CheckCircle size={12} strokeWidth={3} />}
                                            </div>
                                            <span className={`text-base ${isSelected ? 'text-blue-900 dark:text-blue-100 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {opt}
                                            </span>
                                            <input 
                                                type="radio" 
                                                className="hidden" 
                                                checked={isSelected} 
                                                onChange={() => setAnswers({...answers, [q.question_id]: label})} 
                                            />
                                        </label>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                ))}
            </div>

            {/* STICKY FOOTER - SUBMIT BUTTON */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button 
                    onClick={handleManualSubmit} 
                    className="w-full max-w-3xl mx-auto flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 focus:ring-4 focus:ring-blue-500/30"
                >
                    <CheckCircle size={20} /> Submit Assessment
                </button>
            </div>
        </div>
    );
};

export default ActiveExamInterface;