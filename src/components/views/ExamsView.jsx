import React, { useState } from 'react';
import { 
    Users, History, ChevronDown, ChevronRight, 
    CheckCircle, XCircle, FileSearch, X, Info, Clock 
} from 'lucide-react';

const ExamsView = ({ availableExams = [], pastExams = [], onStart }) => {
    const now = new Date();

    const [collapsedActive, setCollapsedActive] = useState({});
    const [collapsedPast, setCollapsedPast] = useState({});
    
    // Tracks which exam is currently being reviewed
    const [reviewExam, setReviewExam] = useState(null);

    const toggleActive = (className) => setCollapsedActive(prev => ({ ...prev, [className]: !prev[className] }));
    const togglePast = (className) => setCollapsedPast(prev => ({ ...prev, [className]: !prev[className] }));

    // --- 🧩 THE GROUPING ENGINE ---
    const groupedAvailable = availableExams.reduce((acc, d) => {
        const cName = d.classroom?.name || 'Direct Assessments';
        if (!acc[cName]) acc[cName] = [];
        acc[cName].push(d);
        return acc;
    }, {});

    const groupedPast = pastExams.reduce((acc, e) => {
        const cName = e.exam_master?.classroom_master?.name || 'Recent Results';
        if (!acc[cName]) acc[cName] = [];
        acc[cName].push(e);
        return acc;
    }, {});

    return (
        <div className="space-y-8 pb-20 animate-in fade-in">
            {/* Header Section */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Assessments</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage your active exams and review past performance.</p>
                </div>
            </div>

            {/* --- ACTIVE & UPCOMING EXAMS --- */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Active & Upcoming</h2>
                {Object.keys(groupedAvailable).length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                        <span className="italic">No active exams found for your enrolled classes.</span>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedAvailable)
                            .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                            .map(([className, exams]) => (
                            <div key={className} className="space-y-4">
                                <button 
                                    onClick={() => toggleActive(className)}
                                    className="w-full flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-indigo-100 transition-colors">
                                            <Users size={16} />
                                        </div>
                                        {className}
                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full ml-2">
                                            {exams.length}
                                        </span>
                                    </div>
                                    <div className="text-slate-400 group-hover:text-indigo-500 transition-colors">
                                        {collapsedActive[className] ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                </button>

                                {!collapsedActive[className] && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2">
                                        {exams.map(d => {
                                            const scheduledTime = new Date(d.scheduled_at);
                                            const isLive = d.status.toLowerCase() === 'live' || now >= scheduledTime;

                                            return (
                                                <div 
                                                    key={d.deployment_id} 
                                                    className={`p-6 bg-white dark:bg-slate-900 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm gap-4 transition-all ml-2 md:ml-6 ${
                                                        isLive ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md transform hover:-translate-y-1' : 'border border-slate-200 dark:border-slate-800 opacity-80'
                                                    }`}
                                                >
                                                    <div>
                                                        <h3 className="font-bold text-xl text-slate-800 dark:text-white">{d.exam?.title || 'Secure Assessment'}</h3>
                                                        <p className="text-sm text-slate-500 font-mono mt-1">{d.duration_minutes} mins • Opens: {scheduledTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => isLive && onStart(d)} 
                                                        disabled={!isLive}
                                                        className={`px-8 py-3.5 rounded-xl font-bold transition-all ${isLive ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                                    >
                                                        {isLive ? 'Start Secure Exam' : 'Scheduled'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- PAST RESULTS --- */}
            <div className="pt-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <History size={20} className="text-slate-400" /> Past Results
                </h2>
                <div className="space-y-8">
                    {Object.entries(groupedPast).map(([className, exams]) => (
                        <div key={className} className="space-y-3">
                            <button onClick={() => togglePast(className)} className="w-full flex items-center justify-between text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-2 mb-1 hover:text-indigo-600 transition-colors group">
                                <div className="flex items-center gap-2">
                                    <span>{className}</span>
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{exams.length}</span>
                                </div>
                                <div>{collapsedPast[className] ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</div>
                            </button>
                            {!collapsedPast[className] && (
                                <div className="space-y-3">
                                    {exams.map(e => (
                                        <div key={e.submission_id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-md ml-2 md:ml-6">
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-700 dark:text-slate-200 text-lg">{e.exam_master?.title || 'Exam'}</h4>
                                                <span className="text-xs text-slate-500">Submitted: {new Date(e.submitted_at).toLocaleDateString()}</span>
                                            </div>

                                            {/* 🚀 THE FIX: Check if status is 'published' before allowing Review */}
                                            {e.status === 'published' ? (
                                                <div className="flex items-center gap-6 w-full md:w-auto shrink-0 justify-between md:justify-end">
                                                    <div className="text-right">
                                                        <span className="text-2xl font-black text-green-600">{e.score} <span className="text-sm text-slate-400">/ {e.total_marks}</span></span>
                                                        <span className="block text-[10px] font-bold text-green-700 uppercase tracking-widest">Published</span>
                                                    </div>
                                                    <button onClick={() => setReviewExam(e)} className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all">
                                                        <FileSearch size={18} /> Review
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center w-full md:w-auto shrink-0 justify-between md:justify-end">
                                                    <span className="font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-4 py-2 rounded-xl border border-amber-100 dark:border-amber-800/50 text-xs shadow-sm uppercase tracking-wider flex items-center gap-2">
                                                        <Clock size={14} /> Pending Release
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* --- REVIEW MODAL --- */}
            {reviewExam && (
                <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-[100] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                    {/* Modal Toolbar */}
                    <div className="h-20 px-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shadow-sm z-10 shrink-0">
                        <div>
                            <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-3 text-xl"><FileSearch className="text-indigo-500" size={24} /> Performance Review</h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{reviewExam.exam_master?.title}</p>
                        </div>
                        <button onClick={() => setReviewExam(null)} className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-red-100 rounded-2xl transition-all"><X size={24} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-8">
                        <div className="max-w-4xl mx-auto space-y-6 pb-20">
                            
                            {/* 📊 PERFORMANCE SUMMARY CARDS */}
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                {(() => {
                                    const total = reviewExam.exam_master.questions.length;
                                    const correct = reviewExam.exam_master.questions.filter(q => reviewExam.answers[q.question_id] === q.correct_answer).length;
                                    const skipped = reviewExam.exam_master.questions.filter(q => !reviewExam.answers[q.question_id]).length;
                                    const incorrect = total - correct - skipped;
                                    return (
                                        <>
                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-b-4 border-green-500 shadow-sm text-center">
                                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Correct</span>
                                                <span className="text-2xl font-black text-green-600">{correct}</span>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-b-4 border-red-500 shadow-sm text-center">
                                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Incorrect</span>
                                                <span className="text-2xl font-black text-red-600">{incorrect}</span>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-b-4 border-slate-400 shadow-sm text-center">
                                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Skipped</span>
                                                <span className="text-2xl font-black text-slate-500">{skipped}</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {reviewExam.exam_master.questions.map((q, i) => {
                                const studentAnswer = reviewExam.answers[q.question_id];
                                const isSkipped = !studentAnswer;
                                const isCorrect = !isSkipped && studentAnswer === q.correct_answer;
                                let opts = [];
                                try { opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options); } catch (e) { opts = []; }

                                return (
                                    <div key={q.question_id} className={`bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[32px] border-2 shadow-sm ${isSkipped ? 'border-slate-200 dark:border-slate-800' : isCorrect ? 'border-green-200' : 'border-red-200'}`}>
                                        <div className="flex gap-4 mb-6">
                                            <span className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg ${isSkipped ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' : isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{i + 1}</span>
                                            <div className="flex-1 pt-1.5">
                                                <h3 className="font-bold text-lg md:text-xl text-slate-800 dark:text-white leading-relaxed">{q.question_text}</h3>
                                                <div className="mt-2 flex items-center gap-2">
                                                    {isSkipped ? <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded uppercase tracking-widest">Not Answered</span>
                                                    : isCorrect ? <span className="text-[10px] font-black text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded uppercase tracking-widest">Correct</span>
                                                    : <span className="text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded uppercase tracking-widest">Incorrect</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 md:pl-14 mb-8">
                                            {opts.map((opt, j) => {
                                                const label = ['A','B','C','D','E'][j];
                                                const isStudentChoice = studentAnswer === label;
                                                const isTrueAnswer = q.correct_answer === label;
                                                let style = isTrueAnswer ? "border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500/20 opacity-100" 
                                                          : isStudentChoice ? "border-red-400 bg-red-50 dark:bg-red-900/20 opacity-100" 
                                                          : "border-slate-100 dark:border-slate-800 opacity-60";
                                                return (
                                                    <div key={j} className={`p-4 rounded-2xl border-2 flex items-start gap-3 transition-all ${style}`}>
                                                        <div className="shrink-0 w-6 mt-0.5">{isTrueAnswer ? <CheckCircle className="text-green-600" size={20} /> : isStudentChoice ? <XCircle className="text-red-500" size={20} /> : <div className="w-2 h-2 rounded-full bg-slate-300 mt-2" />}</div>
                                                        <span className={`text-sm md:text-base font-medium ${isTrueAnswer ? 'text-green-900 dark:text-green-100 font-bold' : 'text-slate-500'}`}>{opt}</span>
                                                        {isStudentChoice && <span className="ml-auto text-[10px] font-black uppercase text-slate-400 px-2 py-1 bg-white dark:bg-slate-900 rounded-md border border-slate-100">Your Answer</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* 🚀 FORMALIZED CLINICAL RATIONALE */}
                                        {q.rationale && (
                                            <div className="md:pl-14">
                                                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                                                    <h4 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Info size={14} /> Clinical Review & Rationale</h4>
                                                    <div className="space-y-4">
                                                        {(() => {
                                                            try {
                                                                const r = typeof q.rationale === 'string' ? JSON.parse(q.rationale) : q.rationale;
                                                                return (
                                                                    <>
                                                                        {r.correct && <div><span className="text-[10px] font-bold text-green-600 uppercase block mb-1">Correct Answer Analysis</span><p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{r.correct}</p></div>}
                                                                        {r.wrong && <div className="pt-3 border-t border-slate-200 dark:border-slate-800"><span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Differential Considerations</span><p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">{r.wrong}</p></div>}
                                                                    </>
                                                                );
                                                            } catch (e) { return <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{q.rationale}</p>; }
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamsView;