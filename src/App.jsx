import { decryptAES256 } from './utils/security/sqbProtocol';
import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { Device } from '@capacitor/device' 
import { PrivacyScreen } from '@capacitor-community/privacy-screen'
import { 
  RefreshCw, Clock, Smartphone, LogOut, CheckCircle,
  BookOpen, Bell, AlertTriangle, ShieldAlert, Folder,
  ChevronDown, ChevronRight 
} from 'lucide-react' 

// Layout
import InteractiveMindMap from './components/layout/InteractiveMindMap';
import StudentDashboardLayout from './components/layout/StudentDashboardLayout';

// Hooks
import { useWebProctor } from './hooks/useWebProctor'; 

// 🔒 SECURITY CONFIG
// ⚠️ TEMPORARY BETA OVERRIDE: Web Mode Active
const STRICT_DEVICE_MODE = false; 

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState('login')
  
  // User & Data State
  const [profile, setProfile] = useState(null)
  const [myClassrooms, setMyClassrooms] = useState([]) 
  const [announcements, setAnnouncements] = useState([]) 
  const [myMentor, setMyMentor] = useState(null)
  
  // Exam State
  const [availableExams, setAvailableExams] = useState([])
  const [pastExams, setPastExams] = useState([]) 
  
  // Exam Engine
  const [currentExam, setCurrentExam] = useState(null)
  const [examQuestions, setExamQuestions] = useState([])
  const [score, setScore] = useState(null)
  const [view, setView] = useState('dashboard') 
  
  // Proctoring State
  const [sessionId, setSessionId] = useState(null)
  const [violations, setViolations] = useState(0)
  const heartbeatRef = useRef(null) 
  
  // Device Security State
  const [deviceStatus, setDeviceStatus] = useState('checking') 
  
  // Auth Form
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('')

  // --- INITIALIZATION ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { 
        setSession(session); 
        if (session) initializeUser(session.user.id) 
        else setLoading(false);
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { 
        setSession(session); 
        if (session) initializeUser(session.user.id) 
        else setLoading(false);
    })
    
    // 🛡️ iOS Security Shield
    const setupMobileSecurity = async () => {
      try {
        await PrivacyScreen.enable();
      } catch (e) { 
          if(STRICT_DEVICE_MODE) console.warn("Native Security Plugin not active (Web Mode?)"); 
      }
    };
    setupMobileSecurity();

    return () => { subscription.unsubscribe(); stopHeartbeat(); }
  }, []) 

  // --- CORE FUNCTIONS ---

  const initializeUser = async (userId) => {
    setLoading(true) 
    
    const { data: userProfile, error } = await supabase
        .from('user_master')
        .select('*, org_master(status, name)')
        .eq('user_id', userId)
        .single()
    
    if (error || !userProfile) { 
        if (error?.code === 'PGRST116') { 
             alert("Student Profile Not Found. Contact Admin."); 
             await supabase.auth.signOut(); 
        }
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
  }

  const checkDeviceStatus = async (uid) => { 
    try {
        const info = await Device.getId(); 
        const did = info.uuid || info.identifier; 

        const { data: existingRecord } = await supabase
            .from('device_registry')
            .select('*')
            .eq('student_id', uid)
            .maybeSingle(); 
        
        if (existingRecord) { 
            if (existingRecord.device_uuid !== did) {
                console.warn(`Device Mismatch: DB=${existingRecord.device_uuid} vs LOCAL=${did}`);
                setDeviceStatus('blocked'); 
            } else if (!existingRecord.is_approved) {
                setDeviceStatus('pending'); 
            } else { 
                setDeviceStatus('approved'); 
                fetchDashboardData(uid); 
            } 
        } else {
            const modelInfo = await Device.getInfo();
            const deviceName = modelInfo.model || 'Unknown Device';
            
            const { error: insertError } = await supabase.from('device_registry').insert([{ 
                student_id: uid, 
                device_uuid: did, 
                device_name: deviceName, 
                is_approved: false, 
                last_login: new Date().toISOString()
            }]);
            
            if (insertError) {
                if (insertError.code === '23505') setDeviceStatus('blocked');
                else throw insertError;
            } else {
                setDeviceStatus('pending'); 
            }
        } 
    } catch (e) {
        if (STRICT_DEVICE_MODE) {
            setDeviceStatus('blocked');
            alert("Security Error: Device verification failed.");
        } else {
            setDeviceStatus('approved'); 
            fetchDashboardData(uid);
        }
    }
    setLoading(false) 
  }

  const requestDeviceReset = async () => {
    if (!window.confirm("Request to switch to THIS device?")) return;
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
            .eq('student_id', session.user.id);
        
        if (error) throw error;
        alert("Request Sent! Ask your HOD to approve."); 
        setDeviceStatus('pending');
    } catch (e) {
        alert("Error: " + e.message);
    }
    setLoading(false);
  }

  const fetchDashboardData = async (uid = session?.user?.id) => { 
    if(!uid) return;
    setLoading(true);
    
    try {
        // 1. Check Enrollment OIC
        const { data: enrollments, error: enrollError } = await supabase
            .from('classroom_enrollments')
            .select('classroom_id, classroom_master(name, org_id)') 
            .eq('student_id', uid);

        if (enrollError) throw new Error("Enrollment fetch failed: " + enrollError.message);

        if (!enrollments || enrollments.length === 0) { 
            console.warn("OIC ROUTING: Student is not enrolled in any classrooms.");
            setMyClassrooms([]); setAvailableExams([]); setAnnouncements([]); setLoading(false); 
            return; 
        }

        const classIds = enrollments.map(e => e.classroom_id);
        setMyClassrooms(enrollments.map(e => ({ ...e.classroom_master, classroom_id: e.classroom_id })).filter(Boolean));

        // 2. Fetch Submissions (Past Exams)
        const { data: submissions } = await supabase
            .from('exam_submissions')
            .select('submission_id, exam_id, score, total_marks, submitted_at, exam_master(title)')
            .eq('student_id', uid);
        
        const takenExamIds = new Set(submissions?.map(s => s.exam_id) || []);
        setPastExams(submissions || []);

        // 3. Fetch Deployments
        const { data: deployments, error: depError } = await supabase
            .from('exam_deployments')
            .select(`
                deployment_id, scheduled_at, duration_minutes, status,
                exam:exam_master (exam_id, title, total_marks),
                classroom:classroom_master (name)
            `)
            .in('classroom_id', classIds)
            .in('status', ['scheduled', 'live', 'LIVE', 'DEPLOYED', 'deployed']) 
            .order('scheduled_at', { ascending: true });
        
        if (depError) throw new Error("Deployment fetch failed (Check RLS): " + depError.message);

        if (!deployments || deployments.length === 0) {
            console.warn("PIPELINE EMPTY: No exams found for Class IDs:", classIds);
        }

        // 🚨 THE FIX: Safe-checking d.exam to prevent silent Javascript crashes if RLS blocks the JOIN
        const activeDeployments = (deployments || []).filter(d => {
            if (!d.exam) {
                console.error(`RLS FAULT: Deployment ${d.deployment_id} found, but Exam data is null! Check exam_master RLS policies.`);
                return false;
            }
            return !takenExamIds.has(d.exam.exam_id);
        });
        
        setAvailableExams(activeDeployments);

        // 4. Fetch Announcements
        const { data: msgs } = await supabase
            .from('announcements')
            .select('*, user_master(full_name)')
            .in('classroom_id', classIds)
            .order('created_at', { ascending: false })
            .limit(10);
        setAnnouncements(msgs || []);

        // 5. Fetch Mentor
        const studentEmail = profile?.email || session?.user?.email;
        if (studentEmail) {
             const { data: mentorData } = await supabase
                .from('mentorship_assignments')
                .select('mentor_id, user:mentor_id(full_name, email)')
                .eq('mentee_id', uid)
                .maybeSingle();
            if(mentorData) setMyMentor(mentorData.user);
        }

    } catch (err) {
        // 🚨 THE FIX: Force the error to show in the UI instead of silently failing
        alert("System Architecture Fault: " + err.message);
        console.error("Dashboard Load Error:", err);
    } finally {
        setLoading(false);
    }
  }

  // --- EXAM LOGIC ---
  const startHeartbeat = async (deploymentId) => {
    await supabase.from('proctoring_logs').insert([{ 
        deployment_id: deploymentId, 
        student_id: session.user.id, 
        incident_type: 'exam_start', 
        description: 'Student started the exam session.',
        severity: 'low'
    }]); 
  }
  
  const stopHeartbeat = async () => { 
    if (heartbeatRef.current) clearInterval(heartbeatRef.current); 
  }

  const startExam = async (deployment) => {
      setLoading(true);
      
      try {
          // 1. OIC ENFORCED FETCH (Defense-in-Depth)
          const { data: qData, error } = await supabase
            .from('question_bank')
            .select('question_id, question_text, question_type, options, image_url, correct_answer') 
            .eq('exam_id', deployment.exam.exam_id)
            .eq('org_id', profile.org_id); // STRICT TENANT FILTER

          if (error) throw new Error("RLS Block: " + error.message);
          if (!qData || qData.length === 0) { 
              throw new Error("Exam content not found. Ensure Faculty has added questions to this draft."); 
          }

          // 2. SQB PROTOCOL: JUST-IN-TIME (JIT) DECRYPTION
          const decryptedQuestions = qData.map(q => {
              let parsedOptions = q.options;
              
              // Decrypt Options Payload if secured
              if (q.options && q.options.cipher) {
                  try {
                      parsedOptions = JSON.parse(decryptAES256(q.options.cipher));
                  } catch (e) {
                      console.error("DATA FAULT: Option decryption failed for QID", q.question_id);
                  }
              }

              return {
                  ...q,
                  // Decrypt the Question Stem
                  question_text: decryptAES256(q.question_text),
                  options: parsedOptions
              };
          });

          // 3. LOAD EXAM ENGINE
          setCurrentExam({ ...deployment.exam, deployment_id: deployment.deployment_id }); 
          setExamQuestions(decryptedQuestions); 
          setView('taking_exam'); 
          
          startHeartbeat(deployment.deployment_id);

      } catch (err) {
          alert("System Architecture Fault: " + err.message);
          console.error("Start Exam Fault:", err);
      } finally {
          setLoading(false); 
      }
  }

  // --- ACTIONS ---
  const handleLogin = async (e) => { 
      e.preventDefault(); 
      setLoading(true); 
      const { error } = await supabase.auth.signInWithPassword({ email, password }); 
      if (error) alert(error.message); 
      setLoading(false) 
  }
  
  const handleForgotPassword = async (e) => { 
      e.preventDefault(); 
      await supabase.auth.resetPasswordForEmail(email); 
      alert("Reset link sent!"); 
      setAuthMode('login'); 
  }

  // 🚀 ENTERPRISE PASSWORD RESET HANDLER
  const handleUpdatePassword = async (newPassword) => {
      try {
          const { error: authError } = await supabase.auth.updateUser({
              password: newPassword
          });

          if (authError) throw authError;

          const { error: profileError } = await supabase
              .from('user_master')
              .update({ is_initial_password: false })
              .eq('user_id', session.user.id);

          if (profileError) throw profileError;

          setProfile(prev => ({ ...prev, is_initial_password: false }));
          alert("Password updated successfully! Welcome to CognIQ Ed.");

      } catch (error) {
          console.error("Error updating password:", error.message);
          alert("Failed to update password: " + error.message);
      }
  };
  
  // --- RENDER ---
  if (!session) return ( <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4"> <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 dark:border-slate-800"> <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 text-center">Student Portal</h2> {authMode==='login' ? <form onSubmit={handleLogin} className="space-y-4"><input className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/><button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl" disabled={loading}>Log In</button><div className="text-center text-blue-600 dark:text-blue-400 text-sm cursor-pointer" onClick={()=>setAuthMode('forgot')}>Forgot Password?</div></form> : <form onSubmit={handleForgotPassword} className="space-y-4"><input className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl" disabled={loading}>Send Reset Link</button><div className="text-center text-slate-500 dark:text-slate-400 text-sm cursor-pointer" onClick={()=>setAuthMode('login')}>Back to Login</div></form>} </div> </div> )
  if (loading || !profile) return ( <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><h3 className="text-slate-600 dark:text-slate-400 animate-pulse font-bold">Loading...</h3></div> )
  
  if (deviceStatus !== 'approved') return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl w-full max-w-sm border border-slate-200 dark:border-slate-800">
            {deviceStatus === 'pending' ? (
                <>
                    <div className="flex justify-center mb-4 text-blue-500 animate-pulse"><Clock size={64}/></div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Approval Pending</h2>
                    <p className="text-slate-500 text-sm mb-6">Waiting for HOD/Admin authorization.</p>
                    <button onClick={() => checkDeviceStatus(session.user.id)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mb-3 flex items-center justify-center gap-2"><RefreshCw size={18}/> Check Status</button>
                    <button onClick={() => supabase.auth.signOut()} className="text-sm text-slate-400">Log Out</button>
                </>
            ) : (
                <>
                    <div className="flex justify-center mb-4 text-red-500"><Smartphone size={64}/></div>
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Device Blocked</h2>
                    <p className="text-slate-500 text-sm mb-6">Device mismatch detected. {STRICT_DEVICE_MODE ? 'Strict Mode Active.' : 'Dev Mode Active.'}</p>
                    <button onClick={requestDeviceReset} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl mb-3">Request Device Switch</button>
                    <button onClick={() => supabase.auth.signOut()} className="text-xs text-slate-400">Log Out</button>
                </>
            )}
        </div>
    </div>
  )

  if (view === 'taking_exam') {
    return <ActiveExamInterface 
        exam={currentExam} 
        questions={examQuestions} 
        studentId={session.user.id} 
        onComplete={(score, total, answers) => { 
            // 🚨 1. Save Score to Database (Silent)
            supabase.from('exam_submissions').insert([{ 
                exam_id: currentExam.exam_id, 
                student_id: session.user.id, 
                score: score, 
                total_marks: total,
                answers: answers 
            }]).then(() => {
                // 🚨 2. PURGE JIT MEMORY (SQB Protocol Enforcement)
                setCurrentExam(null);
                setExamQuestions([]);
                
                // 🚨 3. Redirect to Dashboard.
                alert("Submission Successful! \n\nYou will be redirected to the dashboard. Scores will be released by the faculty later.");
                setScore(null); 
                fetchDashboardData(); 
                setView('dashboard'); 
            });
        }}
        stopHeartbeat={stopHeartbeat} 
    />
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
       {view === 'dashboard' && <DashboardView profile={profile} announcements={announcements} myClassrooms={myClassrooms} refresh={() => fetchDashboardData()} />}
       {view === 'exams' && <ExamsView availableExams={availableExams} pastExams={pastExams} onStart={startExam} />}
       
       {/* 🔒 ATLAS VIEW INJECTED HERE */}
       {view === 'atlas' && <AtlasView />}
       
       {view === 'mentorship' && <MentorshipView mentor={myMentor} />}
       {view === 'profile' && <ProfileView profile={profile} onUpdatePassword={handleUpdatePassword} />}
    </StudentDashboardLayout>
  )
}

