// ELO Shared Utilities
function showToast(message, type = 'success', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span class="toast-icon">${icons[type] || '✓'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function showSkeleton(id, lines = 3) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '';
  for (let i = 0; i < lines; i++) {
    const s = document.createElement('div');
    s.className = 'skeleton';
    s.style = `height: 40px; margin-bottom: 8px; ${i === lines - 1 ? 'width: 60%;' : 'width: 100%;'}`;
    el.appendChild(s);
  }
}

function buildB2Url(key) {
  return `https://ilrgsvtztyijgurpvuit.supabase.co/functions/v1/upload-to-b2?key=${encodeURIComponent(key)}`;
}
