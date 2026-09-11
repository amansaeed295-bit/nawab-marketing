document.addEventListener('DOMContentLoaded', async function () {
  try {
    const res = await fetch('/api/settings');
    const s = await res.json();
    if (!s || !Object.keys(s).length) return;

    const phoneHtml = s.phone1 + (s.phone2 ? '<br>' + s.phone2 : '');
    const emailHtml = s.email1 + (s.email2 ? '<br>' + s.email2 : '');
    const addressHtml = (s.addressLine1 || '') + (s.addressLine2 ? '<br>' + s.addressLine2 : '');
    const addressOneLine = [s.addressLine1, s.addressLine2].filter(Boolean).join(', ');
    const hoursHtml = (s.hoursLine1 || '') + (s.hoursLine2 ? '<br>' + s.hoursLine2 : '');

    // Footer (single-line versions)
    setEl('footerPhone', s.phone1);
    setEl('footerEmail', s.email1);
    setEl('footerAddress', addressOneLine);

    // Contact page info blocks (full multi-line versions)
    setEl('infoPhone', phoneHtml, true);
    setEl('infoEmail', emailHtml, true);
    setEl('infoAddress', addressHtml, true);
    setEl('infoHours', hoursHtml, true);

    // Homepage hero heading, paragraph, and stats
    setEl('heroHeading', s.heroHeading);
    setEl('heroParagraph', s.heroParagraph);
    setEl('statYears', s.statYears);
    setEl('statYearsLabel', s.statYearsLabel);
    setEl('statProjects', s.statProjects);
    setEl('statProjectsLabel', s.statProjectsLabel);
    setEl('statClients', s.statClients);
    setEl('statClientsLabel', s.statClientsLabel);
    setEl('statCities', s.statCities);
    setEl('statCitiesLabel', s.statCitiesLabel);

    // About page content — fully editable from Admin
    setEl('aboutStoryTitle', s.aboutStoryTitle);
    setEl('aboutStory1', s.aboutStory1);
    setEl('aboutStory2', s.aboutStory2);
    setEl('missionTitle', s.missionTitle);
    setEl('missionText', s.missionText);
    setEl('visionTitle', s.visionTitle);
    setEl('visionText', s.visionText);
    setEl('whyTitle', s.whyTitle);
    setEl('why1Title', s.why1Title);
    setEl('why1Text', s.why1Text);
    setEl('why2Title', s.why2Title);
    setEl('why2Text', s.why2Text);
    setEl('why3Title', s.why3Title);
    setEl('why3Text', s.why3Text);

    // Company logo — preserves the existing brand placement/style
    if (s.logo) {
      document.querySelectorAll('.brand').forEach(function(brand) {
        if (brand.closest('.admin-top')) return;
        brand.innerHTML = '<img class="site-logo" src="' + escapeAttr(s.logo) + '" alt="Nawab Marketing logo">';
      });
    }

    // Team — Director/CEO gets the larger presentation; everyone else is standard size
    const teamContainer = document.getElementById('teamContainer');
    if (teamContainer) {
      try {
        const teamRes = await fetch('/api/team');
        const team = await teamRes.json();
        if (team.length) {
          teamContainer.innerHTML = '';
          team.forEach(function(member) {
            const role = String(member.position || '').toLowerCase();
            const isDirector = role.includes('director') || role.includes('ceo');
            const card = document.createElement('div');
            card.className = 'service-card team-card' + (isDirector ? ' director-card' : '');
            card.innerHTML =
              (member.image ? '<img class="team-photo' + (isDirector ? ' director-photo' : '') + '" src="' + escapeAttr(member.image) + '" alt="' + escapeAttr(member.name) + '">' : '') +
              '<h3>' + escapeHtml(member.name) + '</h3>' +
              '<p class="team-position">' + escapeHtml(member.position) + '</p>' +
              '<p>' + escapeHtml(member.description) + '</p>';
            teamContainer.appendChild(card);
          });
        } else {
          teamContainer.innerHTML = '<p style="color:var(--stone);">No team members added yet.</p>';
        }
      } catch(e) {}
    }

    // Floating WhatsApp contact button + small direct-chat popup
    if (s.whatsapp) {
      const number = String(s.whatsapp).replace(/[^0-9]/g, '');
      if (number) {
        const box = document.createElement('div');
        box.className = 'whatsapp-wrap';
        box.innerHTML = '<button class="whatsapp-float" aria-label="Chat on WhatsApp">WhatsApp</button><div class="whatsapp-popup"><b>Need help?</b><span>Chat with Nawab Marketing</span><a target="_blank" rel="noopener" href="https://wa.me/' + number + '">Open WhatsApp</a></div>';
        document.body.appendChild(box);
        box.querySelector('.whatsapp-float').addEventListener('click', function(){ box.classList.toggle('open'); });
      }
    }
  } catch (err) {
    // silently keep whatever static fallback text is already in the HTML
  }
});

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}
function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function setEl(id, value, isHtml) {
  const el = document.getElementById(id);
  if (!el || value === undefined || value === null || value === '') return;
  if (isHtml) el.innerHTML = value;
  else el.textContent = value;
}
