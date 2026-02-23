import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';

export const useWebProctor = (deploymentId, studentId, isExamActive) => {
  // Local State for UI Feedback
  const [warnings, setWarnings] = useState(0);
  const [violationMsg, setViolationMsg] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(true); // Default true to avoid initial block
  
  // Refs to prevent stale closures in event listeners
  const lastIncidentRef = useRef(0);

  useEffect(() => {
    if (!isExamActive || !deploymentId || !studentId) return;

    // --- HELPER: Log to Supabase ---
    const logIncident = async (type, description, severity = 'medium') => {
      // Throttle logs: Prevent spamming DB if events fire rapidly
      const now = Date.now();
      if (now - lastIncidentRef.current < 2000) return; // Wait 2s between logs
      lastIncidentRef.current = now;

      // 1. Update UI immediately
      setWarnings(prev => prev + 1);
      setViolationMsg(`⚠️ Warning: ${description}`);
      
      // Auto-clear message after 5 seconds
      setTimeout(() => setViolationMsg(''), 5000);

      // 2. Log to Database
      try {
        await supabase.from('proctoring_logs').insert([{
          deployment_id: deploymentId,
          student_id: studentId,
          incident_type: type,
          description: description,
          severity: severity
        }]);
      } catch (err) {
        console.error("Failed to log incident:", err);
      }
    };

    // --- DETECTORS ---

    // 1. Tab Switching / Minimizing
    const handleVisibility = () => {
      if (document.hidden) {
        logIncident('tab_switch', 'Student navigated away (Tab hidden).', 'high');
      }
    };

    // 2. Focus Loss (Alt+Tab or clicking outside)
    const handleBlur = () => {
      logIncident('focus_lost', 'Browser window lost focus.', 'medium');
    };

    // 3. Full Screen Enforcement
    const handleFullScreenChange = () => {
      const isFull = document.fullscreenElement || document.webkitFullscreenElement;
      setIsFullScreen(!!isFull);
      if (!isFull) {
          logIncident('fullscreen_exit', 'Exited Full Screen Mode.', 'high');
      }
    };

    // 4. Keyboard Shortcuts (Screenshots)
    const handleKeys = (e) => {
      if (e.key === 'PrintScreen') {
        logIncident('screenshot_attempt', 'PrintScreen key pressed.', 'high');
      }
    };

    // 5. Context Menu (Right Click)
    const handleContextMenu = (e) => {
      e.preventDefault(); // Block the menu
      logIncident('right_click', 'Right-click menu attempted.', 'low');
    };

    // --- ATTACH LISTENERS ---
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullScreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullScreenChange); // Safari support
    window.addEventListener("keyup", handleKeys);
    document.addEventListener("contextmenu", handleContextMenu);

    // Initial Full Screen Attempt
    triggerFullScreen();

    // --- CLEANUP ---
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullScreenChange);
      window.removeEventListener("keyup", handleKeys);
      document.removeEventListener("contextmenu", handleContextMenu);
    };

  }, [isExamActive, deploymentId, studentId]);

  // Helper function exposed to the UI to re-trigger full screen
  const triggerFullScreen = () => {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
          elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) { /* Safari */
          elem.webkitRequestFullscreen();
      }
      setIsFullScreen(true);
  };

  return { warnings, isFullScreen, triggerFullScreen, violationMsg, setViolationMsg };
};