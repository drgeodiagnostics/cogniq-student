import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../supabaseClient'; 
import { 
    ChevronLeft, ChevronRight, Flag, CheckCircle, AlertTriangle, 
    Clock, LayoutGrid, Eraser, Cloud, CloudOff, Loader2, WifiOff, ShieldAlert, Lock, RefreshCw, Pause 
} from 'lucide-react';
import { decryptAES256 } from '../../utils/security/sqbProtocol';

// --- 🚀 UTILITIES: Seeded Randomization Engine ---
const generateSeed = (str) => {
    for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
    } return function() {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
};

const mulberry32 = (a) => {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
};

const shuffleArrayDeterministic = (array, randomFunc) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(randomFunc() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

export default function ActiveExamInterface({ exam, questions, studentId, isPWA, onComplete }) {
    const LOCAL_BACKUP_KEY = `exam_offline_buffer_${exam?.deployment_id}_${studentId}`;

    const [loadingData, setLoadingData] = useState(true);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [showConfirm, setShowConfirm] = useState(false);
    const [syncStatus, setSyncStatus] = useState(navigator.onLine ? 'synced' : 'offline_saved'); 

    // --- STATE ---
    const [answers, setAnswers] = useState({});
    const [flagged, setFlagged] = useState(new Set());
    const [timeLeft, setTimeLeft] = useState((exam?.duration_minutes || 60) * 60);
    
    // 🛡️ SECURITY & COMMAND STATE
    const [violationCount, setViolationCount] = useState(0);
    const [showViolationModal, setShowViolationModal] = useState(false);
    const [isHardLocked, setIsHardLocked] = useState(false);
    const [isCheckingUnlock, setIsCheckingUnlock] = useState(false); 
    const [isGlobalPaused, setIsGlobalPaused] = useState(exam?.status === 'paused'); // 🚀 NEW: Pause State

    // REFS FOR BACKGROUND SYNC
    const submissionIdRef = useRef(null);
    const answersRef = useRef({});
    const flaggedRef = useRef(new Set());
    const timeRef = useRef((exam?.duration_minutes || 60) * 60);
    const violationsRef = useRef(0);

    // --- 🚀 ENGINE: DETERMINISTIC DECRYPTION & SHUFFLE ---
    const decryptedAndShuffledQuestions = useMemo(() => {
        if (!questions) return [];
        
        const masterSeedStr = `${studentId}_${exam.exam_id}`;
        const masterSeedFunc = generateSeed(masterSeedStr);
        const randFunc = mulberry32(masterSeedFunc());
        
        let parsedQs = questions.map(q => {
            let plainText = q.question_text;
            try { plainText = decryptAES256(q.question_text); } catch (e) {}
            
            let plainAnswer = q.correct_answer;
            try { plainAnswer = decryptAES256(q.correct_answer); } catch (e) {}

            let plainOptions = q.options;
            if (q.options?.cipher) {
                try { plainOptions = JSON.parse(decryptAES256(q.options.cipher)); } catch (e) {}
            }

            let actualCorrectText = plainAnswer;
            if (Array.isArray(plainOptions) && /^[A-E]$/i.test(plainAnswer)) {
                const idx = plainAnswer.toUpperCase().charCodeAt(0) - 65; 
                if (plainOptions[idx]) actualCorrectText = plainOptions[idx];
            }

            const qSeedStr = `${studentId}_${q.question_id}`;
            const qRandFunc = mulberry32(generateSeed(qSeedStr)());

            let randomizedOptions = plainOptions;
            if (Array.isArray(plainOptions) && plainOptions.length > 0) {
                const validOptions = plainOptions.filter(opt => opt && opt.trim() !== '');
                randomizedOptions = shuffleArrayDeterministic(validOptions, qRandFunc);
            }

            return { 
                ...q, 
                question_text: plainText, 
                correct_answer: actualCorrectText, 
                options: randomizedOptions 
            };
        });

        return shuffleArrayDeterministic(parsedQs, randFunc);
    }, [questions, exam.exam_id, studentId]);

    // --- 📡 HYBRID DISPATCHER ---
    const syncData = useCallback(async () => {
        const payload = {
            ...answersRef.current,
            __flagged: Array.from(flaggedRef.current),
            __timeLeft: timeRef.current,
            __violations: violationsRef.current
        };

        localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(payload));

        if (!navigator.onLine || !submissionIdRef.current) {
            setSyncStatus('offline_saved');
            return;
        }

        setSyncStatus('saving');
        const { error } = await supabase
            .from('exam_submissions')
            .update({ answers: payload })
            .eq('submission_id', submissionIdRef.current);
        
        if (error) {
            setSyncStatus('offline_saved');
        } else {
            setTimeout(() => setSyncStatus('synced'), 500); 
        }
    }, [LOCAL_BACKUP_KEY]);

    // --- 📡 OFFLINE HARD-LOCK ENGINE ---
    useEffect(() => {
        let offlineTimer = null;
        const PENDING_LOCK_KEY = `pending_lock_${exam?.deployment_id}_${studentId}`;
        const OFFLINE_THREAT_QUEUE_KEY = `offline_threats_${exam?.deployment_id}_${studentId}`;

        const handleOffline = () => {
            setSyncStatus('offline_saved');

            offlineTimer = setTimeout(() => {
                setIsHardLocked(true);
                
                const incidentPayload = {
                    deployment_id: exam?.deployment_id,
                    student_id: studentId,
                    incident_type: 'network_disconnect',
                    description: `Network Disconnect: Device offline for >30s. Exam Auto-Locked to prevent offline textbook/phone usage.`,
                    severity: 'high'
                };
                
                const existingQueue = JSON.parse(localStorage.getItem(OFFLINE_THREAT_QUEUE_KEY) || '[]');
                existingQueue.push(incidentPayload);
                localStorage.setItem(OFFLINE_THREAT_QUEUE_KEY, JSON.stringify(existingQueue));
                localStorage.setItem(PENDING_LOCK_KEY, 'true');

            }, 30000); 
        };

        const handleOnline = async () => {
            if (offlineTimer) {
                clearTimeout(offlineTimer);
                offlineTimer = null;
            }

            await new Promise(resolve => setTimeout(resolve, 2000));

            if (localStorage.getItem(PENDING_LOCK_KEY) === 'true') {
                if (submissionIdRef.current) {
                    await supabase.from('exam_submissions').update({ is_locked: true }).eq('submission_id', submissionIdRef.current);
                }
                localStorage.removeItem(PENDING_LOCK_KEY);
            }

            syncData(); 
        };

        if (!navigator.onLine) {
            handleOffline();
        }

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            if (offlineTimer) clearTimeout(offlineTimer);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [syncData, exam?.deployment_id, studentId]);

    // --- ☁️ DATA HEALING INITIALIZATION ENGINE ---
    const initRef = useRef(false);
    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;

        const initializeSession = async () => {
            try {
                const localBackupStr = localStorage.getItem(LOCAL_BACKUP_KEY);
                let activePayload = localBackupStr ? JSON.parse(localBackupStr) : {};

                const { data, error: selectErr } = await supabase
                    .from('exam_submissions')
                    .select('submission_id, answers, is_locked')
                    .eq('exam_id', exam.exam_id)
                    .eq('student_id', studentId)
                    .limit(1);

                if (selectErr) console.error("🚨 Supabase Fetch Error:", selectErr.message);

                const activeRecord = data && data.length > 0 ? data[0] : null;

                if (activeRecord) {
                    submissionIdRef.current = activeRecord.submission_id;
                    const cloudPayload = activeRecord.answers || {};
                    if ((cloudPayload.__timeLeft || Infinity) <= (activePayload.__timeLeft || Infinity)) {
                        activePayload = cloudPayload; 
                    }
                } else if (navigator.onLine) {
                    const { data: newRow } = await supabase
                        .from('exam_submissions')
                        .insert([{ exam_id: exam.exam_id, student_id: studentId, status: 'in_progress', answers: activePayload }])
                        .select('submission_id')
                        .single();
                    if (newRow) submissionIdRef.current = newRow.submission_id;
                }

                if (activePayload.__timeLeft) { setTimeLeft(activePayload.__timeLeft); timeRef.current = activePayload.__timeLeft; }
                if (activePayload.__flagged) { 
                    const loadedFlags = new Set(activePayload.__flagged);
                    setFlagged(loadedFlags); flaggedRef.current = loadedFlags; 
                }

                let loadedViolations = activePayload.__violations || 0;

                if (activeRecord) {
                    if (activeRecord.is_locked) {
                        setIsHardLocked(true);
                        loadedViolations = Math.max(loadedViolations, 5); 
                    } else if (!activeRecord.is_locked && loadedViolations >= 5) {
                        setIsHardLocked(false);
                        loadedViolations = 0;
                        activePayload.__violations = 0;
                        localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify({ ...activePayload, __violations: 0 }));
                    } else {
                        setIsHardLocked(false);
                    }
                } else if (loadedViolations >= 5) {
                    setIsHardLocked(true);
                }

                violationsRef.current = loadedViolations;
                setViolationCount(loadedViolations);

                const cleanAnswers = { ...activePayload };
                delete cleanAnswers.__timeLeft; delete cleanAnswers.__flagged; delete cleanAnswers.__violations;
                
                setAnswers(cleanAnswers); answersRef.current = cleanAnswers;

                const firstUnansweredIdx = decryptedAndShuffledQuestions.findIndex(q => !cleanAnswers[q.question_id]);
                if (firstUnansweredIdx !== -1) setCurrentIdx(firstUnansweredIdx);
                else if (Object.keys(cleanAnswers).length > 0) setCurrentIdx(decryptedAndShuffledQuestions.length - 1);

            } catch (err) {
                console.error("Init Fault:", err);
            } finally {
                setLoadingData(false);
            }
        };
        initializeSession();
    }, [exam.exam_id, studentId, LOCAL_BACKUP_KEY, decryptedAndShuffledQuestions]);

    // --- 🛡️ PROCTORING ENGINE & OFFLINE THREAT QUEUE ---
    useEffect(() => {
        let violationDebounce = false;
        const OFFLINE_THREAT_QUEUE_KEY = `offline_threats_${exam.deployment_id}_${studentId}`;

        const flushOfflineThreats = async () => {
            if (!navigator.onLine) return; 
            
            const queuedThreatsStr = localStorage.getItem(OFFLINE_THREAT_QUEUE_KEY);
            if (!queuedThreatsStr) return; 
            
            try {
                const queuedThreats = JSON.parse(queuedThreatsStr);
                if (Array.isArray(queuedThreats) && queuedThreats.length > 0) {
                    const { error } = await supabase.from('proctoring_logs').insert(queuedThreats);
                    if (!error) {
                        localStorage.removeItem(OFFLINE_THREAT_QUEUE_KEY);
                        console.log(`📡 Flushed ${queuedThreats.length} offline security violations to HQ.`);
                    }
                }
            } catch (err) {
                console.error("Failed to flush offline threats:", err);
            }
        };

        flushOfflineThreats();

        const logSecurityViolation = async (type, detail) => {
            if (violationDebounce || isHardLocked || isGlobalPaused) return; // 🚀 Don't flag if exam is paused!
            violationDebounce = true;
            setTimeout(() => { violationDebounce = false; }, 2000);

            const nextCount = violationsRef.current + 1;
            setViolationCount(nextCount);
            violationsRef.current = nextCount;

            const currentPayload = JSON.parse(localStorage.getItem(LOCAL_BACKUP_KEY) || '{}');
            localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify({ ...currentPayload, __violations: nextCount }));

            if (nextCount >= 5) {
                setIsHardLocked(true);
                if (submissionIdRef.current && navigator.onLine) {
                    await supabase.from('exam_submissions').update({ is_locked: true }).eq('submission_id', submissionIdRef.current);
                }
            }

            const incidentPayload = {
                deployment_id: exam.deployment_id, 
                student_id: studentId, 
                incident_type: type, 
                description: navigator.onLine ? detail : `${detail} (Logged Offline)`, 
                severity: 'high'
            };

            if (!navigator.onLine) {
                const existingQueue = JSON.parse(localStorage.getItem(OFFLINE_THREAT_QUEUE_KEY) || '[]');
                existingQueue.push(incidentPayload);
                localStorage.setItem(OFFLINE_THREAT_QUEUE_KEY, JSON.stringify(existingQueue));
                return; 
            } 
            
            await supabase.from('proctoring_logs').insert([incidentPayload]);
            syncData(); 
        };

        const handleVisibilityChange = () => { if (document.hidden) { logSecurityViolation('visibility_hidden', 'Focus Lost: Tab switched.'); setShowViolationModal(true); } };
        const handleWindowBlur = () => { logSecurityViolation('window_blur', 'Focus Lost: Interacted with external app.'); setShowViolationModal(true); };
        
        let lastWidth = window.innerWidth;
        const handleResize = () => {
            if (window.innerWidth !== lastWidth) {
                logSecurityViolation('window_resize', 'Window resized: Potential Split View.');
                setShowViolationModal(true);
                lastWidth = window.innerWidth;
            }
        };

        const handleBeforeUnload = (e) => { syncData(); e.preventDefault(); e.returnValue = ''; return ''; };

        const handleOnlineDelayedFlush = async () => {
            await new Promise(r => setTimeout(r, 2000));
            flushOfflineThreats();
        };

        window.addEventListener('online', handleOnlineDelayedFlush);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleWindowBlur);
        window.addEventListener('resize', handleResize);
        window.addEventListener('beforeunload', handleBeforeUnload);

        const channel = supabase.channel(`lock-status-${studentId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'exam_submissions', filter: `student_id=eq.${studentId}` }, 
            (payload) => {
                if (payload.new.is_locked === false) {
                    setIsHardLocked(false);
                    setShowViolationModal(false);
                    violationsRef.current = 0; setViolationCount(0);
                    try {
                        const currentPayload = JSON.parse(localStorage.getItem(LOCAL_BACKUP_KEY) || '{}');
                        localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify({ ...currentPayload, __violations: 0 }));
                    } catch(e) {}
                } else if (payload.new.is_locked === true) {
                    setIsHardLocked(true);
                }
            }).subscribe();

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleWindowBlur);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('online', handleOnlineDelayedFlush);
            supabase.removeChannel(channel);
        };
    }, [exam.deployment_id, studentId, syncData, isHardLocked, isGlobalPaused, LOCAL_BACKUP_KEY]); // 🚀 Added isGlobalPaused dependency

    // --- 🚨 WARNING MODAL 15-SECOND ESCALATION ENGINE ---
    useEffect(() => {
        let warningTimer = null;

        if (showViolationModal && !isHardLocked && !isGlobalPaused) { // 🚀 Don't escalate if paused
            warningTimer = setTimeout(async () => {
                setIsHardLocked(true);
                setShowViolationModal(false); 

                const incidentPayload = {
                    deployment_id: exam?.deployment_id,
                    student_id: studentId,
                    incident_type: 'warning_timeout',
                    description: 'Security Warning ignored for >15s. Potential away-from-keyboard or secondary device usage. Exam Auto-Locked.',
                    severity: 'high'
                };

                if (navigator.onLine) {
                    await supabase.from('proctoring_logs').insert([incidentPayload]);
                    if (submissionIdRef.current) {
                        await supabase.from('exam_submissions').update({ is_locked: true }).eq('submission_id', submissionIdRef.current);
                    }
                } else {
                    const OFFLINE_THREAT_QUEUE_KEY = `offline_threats_${exam?.deployment_id}_${studentId}`;
                    const PENDING_LOCK_KEY = `pending_lock_${exam?.deployment_id}_${studentId}`;
                    
                    const existingQueue = JSON.parse(localStorage.getItem(OFFLINE_THREAT_QUEUE_KEY) || '[]');
                    existingQueue.push(incidentPayload);
                    localStorage.setItem(OFFLINE_THREAT_QUEUE_KEY, JSON.stringify(existingQueue));
                    localStorage.setItem(PENDING_LOCK_KEY, 'true');
                }
            }, 15000); // 15 Seconds
        }

        return () => {
            if (warningTimer) clearTimeout(warningTimer);
        };
    }, [showViolationModal, isHardLocked, isGlobalPaused, exam?.deployment_id, studentId]);

    // --- 🛑 GLOBAL PAUSE LISTENER ---
    useEffect(() => {
        const deployChannel = supabase.channel(`deployment-status-${exam?.deployment_id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'exam_deployments', filter: `deployment_id=eq.${exam?.deployment_id}` }, 
            (payload) => {
                if (payload.new.status === 'paused') {
                    setIsGlobalPaused(true);
                    syncData(); // Force save right as it pauses
                } else if (payload.new.status === 'live' || payload.new.status === 'active') {
                    setIsGlobalPaused(false);
                }
            }).subscribe();

        return () => supabase.removeChannel(deployChannel);
    }, [exam?.deployment_id, syncData]);

    // --- 🛰️ SAFETY NET: BACKUP POLLING (If WebSocket Fails or Latency is high) ---
    useEffect(() => {
        if (!exam?.deployment_id) return;

        const safetyNet = setInterval(async () => {
            try {
                const { data, error } = await supabase
                    .from('exam_deployments')
                    .select('status')
                    .eq('deployment_id', exam.deployment_id)
                    .single();

                if (error) throw error;

                // Sync the UI state if the polling finds a mismatch with local state
                if (data?.status === 'paused' && !isGlobalPaused) {
                    console.warn("⚠️ WebSocket Missed: Safety Net triggered PAUSE");
                    setIsGlobalPaused(true);
                    syncData();
                } else if ((data?.status === 'live' || data?.status === 'active') && isGlobalPaused) {
                    console.warn("⚠️ WebSocket Missed: Safety Net triggered RESUME");
                    setIsGlobalPaused(false);
                }
            } catch (err) {
                console.error("Safety Net Check Failed:", err);
            }
        }, 10000); // Check every 10 seconds

        return () => clearInterval(safetyNet);
    }, [exam?.deployment_id, isGlobalPaused, syncData]);
    
    // --- 🚀 NEW: MANUAL UNLOCK CHECK ---
    const manualUnlockCheck = async () => {
        setIsCheckingUnlock(true);
        try {
            const { data, error } = await supabase
                .from('exam_submissions')
                .select('is_locked')
                .eq('exam_id', exam.exam_id)
                .eq('student_id', studentId)
                .limit(1);

            const activeRecord = data && data.length > 0 ? data[0] : null;

            if (activeRecord && activeRecord.is_locked === false) {
                setIsHardLocked(false);
                setShowViolationModal(false);
                violationsRef.current = 0;
                setViolationCount(0);
                
                try {
                    const currentPayload = JSON.parse(localStorage.getItem(LOCAL_BACKUP_KEY) || '{}');
                    localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify({ ...currentPayload, __violations: 0 }));
                } catch(e) {}
            } else {
                alert("Status: Still Locked.\n\nPlease wait for your proctor to revoke the lock before trying again.");
            }
        } catch (err) {
            console.error("Check failed:", err);
            alert("Network Error: Could not verify status with the server.");
        } finally {
            setIsCheckingUnlock(false);
        }
    };

    // --- TIMER ---
    useEffect(() => {
        // 🚀 THE FIX: Timer freezes if isGlobalPaused is true!
        if (loadingData || isHardLocked || isGlobalPaused) return; 
        
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { clearInterval(timer); return 0; }
                const nextTime = prev - 1;
                timeRef.current = nextTime;
                if (nextTime % 15 === 0) syncData(); 
                return nextTime;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [loadingData, isHardLocked, isGlobalPaused, syncData]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60); const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // --- HANDLERS ---
    const handleOptionSelect = (qId, optionText) => {
        if (isHardLocked || isGlobalPaused) return; // 🚀 Block answers while paused
        const next = { ...answersRef.current, [qId]: optionText };
        setAnswers(next); answersRef.current = next; syncData(); 
    };

    const handleClearSelection = (qId) => {
        if (isHardLocked || isGlobalPaused) return;
        const next = { ...answersRef.current }; delete next[qId];
        setAnswers(next); answersRef.current = next; syncData(); 
    };

    const toggleFlag = (qId) => {
        if (isHardLocked || isGlobalPaused) return;
        const next = new Set(flaggedRef.current);
        if (next.has(qId)) next.delete(qId); else next.add(qId);
        setFlagged(next); flaggedRef.current = next; syncData(); 
    };

    const handleFinalSubmit = useCallback(async () => {
        if (!navigator.onLine) { alert("📡 Reconnect to Wi-Fi to submit your final score."); setShowConfirm(false); return; }
        let score = 0;
        decryptedAndShuffledQuestions.forEach(q => { if (answersRef.current[q.question_id] === q.correct_answer) score++; });
        localStorage.removeItem(LOCAL_BACKUP_KEY);
        onComplete(score, decryptedAndShuffledQuestions.length, answersRef.current);
    }, [decryptedAndShuffledQuestions, onComplete, LOCAL_BACKUP_KEY]);

    useEffect(() => { if (timeLeft === 0 && !loadingData) handleFinalSubmit(); }, [timeLeft, loadingData, handleFinalSubmit]);

    if (loadingData) return <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900"><Loader2 size={32} className="animate-spin text-indigo-500 mb-4" /><p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Securing Session...</p></div>;

    const currentQ = decryptedAndShuffledQuestions[currentIdx];
    const isFlagged = flagged.has(currentQ?.question_id);
    const hasAnswer = !!answers[currentQ?.question_id]; 

    return (
        <div 
            className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#0b0f19] font-sans select-none overflow-hidden text-slate-900 dark:text-slate-100"
            onContextMenu={(e) => e.preventDefault()} 
            onCopy={(e) => e.preventDefault()}
            style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none', userSelect: 'none' }}
        >
            {/* 🛑 GLOBAL PAUSE SCREEN */}
            {isGlobalPaused && !isHardLocked && (
                <div className="fixed inset-0 z-[115] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-6 text-center animate-in fade-in duration-500">
                    <div className="max-w-md w-full">
                        <div className="w-24 h-24 bg-blue-500/10 text-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-blue-500/20 shadow-2xl">
                            <Pause size={48} className="animate-pulse" />
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-4">Exam Paused</h2>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8">
                            Your proctor has temporarily paused this assessment. 
                            <br/><br/>
                            <span className="text-blue-400 font-bold">Your timer has been frozen.</span> Please wait for further instructions.
                        </p>
                    </div>
                </div>
            )}

            {/* 🚨 HARD LOCK SCREEN WITH REFRESH BUTTON */}
            {isHardLocked && (
                <div className="fixed inset-0 z-[110] bg-slate-900 flex items-center justify-center p-6 text-center animate-in fade-in duration-500">
                    <div className="max-w-md w-full">
                        <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-2xl">
                            <Lock size={48} className="animate-pulse" />
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-4">Session Locked</h2>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8">This assessment is locked due to multiple security violations. Contact your proctor to resume.</p>
                        
                        <div className="bg-slate-800 border border-white/10 p-4 rounded-2xl mb-8">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">ID Ref</span>
                            <span className="text-sm font-mono text-indigo-400">{studentId.substring(0,8).toUpperCase()}</span>
                        </div>

                        {/* 🚀 NEW MANUAL CHECK BUTTON */}
                        <button 
                            onClick={manualUnlockCheck}
                            disabled={isCheckingUnlock}
                            className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                            {isCheckingUnlock ? <Loader2 className="animate-spin" size={20}/> : <RefreshCw size={20}/>}
                            {isCheckingUnlock ? "VERIFYING STATUS..." : "CHECK UNLOCK STATUS"}
                        </button>
                    </div>
                </div>
            )}

            {/* ⚠️ VIOLATION MODAL */}
            {showViolationModal && !isHardLocked && (
                <div className="fixed inset-0 z-[100] bg-red-600/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] max-w-md w-full text-center shadow-2xl border-4 border-red-500">
                        <ShieldAlert size={44} className="text-red-600 mx-auto mb-6 animate-bounce" />
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase mb-2">Security Warning</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">Focus loss detected. Violation {violationCount} of 5 recorded.</p>
                        <button onClick={() => setShowViolationModal(false)} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-transform active:scale-95">Resume Assessment</button>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <LayoutGrid size={18} />
                    </div>
                    <h1 className="font-bold text-base md:text-lg truncate">{exam?.title}</h1>
                </div>

                <div className="flex items-center gap-4">
                    {violationCount > 0 && (
                        <div className="hidden sm:flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-1 rounded-lg text-red-600 dark:text-red-400 animate-pulse">
                            <ShieldAlert size={14} />
                            <span className="text-[10px] font-black uppercase">Flags: {violationCount}</span>
                        </div>
                    )}
                    <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold">
                        {syncStatus === 'saving' && <span className="text-slate-400 animate-pulse">Saving...</span>}
                        {syncStatus === 'synced' && <span className="text-green-500 flex items-center gap-1"><Cloud size={14}/> Saved</span>}
                        {syncStatus === 'offline_saved' && <span className="text-amber-500 flex items-center gap-1"><WifiOff size={14}/> Offline</span>}
                    </div>
                    <div className={`flex items-center gap-2 font-mono font-bold px-4 py-1.5 rounded-lg border text-sm ${timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse border-red-200' : 'bg-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}>
                        <Clock size={16} /> {formatTime(timeLeft)}
                    </div>
                </div>
            </header>

            <div className={`flex-1 flex flex-col md:flex-row min-h-0 transition-all duration-500 ${violationCount > 0 ? 'ring-inset ring-4 ring-red-500/5' : ''}`}>
                <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0b0f19]">
                    <div className="flex-1 overflow-y-auto p-6 md:p-10 w-full mx-auto max-w-4xl">
                        {violationCount > 0 && (
                            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                                <AlertTriangle size={16} className="text-red-500" />
                                <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">Integrity monitor flagged focus loss. Faculty notified.</p>
                            </div>
                        )}
                        <div className="flex justify-between items-center mb-8">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question {currentIdx + 1} / {decryptedAndShuffledQuestions.length}</span>
                            <div className="flex gap-2">
                                {hasAnswer && <button onClick={() => handleClearSelection(currentQ.question_id)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"><Eraser size={14} /> Clear</button>}
                                <button onClick={() => toggleFlag(currentQ.question_id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isFlagged ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20' : 'border-slate-200 dark:border-slate-800 text-slate-500'}`}><Flag size={14} className={isFlagged ? 'fill-amber-500' : ''}/> {isFlagged ? 'Flagged' : 'Flag'}</button>
                            </div>
                        </div>

                        <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white mb-8 leading-relaxed">{currentQ.question_text}</h2>
                        
                        <div className="space-y-3 pb-8">
                            {currentQ.options?.map((opt, i) => {
                                const selected = answers[currentQ.question_id] === opt;
                                return (
                                    <div key={i} onClick={() => handleOptionSelect(currentQ.question_id, opt)} className={`w-full p-4 md:p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 group ${selected ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'}`}>
                                        <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 group-hover:border-indigo-400'}`}>
                                            {selected && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                        <span className={`text-sm md:text-base ${selected ? 'font-bold text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* NAV FOOTER */}
                    <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4">
                        <div className="max-w-4xl mx-auto flex justify-between">
                            <button onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))} disabled={currentIdx === 0} className="px-6 py-2.5 rounded-xl border font-bold disabled:opacity-30">Previous</button>
                            {currentIdx === decryptedAndShuffledQuestions.length - 1 ? (
                                <button onClick={() => setShowConfirm(true)} className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Submit Exam</button>
                            ) : (
                                <button onClick={() => setCurrentIdx(prev => Math.min(decryptedAndShuffledQuestions.length - 1, prev + 1))} className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold active:scale-95 transition-all">Next Question</button>
                            )}
                        </div>
                    </div>
                </main>

                {/* SIDEBAR NAVIGATOR */}
                <aside className="w-full md:w-72 bg-slate-50 dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Navigator</h3>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md">{Object.keys(answers).length} / {decryptedAndShuffledQuestions.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-6 md:grid-cols-5 gap-2">
                            {decryptedAndShuffledQuestions.map((q, i) => (
                                <button key={q.question_id} onClick={() => setCurrentIdx(i)} className={`w-9 h-9 md:w-10 md:h-10 rounded-lg border flex items-center justify-center text-xs font-bold transition-all relative ${currentIdx === i ? 'ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-slate-900 z-10' : ''} ${answers[q.question_id] ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                                    {i + 1}
                                    {flagged.has(q.question_id) && <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 border-2 border-white dark:border-slate-900 rounded-full" />}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 hidden md:block">
                        <button onClick={() => setShowConfirm(true)} className="w-full py-3 rounded-xl bg-slate-200/50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm">Finish Exam</button>
                    </div>
                </aside>
            </div>

            {/* CONFIRMATION MODAL */}
            {showConfirm && (
                <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] max-w-sm w-full text-center shadow-2xl border border-slate-200 dark:border-slate-800">
                        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32}/></div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Submit Exam?</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Review your answers carefully. You cannot change them after submission.</p>
                        <button onClick={handleFinalSubmit} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black mb-3 active:scale-95 transition-transform">Confirm Submission</button>
                        <button onClick={() => setShowConfirm(false)} className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest">Back to Review</button>
                    </div>
                </div>
            )}
        </div>
    );
}