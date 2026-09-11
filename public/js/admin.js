document.addEventListener('DOMContentLoaded', function () {
  const loginScreen = document.getElementById('loginScreen');
  const dashboard = document.getElementById('dashboard');
  const loginForm = document.getElementById('loginForm');
  const loginMsg = document.getElementById('loginMsg');
  const logoutBtn = document.getElementById('logoutBtn');

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ---------- Login check ----------
  async function checkLogin() {
    try {
      const res = await fetch('/api/admin/check');
      const data = await res.json();
      if (data.loggedIn) showDashboard();
      else { loginScreen.style.display = 'block'; dashboard.style.display = 'none'; }
    } catch (e) {
      loginScreen.style.display = 'block';
    }
  }

  function showDashboard() {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'block';
    loadProjects();
    loadServices();
    loadTestimonials();
    loadSettings();
    loadTeam();
    loadLogo();
  }

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    loginMsg.textContent = '';
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) showDashboard();
      else { loginMsg.textContent = data.error || 'Login failed.'; loginMsg.className = 'err'; }
    } catch (err) {
      loginMsg.textContent = 'Network error. Please try again.';
      loginMsg.className = 'err';
    }
  });

  logoutBtn.addEventListener('click', async function () {
    await fetch('/api/admin/logout', { method: 'POST' });
    location.reload();
  });

  // ---------- Tabs ----------
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.getAttribute('data-tab')).classList.add('active');
    });
  });

  // ============================================================
  // PROJECTS
  // ============================================================
  const addProjectForm = document.getElementById('addProjectForm');
  const projectMsg = document.getElementById('projectMsg');
  const projectsList = document.getElementById('projectsList');

  addProjectForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    projectMsg.textContent = '';
    const btn = addProjectForm.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Adding...';

    const formData = new FormData(addProjectForm);
    formData.set('featured', document.getElementById('proj_featured').checked);

    try {
      const res = await fetch('/api/admin/projects', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        projectMsg.textContent = 'Project added successfully!'; projectMsg.className = 'ok';
        addProjectForm.reset(); loadProjects();
      } else {
        projectMsg.textContent = data.error || 'Could not add project.'; projectMsg.className = 'err';
      }
    } catch (err) {
      projectMsg.textContent = 'Network error.'; projectMsg.className = 'err';
    } finally {
      btn.disabled = false; btn.textContent = 'Add Project';
    }
  });

  async function loadProjects() {
    projectsList.innerHTML = 'Loading...';
    try {
      const res = await fetch('/api/projects');
      const projects = await res.json();
      if (!projects.length) { projectsList.innerHTML = '<p style="color:var(--stone);">No projects added yet.</p>'; return; }

      projectsList.innerHTML = '';
      projects.forEach(function (p) {
        const row = document.createElement('div');
        row.className = 'row-item';
        const thumbStyle = p.image ? `background-image:url('/${p.image}')` : '';
        row.innerHTML = `
          <div class="row-thumb" style="${thumbStyle}"></div>
          <div class="row-info">
            <h4>${escapeHtml(p.name)} ${p.featured ? '<span class="badge badge-featured">FEATURED</span>' : ''} ${p.video ? '<span class="badge badge-approved">HAS VIDEO</span>' : ''}</h4>
            <span>${escapeHtml(p.type)} • ${escapeHtml(p.location)} • ${escapeHtml(p.status)}</span>
          </div>
          <div class="row-actions">
            <button class="del-btn" data-id="${p.id}">Delete</button>
          </div>
        `;
        projectsList.appendChild(row);
      });

      projectsList.querySelectorAll('.del-btn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          if (!confirm('Delete this project?')) return;
          const res = await fetch('/api/admin/projects/' + btn.getAttribute('data-id'), { method: 'DELETE' });
          if (res.ok) loadProjects(); else alert('Could not delete project.');
        });
      });
    } catch (err) {
      projectsList.innerHTML = '<p class="err">Could not load projects.</p>';
    }
  }

  // ============================================================
  // SERVICES
  // ============================================================
  const addServiceForm = document.getElementById('addServiceForm');
  const serviceMsg = document.getElementById('serviceMsg');
  const servicesList = document.getElementById('servicesList');

  addServiceForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    serviceMsg.textContent = '';
    const btn = addServiceForm.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Adding...';

    const formData = new FormData(addServiceForm);
    const payload = {
      title: formData.get('title'),
      description: formData.get('description'),
      featured: document.getElementById('serv_featured').checked
    };

    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        serviceMsg.textContent = 'Service added successfully!'; serviceMsg.className = 'ok';
        addServiceForm.reset(); loadServices();
      } else {
        serviceMsg.textContent = data.error || 'Could not add service.'; serviceMsg.className = 'err';
      }
    } catch (err) {
      serviceMsg.textContent = 'Network error.'; serviceMsg.className = 'err';
    } finally {
      btn.disabled = false; btn.textContent = 'Add Service';
    }
  });

  async function loadServices() {
    servicesList.innerHTML = 'Loading...';
    try {
      const res = await fetch('/api/services');
      const services = await res.json();
      if (!services.length) { servicesList.innerHTML = '<p style="color:var(--stone);">No services added yet.</p>'; return; }

      servicesList.innerHTML = '';
      services.forEach(function (s) {
        const row = document.createElement('div');
        row.className = 'row-item';
        row.innerHTML = `
          <div class="row-info">
            <h4>${escapeHtml(s.title)} ${s.featured ? '<span class="badge badge-featured">HOME PAGE</span>' : ''}</h4>
            <p>${escapeHtml(s.description)}</p>
          </div>
          <div class="row-actions">
            <button class="del-btn" data-id="${s.id}">Delete</button>
          </div>
        `;
        servicesList.appendChild(row);
      });

      servicesList.querySelectorAll('.del-btn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          if (!confirm('Delete this service?')) return;
          const res = await fetch('/api/admin/services/' + btn.getAttribute('data-id'), { method: 'DELETE' });
          if (res.ok) loadServices(); else alert('Could not delete service.');
        });
      });
    } catch (err) {
      servicesList.innerHTML = '<p class="err">Could not load services.</p>';
    }
  }

  // ============================================================
  // TESTIMONIALS / CLIENT FEEDBACK
  // ============================================================
  const addTestimonialForm = document.getElementById('addTestimonialForm');
  const testimonialMsg = document.getElementById('testimonialMsg');
  const testimonialsList = document.getElementById('testimonialsList');

  addTestimonialForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    testimonialMsg.textContent = '';
    const btn = addTestimonialForm.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Adding...';

    const formData = new FormData(addTestimonialForm);
    const payload = {
      name: formData.get('name'),
      role: formData.get('role'),
      quote: formData.get('quote')
    };

    try {
      // Create it, then immediately approve it since admin is adding it directly
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        testimonialMsg.textContent = 'Feedback added! Approve it below to show it on the website.';
        testimonialMsg.className = 'ok';
        addTestimonialForm.reset();
        loadTestimonials();
      } else {
        testimonialMsg.textContent = data.error || 'Could not add feedback.'; testimonialMsg.className = 'err';
      }
    } catch (err) {
      testimonialMsg.textContent = 'Network error.'; testimonialMsg.className = 'err';
    } finally {
      btn.disabled = false; btn.textContent = 'Add & Approve';
    }
  });

  async function loadTestimonials() {
    testimonialsList.innerHTML = 'Loading...';
    try {
      const res = await fetch('/api/admin/testimonials');
      const items = await res.json();
      if (!items.length) { testimonialsList.innerHTML = '<p style="color:var(--stone);">No feedback yet.</p>'; return; }

      testimonialsList.innerHTML = '';
      items.forEach(function (t) {
        const badgeClass = t.status === 'approved' ? 'badge-approved' : t.status === 'rejected' ? 'badge-rejected' : 'badge-pending';
        const row = document.createElement('div');
        row.className = 'row-item';
        row.innerHTML = `
          <div class="row-info">
            <h4>${escapeHtml(t.name)} <span class="badge ${badgeClass}">${t.status.toUpperCase()}</span></h4>
            <span>${escapeHtml(t.role)}</span>
            <p style="margin-top:6px;">"${escapeHtml(t.quote)}"</p>
          </div>
          <div class="row-actions">
            ${t.status !== 'approved' ? `<button class="approve-btn" data-id="${t.id}" data-action="approve">Approve</button>` : ''}
            <button class="del-btn" data-id="${t.id}" data-action="delete">Delete</button>
          </div>
        `;
        testimonialsList.appendChild(row);
      });

      testimonialsList.querySelectorAll('[data-action="approve"]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          const res = await fetch('/api/admin/testimonials/' + btn.getAttribute('data-id'), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved' })
          });
          if (res.ok) loadTestimonials(); else alert('Could not approve feedback.');
        });
      });

      testimonialsList.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          if (!confirm('Delete this feedback?')) return;
          const res = await fetch('/api/admin/testimonials/' + btn.getAttribute('data-id'), { method: 'DELETE' });
          if (res.ok) loadTestimonials(); else alert('Could not delete feedback.');
        });
      });
    } catch (err) {
      testimonialsList.innerHTML = '<p class="err">Could not load feedback.</p>';
    }
  }


  // ============================================================
  // TEAM & DIRECTOR
  // ============================================================
  const teamList = document.getElementById('teamList');
  const teamMsg = document.getElementById('teamMsg');
  const addTeamForm = document.getElementById('addTeamForm');

  async function loadTeam() {
    if (!teamList) return;
    try {
      const res = await fetch('/api/team');
      const team = await res.json();
      if (!team.length) { teamList.innerHTML = '<p style="color:var(--stone);">No team members yet.</p>'; return; }
      teamList.innerHTML = '';
      team.forEach(function(m) {
        const row = document.createElement('div');
        row.className = 'row-item';
        row.innerHTML = `
          <div class="row-info" style="display:flex;gap:16px;align-items:center;">
            ${m.image ? `<img src="${escapeHtml(m.image)}" alt="${escapeHtml(m.name)}" style="width:76px;height:76px;object-fit:cover;border-radius:8px;">` : ''}
            <div><h4>${escapeHtml(m.name)}</h4><span>${escapeHtml(m.position)}</span><p style="margin-top:6px;">${escapeHtml(m.description)}</p></div>
          </div>
          <div class="row-actions">
            <button class="edit-team" data-id="${m.id}">Edit</button>
            <button class="photo-team" data-id="${m.id}">Change Photo</button>
            <button class="del-btn delete-team" data-id="${m.id}">Delete</button>
          </div>`;
        teamList.appendChild(row);
      });
      teamList.querySelectorAll('.delete-team').forEach(btn => btn.addEventListener('click', async function() {
        if (!confirm('Delete this team member?')) return;
        const res = await fetch('/api/admin/team/' + btn.dataset.id, {method:'DELETE'});
        if (res.ok) loadTeam(); else alert('Could not delete team member.');
      }));

      teamList.querySelectorAll('.photo-team').forEach(btn => btn.addEventListener('click', function() {
        const m = team.find(x => String(x.id) === String(btn.dataset.id));
        if (!m) return;
        const input = document.createElement('input');
        input.type='file'; input.accept='image/jpeg,image/png,image/webp';
        input.onchange = async function() {
          if (!input.files[0]) return;
          const fd=new FormData(); fd.append('photo',input.files[0]);
          const res=await fetch('/api/admin/team/'+m.id,{method:'PUT',body:fd});
          if(res.ok) loadTeam(); else alert('Could not change photo.');
        };
        input.click();
      }));

      teamList.querySelectorAll('.edit-team').forEach(btn => btn.addEventListener('click', async function() {
        const m = team.find(x => String(x.id) === String(btn.dataset.id));
        if (!m) return;
        const name = prompt('Name:', m.name); if (name === null) return;
        const position = prompt('Position:', m.position); if (position === null) return;
        const description = prompt('Description:', m.description || ''); if (description === null) return;
        const fd = new FormData();
        fd.append('name', name); fd.append('position', position); fd.append('description', description);
        const res = await fetch('/api/admin/team/' + m.id, {method:'PUT', body:fd});
        if (res.ok) loadTeam(); else alert('Could not update team member.');
      }));
    } catch(e) { teamList.innerHTML = '<p class="err">Could not load team.</p>'; }
  }

  if (addTeamForm) addTeamForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = addTeamForm.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Adding...';
    try {
      const res = await fetch('/api/admin/team', {method:'POST', body:new FormData(addTeamForm)});
      const data = await res.json();
      if (res.ok) { teamMsg.textContent='Team member added.'; teamMsg.className='ok'; addTeamForm.reset(); loadTeam(); }
      else { teamMsg.textContent=data.error || 'Could not add team member.'; teamMsg.className='err'; }
    } catch(e) { teamMsg.textContent='Network error.'; teamMsg.className='err'; }
    finally { btn.disabled=false; btn.textContent='Add Team Member'; }
  });

  // ============================================================
  // LOGO
  // ============================================================
  const logoForm = document.getElementById('logoForm');
  const logoMsg = document.getElementById('logoMsg');
  const logoPreview = document.getElementById('logoPreview');

  async function loadLogo() {
    if (!logoPreview) return;
    try {
      const res = await fetch('/api/settings'); const s = await res.json();
      logoPreview.innerHTML = s.logo ? `<img src="${escapeHtml(s.logo)}" alt="Current logo" style="max-width:220px;max-height:90px;object-fit:contain;border:1px solid #ddd;padding:8px;border-radius:8px;">` : '<p style="color:var(--stone);">No logo uploaded.</p>';
    } catch(e) {}
  }
  if (logoForm) logoForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn=logoForm.querySelector('button[type="submit"]'); btn.disabled=true; btn.textContent='Uploading...';
    try {
      const res=await fetch('/api/admin/logo',{method:'POST',body:new FormData(logoForm)});
      const data=await res.json();
      if(res.ok){logoMsg.textContent='Logo uploaded. It is now live.';logoMsg.className='ok';logoForm.reset();loadLogo();}
      else{logoMsg.textContent=data.error||'Could not upload logo.';logoMsg.className='err';}
    }catch(e){logoMsg.textContent='Network error.';logoMsg.className='err';}
    finally{btn.disabled=false;btn.textContent='Upload / Replace Logo';}
  });
  const removeLogoBtn=document.getElementById('removeLogoBtn');
  if(removeLogoBtn) removeLogoBtn.addEventListener('click',async function(){
    if(!confirm('Remove the current logo?'))return;
    const res=await fetch('/api/admin/logo',{method:'DELETE'});
    if(res.ok){logoMsg.textContent='Logo removed.';logoMsg.className='ok';loadLogo();}else alert('Could not remove logo.');
  });

  // ============================================================
  // COMPANY CONTENT
  // ============================================================
  const aboutForm=document.getElementById('aboutForm'), aboutMsg=document.getElementById('aboutMsg');
  if(aboutForm) aboutForm.addEventListener('submit',function(e){
    e.preventDefault();
    saveSettings(aboutForm,aboutMsg,'Company content saved and is now live.');
  });

  // ============================================================
  // SETTINGS — Contact & Company Info + Homepage Hero & Stats
  // ============================================================
  const settingsForm = document.getElementById('settingsForm');
  const settingsMsg = document.getElementById('settingsMsg');
  const heroForm = document.getElementById('heroForm');
  const heroMsg = document.getElementById('heroMsg');

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      const settings = await res.json();
      Object.keys(settings).forEach(function (key) {
        const field1 = settingsForm.elements[key];
        if (field1) field1.value = settings[key] || '';
        const field2 = heroForm.elements[key];
        if (field2) field2.value = settings[key] || '';
        const field3 = aboutForm && aboutForm.elements[key];
        if (field3) field3.value = settings[key] || '';
      });
    } catch (err) {
      settingsMsg.textContent = 'Could not load current settings.';
      settingsMsg.className = 'err';
    }
  }

  async function saveSettings(form, msgBox, successText) {
    msgBox.textContent = '';
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true; btn.textContent = 'Saving...';

    const formData = new FormData(form);
    const payload = {};
    formData.forEach(function (value, key) { payload[key] = value; });

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        msgBox.textContent = successText; msgBox.className = 'ok';
      } else {
        msgBox.textContent = data.error || 'Could not save changes.'; msgBox.className = 'err';
      }
    } catch (err) {
      msgBox.textContent = 'Network error.'; msgBox.className = 'err';
    } finally {
      btn.disabled = false; btn.textContent = originalText;
    }
  }

  settingsForm.addEventListener('submit', function (e) {
    e.preventDefault();
    saveSettings(settingsForm, settingsMsg, 'Saved! Changes are now live across the website.');
  });

  heroForm.addEventListener('submit', function (e) {
    e.preventDefault();
    saveSettings(heroForm, heroMsg, 'Saved! Home page hero and stats are now updated.');
  });

  checkLogin();
});
