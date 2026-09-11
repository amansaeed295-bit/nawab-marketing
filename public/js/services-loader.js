document.addEventListener('DOMContentLoaded', async function () {
  const container = document.getElementById('servicesContainer');
  if (!container) return;

  const featuredOnly = container.getAttribute('data-featured-only') === 'true';

  try {
    const res = await fetch('/api/services');
    let services = await res.json();

    if (featuredOnly) services = services.filter(s => s.featured);

    if (!services.length) {
      container.innerHTML = '<p style="color:var(--stone);">No services listed yet.</p>';
      return;
    }

    container.innerHTML = services.map(renderServiceCard).join('');
  } catch (err) {
    container.innerHTML = '<p>Could not load services right now.</p>';
  }
});

function renderServiceCard(s, i) {
  return `
    <div class="service-card">
      <div class="mark">${String((s.order || 0)).padStart(2, '0')}</div>
      <h3>${escapeHtmlSrv(s.title)}</h3>
      <p>${escapeHtmlSrv(s.description)}</p>
    </div>
  `;
}

function escapeHtmlSrv(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