// --- SUB COMPONENTS ---

function ActiveExamInterface({ exam, questions, studentId, onComplete, stopHeartbeat }) {
    useWebProctor(exam.deployment_id, studentId, true);
    
    const [answers, setAnswers] = useState({});

    const handleSubmit = () => { 
        if(!window.confirm("Are you sure you want to finish the exam?")) return; 
        if(stopHeartbeat) stopHeartbeat();

        let score = 0; 
        questions.forEach(q => { 
            if (answers[q.question_id] === q.correct_answer) score++; 
        }); 
        
        onComplete(score, questions.length, answers); 
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 pb-24 select-none">
            <div className="fixed top-0 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 p-4 flex justify-between items-center z-40 shadow-sm">
                <div>
                    <h2 className="font-bold text-slate-800 dark:text-white">{exam.title}</h2>
                    <div className="flex gap-2 mt-1"><span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold animate-pulse">● LIVE PROCTORING</span></div>
                </div>
            </div>
            
            <div className="mt-20 max-w-3xl mx-auto space-y-6">
                {questions.map((q, i) => (
                    <div key={q.question_id} className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Q{i+1}: {q.question_text}</h3>
                        
                        <div className="space-y-3">
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
                                        <label key={j} className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-700'}`}>
                                            <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300'}`}>{isSelected && <CheckCircle size={14}/>}</div>
                                            <span className="text-slate-700 dark:text-slate-300">{opt}</span>
                                            <input type="radio" className="hidden" checked={isSelected} onChange={() => setAnswers({...answers, [q.question_id]: label})} />
                                        </label>
                                    ) 
                                });
                            })()}
                        </div>
                    </div>
                ))}
            </div>
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-40">
                <button onClick={handleSubmit} className="w-full max-w-3xl mx-auto block bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95">Submit Assessment</button>
            </div>
        </div>
    );
}

