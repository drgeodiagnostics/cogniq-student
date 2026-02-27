import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Device } from '@capacitor/device';
import { PrivacyScreen } from '@capacitor-community/privacy-screen';

// 🔒 SECURITY PROTOCOL
import { decryptAES256 } from './utils/security/sqbProtocol';

// 📦 LAYOUT & AUTH
import StudentDashboardLayout from './components/layout/StudentDashboardLayout';
import LoginScreen from './components/auth/LoginScreen';
import DeviceGuard from './components/auth/DeviceGuard';

// 🧩 MODULAR VIEWS
import DashboardView from './components/views/DashboardView';
import ExamsView from './components/views/ExamsView';
import ActiveExamInterface from './components/views/ActiveExamInterface';
import AtlasView from './components/views/AtlasView';
import MentorshipView from './components/views/MentorshipView';
import ProfileView from './components/views/ProfileView';

// ⚠️ TEMPORARY OVERRIDE: Web Mode Active
const STRICT_DEVICE_MODE = false; 

// 📱 PWA DETECTION ENGINE
const isPWA = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

function App() {
  // --- STATE MANAGEMENT ---
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [profile, setProfile] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState('checking');
  const [view, setView] = useState('dashboard');
  
  const [dashboardData, setDashboardData] = useState({
      myClassrooms: [], 
      announcements: [], 
      myMentor: null, 
      availableExams: [], 
      pastExams: []
  });
  
  const [currentExam, setCurrentExam] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);

  // --- INITIALIZATION ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { 
        setSession(session); 
        if (session) initializeUser(session.user.id); else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { 
        setSession(session); 
        if (session) initializeUser(session.user.id); else setLoading(false);
    });
    
    const setupMobileSecurity = async () => {
      try { 
        await PrivacyScreen.enable(); 
      } catch (e) { 
        if(STRICT_DEVICE_MODE) console.warn("Native Security Plugin not active."); 
      }
    };
    setupMobileSecurity();

    return () => subscription.unsubscribe();
  }, []);

  // --- CORE FUNCTIONS ---
  const initializeUser = async (userId) => {
    setLoading(true);
    const { data: userProfile, error } = await supabase
        .from('user_master')
        .select('*, org_master(status, name, subscription_tier)') 
        .eq('user_id', userId)
        .single();
    
    if (error || !userProfile) { 
        if (error?.code === 'PGRST116') alert("Student Profile Not Found. Contact Admin."); 
        await supabase.auth.signOut(); 
        setLoading(false); 
        return; 
    }

    if (userProfile.org_master?.status === 'suspended') {
      alert(`🚫 SERVICE PAUSED\n\n${userProfile.org_master.name} is temporarily suspended.`);
      await supabase.auth.signOut(); 
      return;
    }
    
    setProfile(userProfile);
    checkDeviceStatus(userId);
  };

  const checkDeviceStatus = async (uid) => { 
    try {
        const info = await Device.getId(); 
        const did = info.uuid || info.identifier; 

        const { data: existingRecord } = await supabase.from('device_registry').select('*').eq('student_id', uid).maybeSingle(); 
        
        if (existingRecord) { 
            if (existingRecord.device_uuid !== did) {
                setDeviceStatus('blocked'); 
            } else if (!existingRecord.is_approved) {
                setDeviceStatus('pending'); 
            } else { 
                setDeviceStatus('approved'); 
                fetchDashboardData(uid); 
            } 
        } else {
            const modelInfo = await Device.getInfo();
            const { error: insertError } = await supabase.from('device_registry').insert([{ 
                student_id: uid, device_uuid: did, device_name: modelInfo.model || 'Unknown Device', is_approved: false, last_login: new Date().toISOString()
            }]);
            
            if (insertError?.code === '23505') setDeviceStatus('blocked'); else setDeviceStatus('pending');
        } 
    } catch (e) {
        if (STRICT_DEVICE_MODE) { setDeviceStatus('blocked'); alert("Security Error: Device verification failed."); } 
        else { setDeviceStatus('approved'); fetchDashboardData(uid); }
    }
    setLoading(false); 
  };

  const fetchDashboardData = async (uid = session?.user?.id, silent = false) => { 
    if(!uid) return;
    if (!silent) setLoading(true); 
    
    try {
        const { data: enrollments } = await supabase.from('classroom_enrollments').select('classroom_id, classroom_master(name, org_id)').eq('student_id', uid);
        if (!enrollments || enrollments.length === 0) { 
            setDashboardData({ myClassrooms: [], availableExams: [], announcements: [], myMentor: null, pastExams: [] });
            setLoading(false); return; 
        }

        const classIds = enrollments.map(e => e.classroom_id);
        const myClassrooms = enrollments.map(e => ({ ...e.classroom_master, classroom_id: e.classroom_id })).filter(Boolean);

        const { data: rawSubmissions } = await supabase
            .from('exam_submissions')
            .select('submission_id, exam_id, score, total_marks, status, submitted_at, answers, exam_master(title, classroom_master(name), questions:question_bank(*))') 
            .eq('student_id', uid);
        
        // 🛡️ FAULT-TOLERANT SQB DECRYPTION ENGINE
        const decryptedSubmissions = (rawSubmissions || []).map(sub => {
            let safeSub = JSON.parse(JSON.stringify(sub));

            if (safeSub.exam_master && safeSub.exam_master.questions) {
                safeSub.exam_master.questions = safeSub.exam_master.questions.map(q => {
                    let parsedOptions = q.options;
                    if (q.options?.cipher) {
                        try { parsedOptions = JSON.parse(decryptAES256(q.options.cipher)); } catch (e) { }
                    }

                    let finalRationale = q.explanations || q.rationale;
                    if (q.explanations?.cipher) {
                        try { finalRationale = JSON.parse(decryptAES256(q.explanations.cipher)); } catch (e) { }
                    }

                    let plainAnswer = q.correct_answer;
                    if (typeof q.correct_answer === 'object' && q.correct_answer?.cipher) {
                         try { plainAnswer = decryptAES256(q.correct_answer.cipher); } catch(e) {}
                    } else if (typeof q.correct_answer === 'string' && q.correct_answer.length > 10) {
                         try { plainAnswer = decryptAES256(q.correct_answer); } catch(e) { plainAnswer = q.correct_answer; }
                    }

                    let plainText = q.question_text;
                    if (typeof q.question_text === 'object' && q.question_text?.cipher) {
                        try { plainText = decryptAES256(q.question_text.cipher); } catch(e) {}
                    } else if (typeof q.question_text === 'string' && q.question_text.length > 50 && !q.question_text.includes(' ')) {
                        try { plainText = decryptAES256(q.question_text); } catch(e) { plainText = q.question_text; }
                    }

                    return { 
                        ...q, 
                        question_text: plainText, 
                        options: parsedOptions,
                        rationale: finalRationale,
                        correct_answer: plainAnswer
                    };
                });
            }
            return safeSub;
        });
        
        const completedExamIds = new Set(decryptedSubmissions.filter(s => s.status === 'published' || s.status === 'pending').map(s => s.exam_id));
        
        // 🚀 AUTO-PUBLISH FLAG FETCHED HERE
        const { data: deployments } = await supabase.from('exam_deployments')
            .select(`deployment_id, scheduled_at, duration_minutes, status, auto_publish_results, exam:exam_master(exam_id, title, total_marks), classroom:classroom_master(name)`)
            .in('classroom_id', classIds)
            .in('status', ['scheduled', 'live', 'LIVE', 'DEPLOYED', 'deployed']) 
            .order('scheduled_at', { ascending: true });
        
        const availableExams = (deployments || []).filter(d => d.exam && !completedExamIds.has(d.exam.exam_id));

        const { data: announcements } = await supabase.from('announcements').select('*, user_master(full_name)').in('classroom_id', classIds).order('created_at', { ascending: false }).limit(10);
        const { data: mentorData } = await supabase.from('mentorship_assignments').select('mentor_id, user:mentor_id(full_name, email)').eq('mentee_id', uid).maybeSingle();

        setDashboardData({
            myClassrooms,
            availableExams,
            pastExams: decryptedSubmissions || [],
            announcements: announcements || [],
            myMentor: mentorData?.user || null
        });

    } catch (err) {
        console.error("Dashboard Load Error:", err);
    } finally {
       setLoading(false);
    }
  };

  // --- JIT EXAM ENGINE ---
  const startExam = async (deployment) => {
      setLoading(true);
      try {
          const { data: qData, error } = await supabase
            .from('question_bank')
            .select('question_id, question_text, question_type, options, image_url, correct_answer') 
            .eq('exam_id', deployment.exam.exam_id)
            .eq('org_id', profile.org_id); 

          if (error) throw new Error("RLS Block: " + error.message);
          
          // 🚀 ADD FLAG TO CURRENT EXAM STATE
          setCurrentExam({ 
              ...deployment.exam, 
              deployment_id: deployment.deployment_id,
              duration_minutes: deployment.duration_minutes,
              auto_publish_results: deployment.auto_publish_results 
          }); 
          
          setExamQuestions(qData || []); 
          setView('taking_exam'); 
          
      } catch (err) {
          alert("Architecture Fault: " + err.message);
      } finally {
          setLoading(false); 
      }
  };

  const handleUpdatePassword = async (newPassword) => {
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      if (authError) throw authError;
      const { error: profileError } = await supabase.from('user_master').update({ is_initial_password: false }).eq('user_id', session.user.id);
      if (profileError) throw profileError;
      setProfile(prev => ({ ...prev, is_initial_password: false }));
  };
  
  const hasAccess = (requiredTier) => {
      const currentTier = profile?.org_master?.subscription_tier || 'free';
      const tiers = { 'free': 1, 'standard': 2, 'enterprise': 3 };
      return tiers[currentTier] >= tiers[requiredTier];
  };

  // --- RENDER PIPELINE ---
  if (!session) return <LoginScreen />;
  if (loading || !profile) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (deviceStatus !== 'approved') return <DeviceGuard status={deviceStatus} sessionUser={session.user} onRefresh={() => checkDeviceStatus(session.user.id)} strictMode={STRICT_DEVICE_MODE} />;

  // 🚀 FIXED: ADDED RETURN STATEMENT HERE
  if (view === 'taking_exam') {
    return (
        <ActiveExamInterface 
            exam={currentExam} 
            questions={examQuestions} 
            studentId={session.user.id} 
            isPWA={isPWA}
            onComplete={async (score, total, answers) => { 
                
                // 🚀 CHECK THE AUTO-PUBLISH FLAG
                const finalStatus = currentExam.auto_publish_results ? 'published' : 'pending';

                await supabase.from('exam_submissions').insert([{ 
                    exam_id: currentExam.exam_id,
                    student_id: session.user.id,
                    score: score, 
                    total_marks: total, 
                    status: finalStatus, // <-- Dynamic Status Applied
                    answers: answers,
                    submitted_at: new Date().toISOString()
                }]);

                setCurrentExam(null); 
                setExamQuestions([]);
                alert(finalStatus === 'published' ? "Submission Successful! Results are available." : "Submission Successful! Results pending release.");
                fetchDashboardData(session.user.id); 
                setView('dashboard'); 
            }} 
        />
    );
  }

  const userProfileData = { 
      initials: profile?.full_name?.substring(0,2).toUpperCase() || 'ST', 
      name: profile?.full_name || 'Student', 
      regNo: profile?.reg_number || 'N/A',
      is_initial_password: profile?.is_initial_password 
  };

  return (
    <StudentDashboardLayout 
        userProfile={userProfileData} 
        onSignOut={() => supabase.auth.signOut()} 
        onNavigate={(screen) => setView(screen)} 
        currentView={view}
        onUpdatePassword={handleUpdatePassword}
    >
       {view === 'dashboard' && <DashboardView data={dashboardData} refresh={() => fetchDashboardData()} />}
       
       {view === 'exams' && (
          <ExamsView 
            availableExams={dashboardData.availableExams} 
            pastExams={dashboardData.pastExams} 
            onStart={startExam} 
            studentId={session.user.id} 
            onRefresh={() => fetchDashboardData(session.user.id, true)}
          />
       )}
       
       {view === 'profile' && <ProfileView profile={profile} onUpdatePassword={handleUpdatePassword} />}
       
       {/* 🚀 FIXED: PASSED SESSION PROP TO ATLASVIEW FOR SYNCING */}
       {view === 'atlas' && hasAccess('standard') && <AtlasView session={session} />}
       {view === 'atlas' && !hasAccess('standard') && <PremiumLockedScreen feature="Study Atlas" />}
       
       {view === 'mentorship' && hasAccess('enterprise') && <MentorshipView mentor={dashboardData.myMentor} />}
       {view === 'mentorship' && !hasAccess('enterprise') && <PremiumLockedScreen feature="Mentorship" />}
    </StudentDashboardLayout>
  );
}

const PremiumLockedScreen = ({ feature }) => (
    <div className="p-12 mt-10 max-w-lg mx-auto text-center bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/30 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">Upgrade Required</h2>
        <p className="text-slate-500 text-sm font-medium leading-relaxed">The <b>{feature}</b> module is currently locked for your institution. Contact your administrator to upgrade your campus license.</p>
    </div>
);

export default App;