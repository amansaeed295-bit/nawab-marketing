document.addEventListener('DOMContentLoaded', async function () {
  // ---------- Render approved testimonials (used on index.html) ----------
  const container = document.getElementById('testimonialsContainer');
  if (container) {
    try {
      const res = await fetch('/api/testimonials');
      const items = await res.json();

      if (!items.length) {
        container.innerHTML = '<p style="color:var(--stone);">No client feedback yet.</p>';
      } else {
        container.innerHTML = items.slice(0, 6).map(renderTestimonialCard).join('');
      }
    } catch (err) {
      container.innerHTML = '<p>Could not load testimonials right now.</p>';
    }
  }

  // ---------- Handle the "Leave Feedback" form (used on contact.html) ----------
  const feedbackForm = document.getElementById('feedbackForm');
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const msgBox = document.getElementById('feedbackMsg');
      const btn = feedbackForm.querySelector('button[type="submit"]');

      const payload = {
        name: feedbackForm.fbName.value.trim(),
        role: feedbackForm.fbRole.value.trim(),
        quote: feedbackForm.fbQuote.value.trim()
      };

      if (!payload.name || !payload.quote) {
        msgBox.textContent = 'Please enter your name and feedback.';
        msgBox.className = 'err';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Submitting...';

      try {
        const res = await fetch('/api/testimonials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok) {
          msgBox.textContent = data.message || 'Thank you! Your feedback has been submitted for review.';
          msgBox.className = 'ok';
          feedbackForm.reset();
        } else {
          msgBox.textContent = data.error || 'Something went wrong. Please try again.';
          msgBox.className = 'err';
        }
      } catch (err) {
        msgBox.textContent = 'Network error. Please check your connection.';
        msgBox.className = 'err';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Feedback';
      }
    });
  }
});

function renderTestimonialCard(t) {
  return `
    <div class="testi-card">
      <p class="quote">"${escapeHtmlTst(t.quote)}"</p>
      <div class="testi-name">${escapeHtmlTst(t.name)}</div>
      <div class="testi-role">${escapeHtmlTst(t.role)}</div>
    </div>
  `;
}

function escapeHtmlTst(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