const DashboardView = ({ announcements, myClassrooms, refresh }) => (
    <div className="space-y-8 animate-in fade-in pb-20">
        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div><h1 className="text-2xl font-bold text-slate-800 dark:text-white">Overview</h1></div>
            <button onClick={refresh} className="p-3 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"><RefreshCw size={20}/></button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><Bell size={18}/> Announcements</h3>
                {announcements.length === 0 ? <div className="text-slate-400 italic">No updates.</div> : announcements.map(a => (
                    <div key={a.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                        <b className="text-slate-800 dark:text-white">{a.title}</b>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{a.body}</p>
                        <span className="text-xs text-slate-400 mt-2 block">{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                ))}
            </div>
            
            <div className="space-y-4">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><BookOpen size={18}/> My Classrooms</h3>
                {myClassrooms.length === 0 ? <div className="text-slate-400 italic">Not enrolled in any classes.</div> : myClassrooms.map(c => (
                    <div key={c.classroom_id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm font-bold text-slate-700 dark:text-slate-200">
                        {c.name}
                    </div>
                ))}
            </div>
        </div>
    </div>
)

// 🔒 PATCH 2: JIT PROTOCOL ENFORCEMENT
const ExamsView = ({ availableExams, pastExams, onStart }) => {
    const now = new Date();

    return (
        <div className="space-y-6 pb-20">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Active & Upcoming Exams</h2>
            
            {availableExams.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300">
                    No active exams found for your enrolled classes.
                </div>
            ) : (
                availableExams.map(d => {
                    const scheduledTime = new Date(d.scheduled_at);
                    // JIT Validation: Is the current time >= the scheduled time?
                    const isLive = d.status.toLowerCase() === 'live' || now >= scheduledTime;

                    return (
                        <div key={d.deployment_id} className={`p-6 bg-white dark:bg-slate-900 border rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm gap-4 transition-all ${isLive ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-800 opacity-80'}`}>
                            <div>
                                <div className="flex gap-2 items-center mb-1">
                                    {isLive ? (
                                        <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded uppercase animate-pulse">● LIVE NOW</span>
                                    ) : (
                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">UPCOMING</span>
                                    )}
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">{d.exam?.title || 'Secure Assessment'}</h3>
                                <p className="text-sm text-slate-500 font-mono mt-1">
                                    {d.classroom?.name} • {d.duration_minutes} mins • {scheduledTime.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </p>
                            </div>
                            
                            {isLive ? (
                                <button onClick={() => onStart(d)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl shadow-md transition-transform active:scale-95 w-full md:w-auto">
                                    Start Secure Exam
                                </button>
                            ) : (
                                <button disabled className="bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold px-8 py-3 rounded-xl cursor-not-allowed w-full md:w-auto text-sm">
                                    Opens at {scheduledTime.toLocaleTimeString([], { timeStyle: 'short' })}
                                </button>
                            )}
                        </div>
                    );
                })
            )}
            
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-12">Past Results</h2>
            {pastExams.length === 0 ? (
                <div className="text-slate-400 italic">No history available.</div>
            ) : (
                pastExams.map(e => (
                    <div key={e.submission_id} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex justify-between items-center opacity-75">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{e.exam_master?.title || 'Exam'}</span>
                        <span className="font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200 px-3 py-1 rounded border border-amber-100 dark:border-amber-800 text-xs">
                            SUBMITTED • Pending Release
                        </span>
                    </div>
                ))
            )}
        </div>
    );
};

// --- NEW COMPONENT: ATLAS VIEW ---
const AtlasView = () => {
    const [activeTab, setActiveTab] = useState('flashcards');
    const [flashcards, setFlashcards] = useState([]);
    const [mindmaps, setMindmaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [flippedCards, setFlippedCards] = useState({});
    
    // 🚀 ACCORDION STATE
    const [collapsedChapters, setCollapsedChapters] = useState({});

    useEffect(() => {
        const fetchAtlasData = async () => {
            setLoading(true);
            try {
                const [cardsRes, mapsRes] = await Promise.all([
                    supabase.from('atlas_flashcards').select('*').eq('is_published', true),
                    supabase.from('atlas_mindmaps').select('*').eq('is_published', true)
                ]);
                
                if (cardsRes.data) setFlashcards(cardsRes.data);
                if (mapsRes.data) setMindmaps(mapsRes.data);
            } catch (error) {
                console.error("Atlas Error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAtlasData();
    }, []);

    const toggleFlip = (id) => {
        setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleFolder = (chapter) => {
        setCollapsedChapters(prev => ({ ...prev, [chapter]: !prev[chapter] }));
    };

    // 🚀 THE GROUPING ENGINE (Organizes into Chapters)
    const groupedFlashcards = flashcards.reduce((acc, card) => {
        const chap = card.chapter || 'Uncategorized';
        if (!acc[chap]) acc[chap] = [];
        acc[chap].push(card);
        return acc;
    }, {});

    const groupedMindmaps = mindmaps.reduce((acc, map) => {
        const chap = map.chapter || 'Uncategorized';
        if (!acc[chap]) acc[chap] = [];
        acc[chap].push(map);
        return acc;
    }, {});

    return (
        <div className="space-y-6 pb-20 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Study Atlas</h1>
                    <p className="text-sm text-slate-500">Review your Chapter Materials</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('flashcards')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'flashcards' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-300' : 'text-slate-500'}`}>Flashcards</button>
                    <button onClick={() => setActiveTab('mindmaps')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'mindmaps' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-300' : 'text-slate-500'}`}>Mind Maps & Summaries</button>
                </div>
            </div>

            {loading ? (
                <div className="p-8 text-center text-slate-500 animate-pulse font-bold">Loading Atlas...</div>
            ) : (
                <div className="space-y-8">
                    {/* FLASHCARDS TAB */}
                    {activeTab === 'flashcards' && (
                        Object.keys(groupedFlashcards).length === 0 ? (
                            <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300">No flashcards published yet.</div>
                        ) : (
                            Object.entries(groupedFlashcards).map(([chapterName, cards]) => (
                                <div key={chapterName} className="space-y-4 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 
                                        onClick={() => toggleFolder(chapterName)}
                                        className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2 cursor-pointer select-none hover:text-blue-600 transition-colors"
                                    >
                                        {!collapsedChapters[chapterName] ? <ChevronDown size={24} className="text-slate-400"/> : <ChevronRight size={24} className="text-slate-400"/>}
                                        <Folder size={24} className="text-blue-500"/> {chapterName}
                                        <span className="text-sm font-normal text-slate-400 ml-auto bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{cards.length} Cards</span>
                                    </h3>
                                    
                                    {!collapsedChapters[chapterName] && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                                            {cards.map(card => (
                                                <div key={card.id} onClick={() => toggleFlip(card.id)} className="cursor-pointer group perspective-1000 h-64 w-full">
                                                    <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${flippedCards[card.id] ? 'rotate-y-180' : ''}`}>
                                                        <div className="absolute inset-0 backface-hidden bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-center items-center text-center">
                                                            <span className="absolute top-4 left-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Question</span>
                                                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{card.question}</h3>
                                                            <span className="absolute bottom-4 text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">Click to flip</span>
                                                        </div>
                                                        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-6 flex flex-col justify-center items-center text-center">
                                                            <span className="absolute top-4 left-4 text-[10px] font-bold text-blue-400 uppercase tracking-widest">Answer</span>
                                                            <p className="text-md font-medium text-slate-700 dark:text-slate-200">{card.answer}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )
                    )}

                    {/* MIND MAPS & SUMMARIES TAB */}
                    {activeTab === 'mindmaps' && (
                        Object.keys(groupedMindmaps).length === 0 ? (
                            <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300">No summaries published yet.</div>
                        ) : (
                            Object.entries(groupedMindmaps).map(([chapterName, maps]) => (
                                <div key={chapterName} className="space-y-4 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h3 
                                        onClick={() => toggleFolder(chapterName)}
                                        className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2 cursor-pointer select-none hover:text-blue-600 transition-colors"
                                    >
                                        {!collapsedChapters[chapterName] ? <ChevronDown size={24} className="text-slate-400"/> : <ChevronRight size={24} className="text-slate-400"/>}
                                        <Folder size={24} className="text-blue-500"/> {chapterName}
                                    </h3>
                                    
                                    {!collapsedChapters[chapterName] && (
                                        <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                                            {maps.map(map => (
                                                <div key={map.id} className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{map.title}</h3>
                                                    
                                                    {map.summary_html && map.summary_html !== '<p></p>' && (
                                                        <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 mb-6 [&_p:empty]:h-4" dangerouslySetInnerHTML={{ __html: map.summary_html }} />
                                                    )}

                                                    {map.map_data && (
                                                        <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
                                                            <InteractiveMindMap mapData={map.map_data} />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )
                    )}
                </div>
            )}
        </div>
    );
};

const MentorshipView = ({ mentor }) => (
    <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-white">Academic Mentor</h2>
        {mentor ? (
            <div className="space-y-2">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 font-bold text-xl">
                    {mentor.full_name?.substring(0,2).toUpperCase()}
                </div>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{mentor.full_name}</p>
                <p className="text-slate-500">{mentor.email}</p>
                <button className="mt-4 px-6 py-2 border border-blue-600 text-blue-600 rounded-full font-bold hover:bg-blue-50 transition-colors">
                    Request Meeting
                </button>
            </div>
        ) : (
            <div className="text-slate-400 py-6">
                <p>No mentor assigned yet.</p>
                <p className="text-sm mt-2">Contact your department head.</p>
            </div>
        )}
    </div>
)

// --- NEW COMPONENT: PROFILE & SECURITY VIEW ---
const ProfileView = ({ profile, onUpdatePassword }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match.' });
            return;
        }
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
            return;
        }

        setLoading(true);
        // We call the Enterprise function we built earlier!
        await onUpdatePassword(newPassword);
        
        // Reset form
        setNewPassword('');
        setConfirmPassword('');
        setMessage({ type: 'success', text: 'Password secured successfully.' });
        setLoading(false);
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Student Profile</h1>
                <p className="text-sm text-slate-500">Manage your account details and security settings.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Account Details Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 h-fit">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <ShieldAlert size={18} className="text-blue-500"/> Account Details
                    </h3>
                    
                    <div className="space-y-5">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                            <p className="text-slate-800 dark:text-slate-200 font-medium mt-1">{profile?.full_name}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                            <p className="text-slate-800 dark:text-slate-200 font-medium mt-1">{profile?.email}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Institution</label>
                            <p className="text-slate-800 dark:text-slate-200 font-medium mt-1">{profile?.org_master?.name || 'Not Assigned'}</p>
                        </div>
                    </div>
                </div>

                {/* Password Reset Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 h-fit">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Change Password</h3>
                    
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                            <input 
                                type="password" 
                                required
                                className="w-full p-3 mt-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
                                value={newPassword} 
                                onChange={e => setNewPassword(e.target.value)} 
                                placeholder="Min. 6 characters"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm New Password</label>
                            <input 
                                type="password" 
                                required
                                className="w-full p-3 mt-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
                                value={confirmPassword} 
                                onChange={e => setConfirmPassword(e.target.value)} 
                                placeholder="Re-type password"
                            />
                        </div>

                        {message && (
                            <div className={`p-3 rounded-lg text-sm font-bold animate-in fade-in ${message.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/30' : 'bg-green-50 text-green-600 dark:bg-green-900/30'}`}>
                                {message.text}
                            </div>
                        )}

                        <button 
                            disabled={loading} 
                            type="submit" 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 mt-2"
                        >
                            {loading ? 'Updating Vault...' : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default App