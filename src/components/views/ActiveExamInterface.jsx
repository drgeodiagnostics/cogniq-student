import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient'; 
import { ChevronLeft, ChevronRight, Flag, CheckCircle, AlertTriangle, Clock, LayoutGrid, Eraser, Cloud, CloudOff, Loader2 } from 'lucide-react';

export default function ActiveExamInterface({ exam, questions, studentId, isPWA, onComplete }) {
    // 🛡️ LOCAL MEMORY KEYS
    const DRAFT_KEY = `exam_draft_${exam?.deployment_id}_${studentId}`;
    const TIME_KEY = `exam_time_${exam?.deployment_id}_${studentId}`;
    const FLAG_KEY = `exam_flag_${exam?.deployment_id}_${studentId}`;

    // --- STATE ---
    const [currentIdx, setCurrentIdx] = useState(0);
    const [showConfirm, setShowConfirm] = useState(false);
    
    // Cloud Sync State
    const [submissionId, setSubmissionId] = useState(null);
    const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'saving', 'error'

    const [answers, setAnswers] = useState(() => {
        const saved = localStorage.getItem(DRAFT_KEY);
        return saved ? JSON.parse(saved) : {};
    });

    const [flagged, setFlagged] = useState(() => {
        const saved = localStorage.getItem(FLAG_KEY);
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    const [timeLeft, setTimeLeft] = useState(() => {
        const saved = localStorage.getItem(TIME_KEY);
        return saved ? parseInt(saved, 10) : (exam?.duration_minutes || 60) * 60;
    });

    // 🛡️ GATEKEEPER TO PREVENT REACT DOUBLE-MOUNTS
    const initRef = useRef(false);

    // --- CLOUD SYNC ENGINE ---
    useEffect(() => {
        // If this has already run once, completely block it from running again
        if (initRef.current) return;
        initRef.current = true;

        const initCloudSession = async () => {
            // Use .limit(1) to safely grab the first row
            const { data, error } = await supabase
                .from('exam_submissions')
                .select('submission_id, answers')
                .eq('exam_id', exam.exam_id)
                .eq('student_id', studentId)
                .limit(1);

            if (data && data.length > 0) {
                const existingRow = data[0];
                setSubmissionId(existingRow.submission_id);
                
                // Hydrate answers from the Cloud if local memory is empty
                if (existingRow.answers && Object.keys(existingRow.answers).length > 0) {
                    setAnswers(prev => {
                        if (Object.keys(prev).length === 0) {
                            localStorage.setItem(DRAFT_KEY, JSON.stringify(existingRow.answers));
                            return existingRow.answers;
                        }
                        return prev; 
                    });
                }
            } else {
                // First time ever taking this exam: Create ONE draft
                const { data: newRow } = await supabase
                    .from('exam_submissions')
                    .insert([{ 
                        exam_id: exam.exam_id, 
                        student_id: studentId, 
                        status: 'in_progress', 
                        answers: {} // Start empty to prevent state dependency loop
                    }])
                    .select('submission_id')
                    .single();
                if (newRow) setSubmissionId(newRow.submission_id);
            }
        };
        initCloudSession();
    }, [exam.exam_id, studentId, DRAFT_KEY]);

    const syncToCloud = async (latestAnswers) => {
        if (!submissionId) return; // Wait until DB row is initialized
        setSyncStatus('saving');

        const { error } = await supabase
            .from('exam_submissions')
            .update({ answers: latestAnswers })
            .eq('submission_id', submissionId);
        
        if (error) {
            console.error("Cloud Sync Error:", error);
            setSyncStatus('error');
        } else {
            // Small delay so the "Saving..." UI is visible to the student for peace of mind
            setTimeout(() => setSyncStatus('synced'), 500); 
        }
    };


    // --- ANTI-CHEAT ENGINE ---
    useEffect(() => {
        const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', handleBeforeUnload);

        const handleVisibilityChange = () => {
            if (document.hidden) alert('⚠️ SECURITY WARNING: You have left the exam window. This action has been logged.');
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // --- TIMER ENGINE ---
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { clearInterval(timer); return 0; }
                const nextTime = prev - 1;
                localStorage.setItem(TIME_KEY, nextTime.toString()); 
                return nextTime;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [TIME_KEY]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // --- HANDLERS ---
    const handleOptionSelect = (qId, optionText) => {
        setAnswers(prev => {
            const next = { ...prev, [qId]: optionText };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); // Local Save
            syncToCloud(next); // Cloud Save
            return next;
        });
    };

    const handleClearSelection = (qId) => {
        setAnswers(prev => {
            const next = { ...prev };
            delete next[qId];
            localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); // Local Save
            syncToCloud(next); // Cloud Save
            return next;
        });
    };

    const toggleFlag = (qId) => {
        setFlagged(prev => {
            const next = new Set(prev);
            if (next.has(qId)) next.delete(qId); else next.add(qId);
            localStorage.setItem(FLAG_KEY, JSON.stringify([...next])); 
            return next;
        });
    };

    const handleFinalSubmit = useCallback(() => {
        let score = 0;
        questions.forEach(q => {
            if (answers[q.question_id] === q.correct_answer) score++;
        });

        // WIPE DEVICE MEMORY UPON SUCCESSFUL COMPLETION
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(TIME_KEY);
        localStorage.removeItem(FLAG_KEY);

        onComplete(score, exam.total_marks || questions.length, answers);
    }, [answers, questions, exam, onComplete, DRAFT_KEY, TIME_KEY, FLAG_KEY]);

    useEffect(() => {
        if (timeLeft === 0) handleFinalSubmit();
    }, [timeLeft, handleFinalSubmit]);

    // --- RENDER HELPERS ---
    if (!questions || questions.length === 0) return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
        </div>
    );

    const currentQ = questions[currentIdx];
    const isFlagged = flagged.has(currentQ.question_id);
    const hasAnswer = !!answers[currentQ.question_id]; 

    // --- CONFIRMATION MODAL ---
    if (showConfirm) {
        const answeredCount = Object.keys(answers).length;
        const flaggedCount = flagged.size;
        const total = questions.length;

        return (
            <div className="fixed inset-0 z-[60] bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-[32px] shadow-2xl p-8 text-center border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Ready to Submit?</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">You will not be able to change your answers after this point.</p>
                    
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <span className="block text-2xl font-black text-slate-800 dark:text-white">{answeredCount}</span>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Answered</span>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/50">
                            <span className="block text-2xl font-black text-amber-600 dark:text-amber-500">{flaggedCount}</span>
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">Flagged</span>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-200 dark:border-red-800/50">
                            <span className="block text-2xl font-black text-red-600 dark:text-red-500">{total - answeredCount}</span>
                            <span className="text-[10px] font-bold text-red-600 dark:text-red-500 uppercase tracking-widest">Skipped</span>
                        </div>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <button onClick={() => setShowConfirm(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold py-4 rounded-xl transition-colors">
                            Return to Exam
                        </button>
                        <button onClick={handleFinalSubmit} className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700 font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
                            Yes, Submit
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- MAIN EXAM UI ---
    return (
        <div 
            className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#0b0f19] font-sans select-none overflow-hidden text-slate-900 dark:text-slate-100"
            onContextMenu={(e) => e.preventDefault()} 
            onCopy={(e) => e.preventDefault()}
        >
            {/* 🔵 HEADER */}
            <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <LayoutGrid size={18} />
                    </div>
                    <h1 className="font-bold text-base md:text-lg truncate">{exam?.title || 'Secure Assessment'}</h1>
                </div>

                <div className="flex items-center gap-4">
                    {/* 🚀 CLOUD SYNC INDICATOR */}
                    <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold transition-colors">
                        {syncStatus === 'saving' && <span className="flex items-center gap-1.5 text-slate-400"><Loader2 size={14} className="animate-spin" /> Saving...</span>}
                        {syncStatus === 'synced' && <span className="flex items-center gap-1.5 text-green-500"><Cloud size={14} /> Saved to Cloud</span>}
                        {syncStatus === 'error' && <span className="flex items-center gap-1.5 text-red-500"><CloudOff size={14} /> Offline Warning</span>}
                    </div>

                    <div className={`flex items-center gap-2 font-mono font-bold px-4 py-1.5 rounded-lg border text-sm transition-colors ${
                        timeLeft < 300 
                            ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 animate-pulse' 
                            : 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                    }`}>
                        <Clock size={16} className={timeLeft < 300 ? 'animate-bounce' : ''} />
                        {formatTime(timeLeft)}
                    </div>
                </div>
            </header>

            {/* ⚪️ SPLIT LAYOUT */}
            <div className="flex flex-col md:flex-row flex-1 min-h-0">
                
                {/* LEFT: QUESTION CONTENT */}
                <main className="flex-1 flex flex-col min-w-0 relative bg-white dark:bg-[#0b0f19]">
                    <div className="flex-1 overflow-y-auto p-6 md:p-10 w-full mx-auto max-w-4xl">
                        
                        {/* Question Meta & Toolbar */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800/50 px-3 py-1 rounded-full w-max">
                                Question {currentIdx + 1} of {questions.length}
                            </span>
                            
                            <div className="flex items-center gap-2">
                                {hasAnswer && (
                                    <button 
                                        onClick={() => handleClearSelection(currentQ.question_id)}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800/50"
                                    >
                                        <Eraser size={14} />
                                        Clear
                                    </button>
                                )}

                                <button 
                                    onClick={() => toggleFlag(currentQ.question_id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                        isFlagged 
                                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 shadow-sm' 
                                            : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <Flag size={14} className={isFlagged ? 'fill-amber-500 text-amber-500' : ''} />
                                    {isFlagged ? 'Flagged' : 'Flag Question'}
                                </button>
                            </div>
                        </div>

                        {/* Question Text */}
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white mb-8 leading-relaxed">
                            {currentQ.question_text}
                        </h2>

                        {/* Options */}
                        <div className="space-y-3 pb-8">
                            {currentQ.options && currentQ.options.map((opt, i) => {
                                const selected = answers[currentQ.question_id] === opt;
                                return (
                                    <div 
                                        key={i}
                                        onClick={() => handleOptionSelect(currentQ.question_id, opt)}
                                        className={`w-full p-4 md:p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 group ${
                                            selected 
                                                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-100 shadow-sm' 
                                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-slate-600'
                                        }`}
                                    >
                                        <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                            selected ? 'border-indigo-600 bg-indigo-600 dark:border-indigo-500 dark:bg-indigo-500' : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400 dark:group-hover:border-slate-500'
                                        }`}>
                                            {selected && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                        <span className={`text-sm md:text-base font-medium ${selected ? 'font-bold' : ''}`}>
                                            {opt}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Navigation Footer */}
                    <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-10">
                        <div className="max-w-4xl mx-auto flex justify-between items-center">
                            <button 
                                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                                disabled={currentIdx === 0}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={20} /> <span className="hidden sm:inline">Previous</span>
                            </button>

                            {currentIdx === questions.length - 1 ? (
                                <button 
                                    onClick={() => setShowConfirm(true)}
                                    className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                                >
                                    Review & Submit <CheckCircle size={18} />
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                                    className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                                >
                                    <span className="hidden sm:inline">Next Question</span> <span className="sm:hidden">Next</span> <ChevronRight size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                </main>

                {/* RIGHT: QUESTION PALETTE SIDEBAR */}
                <aside className="w-full md:w-72 bg-slate-50 dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col h-48 md:h-full shrink-0">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                        <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Question Navigator</h3>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800/50">
                            {Object.keys(answers).length} / {questions.length}
                        </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 md:p-5 no-scrollbar">
                        <div className="grid grid-cols-6 md:grid-cols-5 gap-2 md:gap-3">
                            {questions.map((q, i) => {
                                const hasAns = !!answers[q.question_id];
                                const isFlag = flagged.has(q.question_id);
                                const isCurr = currentIdx === i;

                                let baseStyle = "w-9 h-9 md:w-10 md:h-10 rounded-lg border flex items-center justify-center text-xs md:text-sm font-bold cursor-pointer transition-all relative ";
                                
                                if (hasAns) baseStyle += "bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 text-white shadow-sm ";
                                else baseStyle += "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 ";

                                if (isCurr) baseStyle += "ring-2 ring-indigo-400 dark:ring-indigo-400 ring-offset-2 dark:ring-offset-slate-900 z-10 ";

                                return (
                                    <button 
                                        key={q.question_id}
                                        onClick={() => setCurrentIdx(i)}
                                        className={baseStyle}
                                    >
                                        {i + 1}
                                        {isFlag && (
                                            <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-500 border-2 border-slate-50 dark:border-slate-900 rounded-full shadow-sm" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div className="hidden md:block p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
                        <button 
                            onClick={() => setShowConfirm(true)}
                            className="w-full py-3 rounded-xl font-bold text-slate-700 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-300/50 dark:border-slate-700"
                        >
                            Finish Exam
                        </button>
                    </div>
                </aside>

            </div>
        </div>
    );
}