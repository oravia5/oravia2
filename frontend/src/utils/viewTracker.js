import client from '../api/client';

const pendingViews = new Set();
let flushTimer = null;

function flush() {
  if (pendingViews.size === 0) return;
  const postIds = Array.from(pendingViews);
  pendingViews.clear();
  client.post('/posts/views/batch', { postIds }).catch(() => {});
}

export function queueView(postId) {
  if (!postId || pendingViews.has(postId)) return;
  pendingViews.add(postId);
  if (!flushTimer) {
    flushTimer = setInterval(flush, 10000);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
