// ---------- Mobile nav toggle ----------
document.addEventListener('DOMContentLoaded', function () {
  var burger = document.querySelector('.burger');
  var links = document.querySelector('nav.links');
  if (burger && links) {
    burger.addEventListener('click', function () {
      links.classList.toggle('open');
    });
  }

  // ---------- Contact form submit ----------
  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var msgBox = document.getElementById('formMsg');
      var btn = form.querySelector('button[type="submit"]');
      var payload = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        service: form.service ? form.service.value : '',
        message: form.message.value.trim()
      };

      if (!payload.name || !payload.email || !payload.message) {
        msgBox.textContent = 'Please fill in name, email and message.';
        msgBox.className = 'err';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Sending...';

      try {
        var res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var data = await res.json();

        if (res.ok) {
          msgBox.textContent = 'Thank you! Your message has been received. We will contact you soon.';
          msgBox.className = 'ok';
          form.reset();
        } else {
          msgBox.textContent = data.error || 'Something went wrong. Please try again.';
          msgBox.className = 'err';
        }
      } catch (err) {
        msgBox.textContent = 'Network error. Please check your connection and try again.';
        msgBox.className = 'err';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send Message';
      }
    });
  }
});
