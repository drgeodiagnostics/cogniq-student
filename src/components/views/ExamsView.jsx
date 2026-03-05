import React, { useState } from 'react';
import { 
    Users, History, ChevronDown, ChevronRight, 
    CheckCircle, XCircle, FileSearch, X, Info, Clock, ShieldCheck, RefreshCw, BookOpen
} from 'lucide-react';
// 🛡️ IMPORT DECRYPTION PROTOCOL
import { decryptAES256 } from '../../utils/security/sqbProtocol';

const ExamsView = ({ availableExams = [], pastExams = [], onStart, studentId, onRefresh }) => {
    const now = new Date();

    // 🚀 NEW: Tab State
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'past'

    const [collapsedActive, setCollapsedActive] = useState({});
    const [collapsedPast, setCollapsedPast] = useState({});
    const [reviewExam, setReviewExam] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const toggleActive = (className) => setCollapsedActive(prev => ({ ...prev, [className]: !prev[className] }));
    const togglePast = (className) => setCollapsedPast(prev => ({ ...prev, [className]: !prev[className] }));

    const handleManualSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        if (onRefresh) await onRefresh();
        setTimeout(() => setIsSyncing(false), 800);
    };

    const groupedAvailable = (availableExams || []).reduce((acc, d) => {
        const cName = d?.classroom?.name || 'Direct Assessments';
        if (!acc[cName]) acc[cName] = [];
        acc[cName].push(d);
        return acc;
    }, {});

    const completedPastExams = (pastExams || [])
    .filter(e => e?.status !== 'in_progress')
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

    const groupedPast = completedPastExams.reduce((acc, e) => {
        const cName = e?.exam_master?.classroom_master?.name || 'Recent Results';
        if (!acc[cName]) acc[cName] = [];
        acc[cName].push(e);
        return acc;
    }, {});

    const handleOpenReview = (examData) => {
        let parsedAnswers = examData?.answers;
        if (typeof parsedAnswers === 'string') {
            try { parsedAnswers = JSON.parse(parsedAnswers); } catch(e) { parsedAnswers = {}; }
        }

        setReviewExam({
            ...examData,
            answers: parsedAnswers || {}
        });
    };

    return (
        <div className="space-y-8 pb-20 animate-in fade-in">
            {/* 🚀 UPGRADED HEADER WITH TABS */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white dark:bg-slate-900 p-6 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                        <BookOpen className="text-indigo-500" size={24}/> Assessments
                    </h1>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Manage your active exams and review past performance.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto shrink-0">
                    {/* THE TABS */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto shrink-0">
                        <button 
                            onClick={() => setActiveTab('active')} 
                            className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'active' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <Clock size={16}/> Active ({availableExams?.length || 0})
                        </button>
                        <button 
                            onClick={() => setActiveTab('past')} 
                            className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'past' ? 'bg-white dark:bg-slate-700 shadow-sm text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <History size={16}/> Results ({completedPastExams.length || 0})
                        </button>
                    </div>

                    {/* MANUAL SYNC BUTTON */}
                    <button 
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm active:scale-95 shrink-0 ${
                            isSyncing 
                            ? 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 animate-pulse' 
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:text-indigo-600'
                        }`}
                    >
                        <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                        {isSyncing ? "Syncing..." : "Sync Status"}
                    </button>
                </div>
            </div>

            {/* ========================================== */}
            {/* 🟢 TAB 1: ACTIVE EXAMS                      */}
            {/* ========================================== */}
            {activeTab === 'active' && (
                <div className="animate-in slide-in-from-left-4 duration-300">
                    {Object.keys(groupedAvailable).length === 0 ? (
                        <div className="p-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-[24px] border border-dashed border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center gap-3">
                            <CheckCircle size={48} className="text-slate-200 dark:text-slate-700"/>
                            <span className="text-xs font-black uppercase tracking-widest block">You are all caught up!</span>
                            <button onClick={handleManualSync} className="text-indigo-500 font-bold text-[10px] uppercase hover:underline">Click to Refresh</button>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {Object.entries(groupedAvailable)
                                .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                                .map(([className, exams]) => (
                                <div key={className} className="space-y-4">
                                    <button 
                                        onClick={() => toggleActive(className)}
                                        className="w-full flex items-center justify-between font-black text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-3 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group uppercase tracking-tight"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 transition-colors">
                                                <Users size={18} />
                                            </div>
                                            {className}
                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md ml-2">
                                                {exams.length}
                                            </span>
                                        </div>
                                        <div className="text-slate-400 group-hover:text-indigo-500 transition-colors">
                                            {collapsedActive[className] ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </button>

                                    {!collapsedActive[className] && (
                                        <div className="space-y-4 animate-in slide-in-from-top-2">
                                            {exams.map(d => {
                                                const scheduledTime = new Date(d.scheduled_at);
                                                const isLive = d?.status?.toLowerCase() === 'live' || d?.status?.toLowerCase() === 'active' || now >= scheduledTime;

                                                const cloudStarted = pastExams.some(sub => sub.exam_id === d.exam_id && sub.status === 'in_progress');
                                                const localBufferKey = `exam_offline_buffer_${d.deployment_id}_${studentId}`;
                                                const localStarted = !!localStorage.getItem(localBufferKey);

                                                const isStarted = cloudStarted || localStarted;

                                                return (
                                                    <div 
                                                        key={d.deployment_id} 
                                                        className={`p-6 md:p-8 bg-white dark:bg-slate-900 rounded-[24px] flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm gap-6 transition-all group ${
                                                            isLive ? 'border border-indigo-200 dark:border-indigo-900/50 hover:border-indigo-400 dark:hover:border-indigo-500' : 'border border-slate-200 dark:border-slate-800 opacity-80'
                                                        }`}
                                                    >
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <h3 className="font-black text-xl text-slate-800 dark:text-white leading-tight">{d.exam?.title || 'Secure Assessment'}</h3>
                                                                {isLive && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-3 mt-3">
                                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded uppercase tracking-widest flex items-center gap-1">
                                                                    <Clock size={12}/> {d.duration_minutes || 0} mins
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded uppercase tracking-widest">
                                                                    Opens: {scheduledTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                                </span>
                                                                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-green-200 dark:border-green-800/50">
                                                                    <ShieldCheck size={12}/> AES-256
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => isLive && onStart(d)} 
                                                            disabled={!isLive}
                                                            className={`w-full md:w-auto px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg ${
                                                                !isLive 
                                                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                                                                    : isStarted 
                                                                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-900' 
                                                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                                                            }`}
                                                        >
                                                            {isLive ? (isStarted ? 'Continue Exam' : 'Start Exam') : 'Scheduled'}
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
            )}

            {/* ========================================== */}
            {/* 📚 TAB 2: PAST RESULTS                      */}
            {/* ========================================== */}
            {activeTab === 'past' && (
                <div className="animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-6">
                        {Object.entries(groupedPast).length === 0 ? (
                            <div className="p-16 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-[24px] border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-3">
                                <History size={48} className="text-slate-200 dark:text-slate-700"/>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">No results recorded yet</span>
                            </div>
                        ) : Object.entries(groupedPast).map(([className, exams]) => (
                            <div key={className} className="space-y-3">
                                <button onClick={() => togglePast(className)} className="w-full flex items-center justify-between text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 hover:text-indigo-600 transition-colors group">
                                    <div className="flex items-center gap-2">
                                        <span>{className}</span>
                                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{exams.length}</span>
                                    </div>
                                    <div>{collapsedPast[className] ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</div>
                                </button>
                                {!collapsedPast[className] && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2">
                                        {exams.map(e => (
                                            <div key={e.submission_id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800/50">
                                                <div className="flex-1">
                                                    <h4 className="font-black text-slate-800 dark:text-slate-100 text-lg leading-tight">{e.exam_master?.title || 'Exam'}</h4>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">Submitted: {new Date(e.submitted_at).toLocaleDateString()}</span>
                                                </div>

                                                {e.status === 'published' ? (
                                                    <div className="flex items-center gap-6 w-full md:w-auto shrink-0 justify-between md:justify-end">
                                                        <div className="text-right">
                                                            <span className="text-2xl font-black text-green-600 dark:text-green-500 leading-none block">{e.score || 0} <span className="text-sm text-slate-400">/ {e.total_marks || 0}</span></span>
                                                            <span className="text-[9px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest block mt-1">Published</span>
                                                        </div>
                                                        <button onClick={() => handleOpenReview(e)} className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                                                            <FileSearch size={16} /> Review
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center w-full md:w-auto shrink-0 justify-between md:justify-end">
                                                        <span className="font-black bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-5 py-3 rounded-xl border border-amber-200 dark:border-amber-800/50 text-[10px] uppercase tracking-widest flex items-center gap-2">
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
            )}

            {/* --- SAFE REVIEW MODAL --- */}
            {reviewExam && (
                <div className="fixed inset-0 bg-slate-50 dark:bg-[#0b0f19] z-[100] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                    <div className="h-20 px-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shadow-sm z-10 shrink-0">
                        <div>
                            <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-3 text-xl"><FileSearch className="text-indigo-500" size={24} /> Performance Review</h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{reviewExam?.exam_master?.title || 'Archived Assessment'}</p>
                        </div>
                        <button onClick={() => setReviewExam(null)} className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-2xl transition-all text-slate-500"><X size={24} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-8">
                        <div className="max-w-4xl mx-auto space-y-6 pb-20">
                            {(() => {
                                // 🛡️ EXTRACT QUESTIONS SAFELY
                                const questionsList = reviewExam?.exam_master?.questions || [];
                                const total = questionsList.length;

                                // ⚠️ FALLBACK UI: If old exam has no questions attached
                                if (total === 0) {
                                    return (
                                        <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm mt-10">
                                            <Info className="mx-auto text-indigo-400 mb-4" size={40} />
                                            <h3 className="text-xl font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Review Unavailable</h3>
                                            <p className="text-slate-500 mt-3 font-medium text-sm">Detailed question data is no longer available for this archived exam. Your final score was recorded successfully.</p>
                                        </div>
                                    );
                                }

                                // 🚀 ROBUST EVALUATION ENGINE
                                let correctCount = 0;
                                let skippedCount = 0;

                                const evaluatedQuestions = questionsList.map(q => {
                                    const studentAnswer = reviewExam?.answers?.[q.question_id];
                                    let isSkipped = !studentAnswer;
                                    let isCorrect = false;

                                    if (!isSkipped) {
                                        let sAns = String(studentAnswer).trim().toUpperCase();
                                        let cAns = String(q.correct_answer || '').trim().toUpperCase();
                                        
                                        if (sAns === cAns) {
                                            isCorrect = true;
                                        } else {
                                            let opts = [];
                                            try { opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options); } catch(e) { opts = []; }
                                            
                                            for (let j = 0; j < opts.length; j++) {
                                                const label = ['A','B','C','D','E'][j];
                                                const optText = String(opts[j] || '').trim().toUpperCase();
                                                if ((sAns === label || sAns === optText) && (cAns === label || cAns === optText)) {
                                                    isCorrect = true;
                                                    break;
                                                }
                                            }
                                        }
                                    }

                                    if (isSkipped) skippedCount++;
                                    else if (isCorrect) correctCount++;

                                    return { ...q, isSkipped, isCorrect, studentAnswer };
                                });

                                const incorrectCount = total - correctCount - skippedCount;

                                return (
                                    <>
                                        {/* 📊 DYNAMIC SUMMARY CHIPS */}
                                        <div className="grid grid-cols-3 gap-4 mb-8">
                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-b-4 border-green-500 shadow-sm text-center">
                                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Correct</span>
                                                <span className="text-2xl font-black text-green-600">{correctCount}</span>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-b-4 border-red-500 shadow-sm text-center">
                                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Incorrect</span>
                                                <span className="text-2xl font-black text-red-600">{incorrectCount}</span>
                                            </div>
                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-b-4 border-slate-400 shadow-sm text-center">
                                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Skipped</span>
                                                <span className="text-2xl font-black text-slate-500">{skippedCount}</span>
                                            </div>
                                        </div>

                                        {/* 📝 QUESTIONS LOOP */}
                                        {evaluatedQuestions.map((q, i) => {
                                            let opts = [];
                                            try { opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options); } catch (e) { opts = []; }

                                            return (
                                                <div key={q.question_id || i} className={`bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[32px] border-2 shadow-sm ${q.isSkipped ? 'border-slate-200 dark:border-slate-800' : q.isCorrect ? 'border-green-200 dark:border-green-900/50' : 'border-red-200 dark:border-red-900/50'}`}>
                                                    <div className="flex gap-4 mb-6">
                                                        <span className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg ${q.isSkipped ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' : q.isCorrect ? 'bg-green-100 text-green-600 dark:bg-green-900/50' : 'bg-red-100 text-red-600 dark:bg-red-900/50'}`}>{i + 1}</span>
                                                        <div className="flex-1 pt-1.5">
                                                            <h3 className="font-bold text-lg md:text-xl text-slate-800 dark:text-white leading-relaxed">{q.question_text || 'Question text not available'}</h3>
                                                            <div className="mt-2 flex items-center gap-2">
                                                                {q.isSkipped ? <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded uppercase tracking-widest">Not Answered</span>
                                                                : q.isCorrect ? <span className="text-[10px] font-black text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded uppercase tracking-widest">Correct</span>
                                                                : <span className="text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded uppercase tracking-widest">Incorrect</span>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 md:pl-14 mb-8">
                                                        {opts.map((opt, j) => {
                                                            const label = ['A','B','C','D','E'][j];
                                                            const sAns = String(q.studentAnswer || '').trim().toUpperCase();
                                                            const cAns = String(q.correct_answer || '').trim().toUpperCase();
                                                            const optText = String(opt || '').trim().toUpperCase();
                                                            
                                                            const isStudentChoice = sAns === label || sAns === optText;
                                                            const isTrueAnswer = cAns === label || cAns === optText;
                                                            
                                                            let style = isTrueAnswer ? "border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500/20 opacity-100" 
                                                                      : isStudentChoice ? "border-red-400 bg-red-50 dark:bg-red-900/20 opacity-100" 
                                                                      : "border-slate-100 dark:border-slate-800 opacity-60";
                                                            
                                                            return (
                                                                <div key={j} className={`p-4 rounded-2xl border-2 flex items-start gap-3 transition-all ${style}`}>
                                                                    <div className="shrink-0 w-6 mt-0.5">{isTrueAnswer ? <CheckCircle className="text-green-600" size={20} /> : isStudentChoice ? <XCircle className="text-red-500" size={20} /> : <div className="w-2 h-2 rounded-full bg-slate-300 mt-2" />}</div>
                                                                    <span className={`text-sm md:text-base font-medium ${isTrueAnswer ? 'text-green-900 dark:text-green-100 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>{opt}</span>
                                                                    {isStudentChoice && <span className="ml-auto text-[10px] font-black uppercase text-slate-400 px-2 py-1 bg-white dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800">Your Answer</span>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

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
                                                                        } catch (e) { return <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{String(q.rationale)}</p>; }
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamsView;