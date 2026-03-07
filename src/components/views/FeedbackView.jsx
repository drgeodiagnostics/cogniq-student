import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { MessageSquare, Star, Send, CheckCircle2, BookOpen, Loader2, Sparkles, Activity, Lightbulb, Users } from 'lucide-react';

export default function FeedbackView({ profile }) {
    const [pendingRequests, setPendingRequests] = useState([]);
    const [activeDeployment, setActiveDeployment] = useState(null);
    const [loading, setLoading] = useState(true);

    // 🚨 MVD STATE: Standardized Clinical Rubric
    const [ratings, setRatings] = useState({ overall: 0, clarity: 0, clinical: 0, engagement: 0 });
    const [hoverRatings, setHoverRatings] = useState({ overall: 0, clarity: 0, clinical: 0, engagement: 0 });
    const [structuredFeedback, setStructuredFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchPendingFeedback();
    }, [profile]);

    const fetchPendingFeedback = async () => {
        setLoading(true);
        try {
            // 1. Get classes the student is in
            const { data: enrollments } = await supabase
                .from('classroom_enrollments')
                .select('classroom_id, classroom_master(name)')
                .eq('student_id', profile.user_id)
                .eq('is_suspended', false);
            
            if (!enrollments || enrollments.length === 0) {
                setPendingRequests([]); setLoading(false); return;
            }

            const classIds = enrollments.map(e => e.classroom_id);
            const classMap = enrollments.reduce((acc, e) => ({...acc, [e.classroom_id]: e.classroom_master.name}), {});

            // 2. Get active deployments for those classes (OIC Enforced)
            const { data: deployments } = await supabase
                .from('feedback_deployments')
                .select('*')
                .in('classroom_id', classIds)
                .eq('is_active', true)
                .eq('org_id', profile.org_id);

            if (!deployments) {
                setPendingRequests([]); setLoading(false); return;
            }

            // 3. Get feedback the student has ALREADY submitted to filter them out
            const { data: mySubmissions } = await supabase
                .from('student_feedback')
                .select('deployment_id')
                .eq('student_id', profile.user_id);
            
            const completedDeploymentIds = new Set((mySubmissions || []).map(s => s.deployment_id));

            // 4. Filter to only show incomplete requests
            const todoList = deployments
                .filter(d => !completedDeploymentIds.has(d.deployment_id))
                .map(d => ({ ...d, class_name: classMap[d.classroom_id] }));

            setPendingRequests(todoList);

        } catch (err) {
            console.error("Feedback Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRatingChange = (dimension, value) => {
        setRatings(prev => ({ ...prev, [dimension]: value }));
    };

    const handleHoverChange = (dimension, value) => {
        setHoverRatings(prev => ({ ...prev, [dimension]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // 🚨 MVD ENFORCEMENT PROTOCOL
        if (Object.values(ratings).some(val => val === 0)) {
            return alert("MVD Violation: All rubric dimensions must be scored to ensure data integrity.");
        }
        if (structuredFeedback.trim().length < 15) {
            return alert("MVD Violation: Please provide a substantive response for the qualitative feedback.");
        }

        setIsSubmitting(true);
        try {
            // Database Payload mapped to new International Standards
            const { error } = await supabase
                .from('student_feedback')
                .insert([{
                    deployment_id: activeDeployment.deployment_id,
                    student_id: profile.user_id,
                    org_id: profile.org_id,
                    rating_overall: ratings.overall,
                    rating_clarity: ratings.clarity,
                    rating_clinical: ratings.clinical,
                    rating_engagement: ratings.engagement,
                    structured_feedback: structuredFeedback.trim()
                }]);

            if (error) throw error;
            
            // Success Protocol: Clean State
            setPendingRequests(prev => prev.filter(req => req.deployment_id !== activeDeployment.deployment_id));
            setActiveDeployment(null);
            setRatings({ overall: 0, clarity: 0, clinical: 0, engagement: 0 });
            setStructuredFeedback('');
            
        } catch (error) {
            console.error("Feedback Error:", error);
            alert("Failed to submit telemetry. Please check your connection.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderRatingRow = (dimension, label, icon, description) => (
        <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-indigo-500">{icon}</span>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{label}</h4>
                </div>
                <p className="text-xs font-medium text-slate-500">{description}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star} type="button"
                        onClick={() => handleRatingChange(dimension, star)} 
                        onMouseEnter={() => handleHoverChange(dimension, star)} 
                        onMouseLeave={() => handleHoverChange(dimension, 0)}
                        className="transition-transform active:scale-90 focus:outline-none p-1"
                    >
                        <Star size={28} className={`transition-colors duration-200 ${ (hoverRatings[dimension] || ratings[dimension]) >= star ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]' : 'fill-transparent text-slate-300 dark:text-slate-700' }`} />
                    </button>
                ))}
            </div>
        </div>
    );

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;
    }

    // --- VIEW 1: THE STANDARDIZED RUBRIC FORM ---
    if (activeDeployment) {
        return (
            <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-300 pb-20">
                <button 
                    onClick={() => setActiveDeployment(null)}
                    className="mb-6 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-2"
                >
                    ← Back to Pending Requests
                </button>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
                        <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 inline-block">
                            {activeDeployment.class_name}
                        </span>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">{activeDeployment.module_title}</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">CognIQ Ed Standardized Clinical Evaluation</p>
                        
                        {activeDeployment.custom_prompt && (
                            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex gap-3 mt-6">
                                <Sparkles size={20} className="text-amber-500 shrink-0" />
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1 block">Faculty Directive</span>
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 italic">"{activeDeployment.custom_prompt}"</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        <div className="space-y-3">
                            {renderRatingRow('overall', 'Overall Module Rating', <Star size={18}/>, 'Your general assessment of this learning module.')}
                            {renderRatingRow('clarity', 'Concept Clarity', <Lightbulb size={18}/>, 'How clearly were the core mechanisms and learning objectives communicated?')}
                            {renderRatingRow('clinical', 'Clinical Correlation', <Activity size={18}/>, 'How effectively did this module connect theoretical knowledge to clinical practice?')}
                            {renderRatingRow('engagement', 'Instructional Engagement', <Users size={18}/>, 'How well did the delivery method stimulate critical thinking and maintain focus?')}
                        </div>

                        <div className="pt-6">
                            <label className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest mb-2">Structured Qualitative Feedback <span className="text-red-500">*</span></label>
                            <p className="text-xs font-medium text-slate-500 mb-4">Please identify one specific strength of this module, and one specific area requiring improvement.</p>
                            <textarea 
                                value={structuredFeedback} 
                                onChange={(e) => setStructuredFeedback(e.target.value)}
                                placeholder="Strength: The case study on cardiovascular pathology was highly relevant.&#10;Improvement: The pacing of the second lecture was too fast..."
                                className="w-full h-32 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-2xl p-5 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none text-sm"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={isSubmitting || Object.values(ratings).some(v => v === 0) || structuredFeedback.trim().length < 15} 
                            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? <><Loader2 size={20} className="animate-spin"/> Transmitting Telemetry...</> : <><Send size={20}/> Submit Formal Evaluation</>}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- VIEW 2: THE TODO LIST (OR ZERO STATE) ---
    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in">
            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                    <MessageSquare size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Pulse Surveys</h1>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Pending institutional evaluations</p>
                </div>
            </div>

            {pendingRequests.length === 0 ? (
                <div className="text-center bg-white dark:bg-slate-900 p-16 rounded-[32px] border border-dashed border-slate-300 dark:border-slate-800">
                    <CheckCircle2 size={48} className="text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">You're All Caught Up</h3>
                    <p className="text-sm text-slate-500 mt-2">There are no pending evaluations for your enrolled cohorts.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingRequests.map((req) => (
                        <div 
                            key={req.deployment_id} 
                            onClick={() => setActiveDeployment(req)}
                            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-sm cursor-pointer transition-all group flex flex-col h-full"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block">
                                    {req.class_name}
                                </span>
                                <BookOpen size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            </div>
                            
                            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2 line-clamp-2">
                                {req.module_title}
                            </h3>
                            
                            <button className="mt-auto w-full py-3 bg-slate-50 dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest text-[10px] rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center justify-center gap-2">
                                Begin Evaluation <span className="text-lg leading-none">→</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}