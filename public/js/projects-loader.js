// Fetches projects from the backend and renders them as cards.
// Used on both index.html (featured only) and projects.html (all projects).
document.addEventListener('DOMContentLoaded', async function () {
  const container = document.getElementById('projectsContainer');
  if (!container) return;

  const featuredOnly = container.getAttribute('data-featured-only') === 'true';

  try {
    const res = await fetch('/api/projects');
    let projects = await res.json();

    if (featuredOnly) {
      projects = projects.filter(p => p.featured);
    }

    if (!projects.length) {
      container.innerHTML = '<p style="color:' + (featuredOnly ? 'rgba(246,242,233,0.7)' : 'var(--stone)') + ';">No projects to show yet. Check back soon.</p>';
      return;
    }

    container.innerHTML = projects.map(renderCard).join('');
  } catch (err) {
    container.innerHTML = '<p>Could not load projects right now.</p>';
  }
});

function renderCard(p) {
  const thumbStyle = p.image
    ? `background-image:url('/${p.image}'); background-size:cover; background-position:center;`
    : '';
  const videoLink = p.video
    ? `<a href="/${p.video}" target="_blank" rel="noopener" style="display:inline-block; margin-top:10px; font-size:13.5px; font-weight:800; color:var(--gold-dim);">&#9654; Watch Video Tour</a>`
    : '';
  return `
    <div class="project-card">
      <div class="project-thumb" style="${thumbStyle}">
        <span class="tag">${escapeHtml(p.type)}</span>
        <h4>${escapeHtml(p.name)}</h4>
      </div>
      <div class="project-body">
        <div class="loc">${escapeHtml(p.location)}</div>
        <p>${escapeHtml(p.description)}</p>
        <div class="meta"><span>${escapeHtml(p.size)}</span><span>${escapeHtml(p.status)}</span></div>
        ${videoLink}
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
