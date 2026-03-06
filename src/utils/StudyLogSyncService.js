import { supabase } from '../supabaseClient';

const LOCAL_QUEUE_KEY = 'atlas_offline_progress_queue';

export const StudyLogSyncService = {
    
    // 1. Fetch & Merge (Now with Pagination to bypass 1000 row limit!)
    async getReviewedCards(studentId) {
        let mergedSet = new Set();
        
        try {
            let fetchMore = true;
            let startIdx = 0;
            const step = 1000;

            // 🚀 THE FIX: Loop until we get every single log!
            while (fetchMore) {
                const { data, error } = await supabase
                    .from('flashcard_progress')
                    .select('card_id')
                    .eq('student_id', studentId)
                    .range(startIdx, startIdx + step - 1); // Get rows 0-999, then 1000-1999...
                
                if (error) {
                    console.error("🚨 Supabase Error:", error.message);
                    break;
                }
                    
                if (data && data.length > 0) {
                    data.forEach(p => mergedSet.add(String(p.card_id))); 
                    startIdx += step;
                    
                    // If it brought back less than 1000, we've hit the end of the history!
                    if (data.length < step) fetchMore = false;
                } else {
                    fetchMore = false;
                }
            }
        } catch (err) {
            console.error("🚨 Network Error:", err);
        }

        // 2. Merge local offline queue
        try {
            const localQueueStr = localStorage.getItem(LOCAL_QUEUE_KEY);
            if (localQueueStr) {
                const localQueue = JSON.parse(localQueueStr);
                localQueue.forEach(item => mergedSet.add(String(item.card_id))); 
            }
        } catch (e) {
            localStorage.removeItem(LOCAL_QUEUE_KEY);
        }

        return mergedSet;
    },

    // 2. Log a Review
    async logCardReview(studentId, orgId, card) {
        const payload = {
            student_id: studentId,
            org_id: orgId,
            deck_id: card.chapter || 'Uncategorized',
            card_id: card.id || card.flashcard_id, 
            status: 'reviewed',
            reviewed_at: new Date().toISOString()
        };

        if (navigator.onLine) {
            const { error } = await supabase.from('flashcard_progress').insert([payload]);
            if (!error || error.code === '23505') return true; 
        }

        const queue = JSON.parse(localStorage.getItem(LOCAL_QUEUE_KEY) || '[]');
        if (!queue.find(q => q.card_id === payload.card_id)) {
            queue.push(payload);
            localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(queue));
        }
        return false; 
    },

    // 3. Background Sync
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
            }
        } catch (err) {
            console.error("Sync engine crash:", err);
        }
    }
};