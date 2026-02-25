import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Flag, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { supabase } from '../../supabaseClient'; // Ensure this path matches your setup

export default function ActiveExamInterface({ exam, questions, studentId, isPWA, onComplete }) {
    // 🛡️ SECURE MEMORY KEYS
    const draftKey = `exam_draft_${exam?.deployment_id}_${studentId}`;
    const timeKey = `exam_time_${exam?.deployment_id}_${studentId}`;
    const flagKey = `exam_flags_${exam?.deployment_id}_${studentId}`;

    // --- STATE (Hydrated from LocalStorage) ---
    const [currentIdx, setCurrentIdx] = useState(0);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isViolationAlert, setIsViolationAlert] = useState(false);

    const [answers, setAnswers] = useState(() => {
        const saved = localStorage.getItem(draftKey);
        return saved ? JSON.parse(saved) : {};
    });

    const [flagged, setFlagged] = useState(() => {
        const saved = localStorage.getItem(flagKey);
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    const [timeLeft, setTimeLeft] = useState(() => {
        const savedTime = localStorage.getItem(timeKey);
        return savedTime ? parseInt(savedTime, 10) : ((exam?.duration_minutes || 60) * 60);
    });

    // --- ANTI-CHEAT & PROCTORING ENGINE ---
    useEffect(() => {
        const logIncident = async (type, desc, sev = 'medium') => {
            try {
                await supabase.from('proctoring_logs').insert([{
                    deployment_id: exam.deployment_id,
                    student_id: studentId,
                    incident_type: type,
                    description: desc,
                    severity: sev
                }]);
            } catch (e) { console.error("Logging failed", e); }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                logIncident("Tab/App Switch", `Student minimized/switched tabs. PWA: ${isPWA}`, "high");
                setIsViolationAlert(true);
                alert('⚠️ SECURITY WARNING: You have left the exam window. This action has been logged.');
            }
        };

        const preventRightClick = (e) => e.preventDefault();
        
        window.addEventListener('beforeunload', (e) => { e.preventDefault(); e.returnValue = ''; });
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('contextmenu', preventRightClick);
        document.addEventListener('copy', preventRightClick);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('contextmenu', preventRightClick);
            document.removeEventListener('copy', preventRightClick);
        };
    }, [exam, studentId, isPWA]);

    // --- TIMER ENGINE ---
    useEffect(() => {
        if (timeLeft <= 0) {
            handleFinalSubmit();
            return;
        }
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                const newTime = prev - 1;
                localStorage.setItem(timeKey, newTime.toString());
                return newTime;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // --- HANDLERS ---
    const handleOptionSelect = (qId, optionText) => {
        const newAnswers = { ...answers, [qId]: optionText };
        setAnswers(newAnswers);
        localStorage.setItem(draftKey, JSON.stringify(newAnswers)); // Auto-save
    };

    const toggleFlag = (qId) => {
        setFlagged(prev => {
            const next = new Set(prev);
            if (next.has(qId)) next.delete(qId);
            else next.add(qId);
            localStorage.setItem(flagKey, JSON.stringify(Array.from(next))); // Auto-save flags
            return next;
        });
    };

    const handleFinalSubmit = useCallback(() => {
        let score = 0;
        questions.forEach(q => {
            if (answers[q.question_id] === q.correct_answer) score++;
        });
        
        // Wipe local memory to prevent reopening
        localStorage.removeItem(draftKey);
        localStorage.removeItem(timeKey);
        localStorage.removeItem(flagKey);
        
        onComplete(score, exam.total_marks || questions.length, answers);
    }, [answers, questions, exam, onComplete, draftKey, timeKey, flagKey]);


    // --- RENDER HELPERS ---
    if (!questions || questions.length === 0) return <div className="p-8 text-center font-bold">Loading exam data...</div>;
    const currentQ = questions[currentIdx];
    const isFlagged = flagged.has(currentQ?.question_id);

    // 🛑 CONFIRMATION SCREEN
    if (showConfirm) {
        const answeredCount = Object.keys(answers).length;
        const total = questions.length;

        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 select-none">
                <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl p-8 text-center border border-slate-200 animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">Ready to Submit?</h2>
                    <p className="text-slate-500 mb-8">You will not be able to change your answers after this point.</p>
                    
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <span className="block text-2xl font-black text-slate-800">{answeredCount}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Answered</span>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                            <span className="block text-2xl font-black text-amber-600">{flagged.size}</span>
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Flagged</span>
                        </div>
                        <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                            <span className="block text-2xl font-black text-red-600">{total - answeredCount}</span>
                            <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Skipped</span>
                        </div>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <button onClick={() => setShowConfirm(false)} className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold py-4 rounded-xl transition-colors">
                            Return to Exam
                        </button>
                        <button onClick={handleFinalSubmit} className="flex-1 bg-green-600 text-white hover:bg-green-700 font-bold py-4 rounded-xl shadow-lg shadow-green-600/20 transition-all active:scale-95">
                            Yes, Submit
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 🖥️ MAIN SINGLE-QUESTION UI
    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center md:p-6 select-none">
            <div className="bg-white w-full h-screen md:h-[90vh] md:max-h-[900px] md:max-w-4xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                
                {/* Header */}
                <div className={`px-6 py-4 flex justify-between items-center shrink-0 shadow-md z-10 ${isViolationAlert ? 'bg-red-600' : 'bg-blue-600'} text-white transition-colors`}>
                    <div className="flex items-center gap-2 overflow-hidden pr-4">
                        {isViolationAlert && <ShieldAlert size={20} className="animate-pulse shrink-0" />}
                        <h1 className="font-bold text-lg tracking-wide truncate">{exam?.title || 'Secure Assessment'}</h1>
                    </div>
                    <div className={`font-mono font-black text-lg px-3 py-1 rounded-lg shrink-0 ${timeLeft < 300 ? 'bg-red-500 animate-pulse' : 'bg-blue-800'}`}>
                        {formatTime(timeLeft)}
                    </div>
                </div>

                {/* Question Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 relative">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                            Question {currentIdx + 1} of {questions.length}
                        </span>
                        <button 
                            onClick={() => toggleFlag(currentQ.question_id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${
                                isFlagged ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                        >
                            <Flag size={16} className={isFlagged ? 'fill-amber-500' : ''} />
                            {isFlagged ? 'Flagged' : 'Flag for Review'}
                        </button>
                    </div>

                    <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-8 leading-relaxed">
                        {currentQ?.question_text}
                    </h2>

                    {currentQ?.image_url && (
                        <div className="mb-8 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex justify-center">
                            <img src={currentQ.image_url} alt="Reference" className="max-h-80 object-contain mix-blend-multiply" />
                        </div>
                    )}

                    <div className="space-y-3 pb-8">
                        {currentQ?.options && (Array.isArray(currentQ.options) ? currentQ.options : JSON.parse(currentQ.options)).map((opt, i) => {
                            const selected = answers[currentQ.question_id] === opt;
                            return (
                                <div 
                                    key={i}
                                    onClick={() => handleOptionSelect(currentQ.question_id, opt)}
                                    className={`p-4 md:p-5 border-2 rounded-xl cursor-pointer transition-all flex items-center gap-4 group ${
                                        selected 
                                            ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm' 
                                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700'
                                    }`}
                                >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                        selected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 group-hover:border-blue-400'
                                    }`}>
                                        {selected && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <span className={`text-base md:text-lg font-medium ${selected ? 'font-bold' : ''}`}>
                                        {opt}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Controls & Palette */}
                <div className="bg-slate-50 border-t border-slate-200 p-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-between items-center mb-4">
                        <button 
                            onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                            disabled={currentIdx === 0}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={20} /> <span className="hidden md:inline">Previous</span>
                        </button>

                        {currentIdx === questions.length - 1 ? (
                            <button 
                                onClick={() => setShowConfirm(true)}
                                className="flex items-center gap-2 px-6 md:px-8 py-2.5 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 shadow-md shadow-green-600/20 transition-all active:scale-95"
                            >
                                <CheckCircle size={20} /> Finish
                            </button>
                        ) : (
                            <button 
                                onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                                className="flex items-center gap-2 px-6 md:px-8 py-2.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all active:scale-95"
                            >
                                Next <ChevronRight size={20} />
                            </button>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                            Question Navigator
                        </div>
                        <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 max-h-[120px] overflow-y-auto p-1 scroll-smooth no-scrollbar">
                            {questions.map((q, i) => {
                                const hasAns = !!answers[q.question_id];
                                const isFlag = flagged.has(q.question_id);
                                const isCurr = currentIdx === i;

                                let baseStyle = "w-8 h-8 md:w-10 md:h-10 rounded-md border flex items-center justify-center text-xs md:text-sm font-bold cursor-pointer transition-all relative ";
                                
                                if (hasAns) baseStyle += "bg-blue-600 border-blue-600 text-white ";
                                else baseStyle += "bg-white border-slate-300 text-slate-500 hover:bg-slate-100 ";

                                if (isCurr) baseStyle += "ring-2 ring-amber-500 ring-offset-2 z-10 ";

                                return (
                                    <button 
                                        key={q.question_id}
                                        onClick={() => setCurrentIdx(i)}
                                        className={baseStyle}
                                    >
                                        {i + 1}
                                        {isFlag && <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 border-2 border-white rounded-full shadow-sm" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}