import { supabase } from '../supabaseClient';

const LOCAL_QUEUE_KEY = 'atlas_offline_progress_queue';

export const StudyLogSyncService = {
    
    // 1. Fetch & Merge (Combines Supabase + Offline Local Storage)
    async getReviewedCards(studentId) {
        let mergedSet = new Set();
        
        try {
            const { data, error } = await supabase
                .from('flashcard_progress')
                .select('card_id')
                .eq('student_id', studentId);
            
            if (error) console.error("🚨 Supabase Error:", error.message);
                
            if (data && data.length > 0) {
                // 🚀 FIX: Force to String!
                data.forEach(p => mergedSet.add(String(p.card_id))); 
            }
        } catch (err) {
            console.error("🚨 Network Error:", err);
        }

        try {
            const localQueue = JSON.parse(localStorage.getItem(LOCAL_QUEUE_KEY) || '[]');
            // 🚀 FIX: Force to String!
            localQueue.forEach(item => mergedSet.add(String(item.card_id))); 
        } catch (e) {}

        return mergedSet;
    },

    // 2. Log a Review (Attempts Cloud -> Falls back to Local)
    async logCardReview(studentId, orgId, card) {
        const payload = {
            student_id: studentId,
            org_id: orgId,
            deck_id: card.chapter || 'Uncategorized',
            card_id: card.id,
            status: 'reviewed',
            reviewed_at: new Date().toISOString()
        };

        if (navigator.onLine) {
            const { error } = await supabase.from('flashcard_progress').insert([payload]);
            if (!error || error.code === '23505') return true; 
            console.warn("Supabase blocked log, moving to offline queue:", error);
        }

        const queue = JSON.parse(localStorage.getItem(LOCAL_QUEUE_KEY) || '[]');
        if (!queue.find(q => q.card_id === card.id)) {
            queue.push(payload);
            localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(queue));
        }
        return false; 
    },

    // 3. Background Sync (Pushes local queue to cloud)
    async syncOfflineLogs() {
        if (!navigator.onLine) return;
        
        const queueStr = localStorage.getItem(LOCAL_QUEUE_KEY);
        if (!queueStr) return;

        try {
            const queue = JSON.parse(queueStr);
            if (queue.length === 0) return;

            const { error } = await supabase.from('flashcard_progress').insert(queue);
            
            if (!error || error.code === '23505') {
                localStorage.removeItem(LOCAL_QUEUE_KEY);
                console.log("☁️ Offline study logs successfully synced to cloud!");
            } else {
                console.error("🚨 Sync engine failed to push logs:", error.message);
            }
        } catch (err) {
            console.error("Sync engine crash:", err);
        }
    }
};