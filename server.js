// ============================================================
// NAWAB MARKETING — Backend Server (Node.js + Express)
// Admin-manageable: Projects, Services, Testimonials/Feedback
// ============================================================
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { initFirebase, loadDocument, saveDocument } = require('./firebase');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'data', 'messages.json');
const PROJECTS_FILE = path.join(__dirname, 'data', 'projects.json');
const SERVICES_FILE = path.join(__dirname, 'data', 'services.json');
const TESTIMONIALS_FILE = path.join(__dirname, 'data', 'testimonials.json');
const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');
const TEAM_FILE = path.join(__dirname, 'data', 'team.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'images', 'uploads');
const VIDEO_UPLOADS_DIR = path.join(__dirname, 'public', 'videos', 'uploads');
const firestoreCache = new Map();
const FILE_NAMES = [
  DATA_FILE, PROJECTS_FILE, SERVICES_FILE,
  TESTIMONIALS_FILE, SETTINGS_FILE, TEAM_FILE
];
const FILE_NAME_ONLY = {
  [DATA_FILE]: 'messages.json',
  [PROJECTS_FILE]: 'projects.json',
  [SERVICES_FILE]: 'services.json',
  [TESTIMONIALS_FILE]: 'testimonials.json',
  [SETTINGS_FILE]: 'settings.json',
  [TEAM_FILE]: 'team.json'
};

// ============================================================
// 🔐 ADMIN LOGIN CREDENTIALS — CHANGE THESE BEFORE GOING LIVE!
// ============================================================
const ADMIN_USERNAME = '@nawabkayani';
const ADMIN_PASSWORD = 'nawab12579.,@';

// ---------- Middleware ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'NAWAB_2020_SECURE..12345678!LLM',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8 hour login session
}));

// Serve the frontend (HTML, CSS, JS, images) from /public
app.use(express.static(path.join(__dirname, 'public')));

// ---------- File upload setup (Multer) — supports both photo & video ----------
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(VIDEO_UPLOADS_DIR)) fs.mkdirSync(VIDEO_UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'video') cb(null, VIDEO_UPLOADS_DIR);
    else cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.toLowerCase().replace(/[^a-z0-9.]/g, '-');
    cb(null, Date.now() + '-' + safeName);
  }
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

const upload = multer({
  storage: storage,
  limits: { fileSize: 60 * 1024 * 1024 }, // up to 60MB (covers short project video tours)
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'photo') {
      if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
      return cb(new Error('Photo must be JPG, PNG or WEBP.'));
    }
    if (file.fieldname === 'video') {
      if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) return cb(null, true);
      return cb(new Error('Video must be MP4, WEBM or MOV, max 60MB.'));
    }
    cb(new Error('Unexpected file field.'));
  }
});

const uploadProjectMedia = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]);

// Team photos and company logo uploads
const uploadBrandAndTeam = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new Error('Image must be JPG, PNG or WEBP.'));
    }
    cb(null, true);
  }
});

// ---------- Helpers ----------
function readJSON(file) {
  if (firestoreCache.has(file)) return firestoreCache.get(file);
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    return [];
  }
}
function readObjectJSON(file) {
  if (firestoreCache.has(file)) return firestoreCache.get(file);
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch (err) {
    return {};
  }
}
function writeJSON(file, data) {
  // Keep a local copy as a safe fallback, while Firestore is the live datastore.
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  firestoreCache.set(file, data);
  const fileName = FILE_NAME_ONLY[file];
  if (fileName) saveDocument(fileName, data);
}

async function initialiseFirestoreData() {
  for (const file of FILE_NAMES) {
    const fileName = FILE_NAME_ONLY[file];
    const isObject = file === SETTINGS_FILE;
    const fallback = isObject ? readObjectJSON(file) : readJSON(file);
    const value = await loadDocument(fileName, fallback);
    firestoreCache.set(file, value);
    // Keep local JSON synchronized with the Firestore copy used by the site.
    try {
      fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf-8');
    } catch (_) {}
  }
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Not logged in.' });
}

// ============================================================
// CONTACT FORM
// ============================================================
app.post('/api/contact', (req, res) => {
  const { name, email, phone, service, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  const newEntry = {
    id: Date.now(),
    name: String(name).trim(),
    email: String(email).trim(),
    phone: phone ? String(phone).trim() : '',
    service: service ? String(service).trim() : '',
    message: String(message).trim(),
    createdAt: new Date().toISOString()
  };
  const messages = readJSON(DATA_FILE);
  messages.push(newEntry);
  writeJSON(DATA_FILE, messages);
  return res.status(200).json({ success: true, message: 'Message received.' });
});

app.get('/api/admin/messages', requireAdmin, (req, res) => {
  res.json(readJSON(DATA_FILE).reverse());
});

// ============================================================
// ADMIN AUTH
// ============================================================
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Invalid username or password.' });
});
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});
app.get('/api/admin/check', (req, res) => {
  res.json({ loggedIn: !!(req.session && req.session.isAdmin) });
});

// ============================================================
// PROJECTS — public read, admin-only write
// ============================================================
app.get('/api/projects', (req, res) => {
  const projects = readJSON(PROJECTS_FILE);
  res.json(projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/admin/projects', requireAdmin, uploadProjectMedia, (req, res) => {
  const { name, type, location, description, size, status, featured } = req.body;
  if (!name || !location) {
    return res.status(400).json({ error: 'Project name and location are required.' });
  }
  const photoFile = req.files && req.files.photo ? req.files.photo[0] : null;
  const videoFile = req.files && req.files.video ? req.files.video[0] : null;

  const projects = readJSON(PROJECTS_FILE);
  const newProject = {
    id: Date.now(),
    name: String(name).trim(),
    type: type || 'Residential',
    location: String(location).trim(),
    description: description ? String(description).trim() : '',
    size: size ? String(size).trim() : '',
    status: status || 'Booking Open',
    image: photoFile ? 'images/uploads/' + photoFile.filename : '',
    video: videoFile ? 'videos/uploads/' + videoFile.filename : '',
    featured: featured === 'true' || featured === true,
    createdAt: new Date().toISOString()
  };
  projects.push(newProject);
  writeJSON(PROJECTS_FILE, projects);
  res.status(201).json({ success: true, project: newProject });
});

app.put('/api/admin/projects/:id', requireAdmin, uploadProjectMedia, (req, res) => {
  const id = Number(req.params.id);
  const projects = readJSON(PROJECTS_FILE);
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Project not found.' });

  const { name, type, location, description, size, status, featured } = req.body;
  const existing = projects[idx];
  const photoFile = req.files && req.files.photo ? req.files.photo[0] : null;
  const videoFile = req.files && req.files.video ? req.files.video[0] : null;

  if (photoFile) {
    if (existing.image && existing.image.startsWith('images/uploads/')) {
      const oldPath = path.join(__dirname, 'public', existing.image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    existing.image = 'images/uploads/' + photoFile.filename;
  }

  if (videoFile) {
    if (existing.video && existing.video.startsWith('videos/uploads/')) {
      const oldVideoPath = path.join(__dirname, 'public', existing.video);
      if (fs.existsSync(oldVideoPath)) fs.unlinkSync(oldVideoPath);
    }
    existing.video = 'videos/uploads/' + videoFile.filename;
  }

  existing.name = name ?? existing.name;
  existing.type = type ?? existing.type;
  existing.location = location ?? existing.location;
  existing.description = description ?? existing.description;
  existing.size = size ?? existing.size;
  existing.status = status ?? existing.status;
  if (featured !== undefined) existing.featured = featured === 'true' || featured === true;

  projects[idx] = existing;
  writeJSON(PROJECTS_FILE, projects);
  res.json({ success: true, project: existing });
});

app.delete('/api/admin/projects/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const projects = readJSON(PROJECTS_FILE);
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Project not found.' });

  const [removed] = projects.splice(idx, 1);
  if (removed.image && removed.image.startsWith('images/uploads/')) {
    const imgPath = path.join(__dirname, 'public', removed.image);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }
  if (removed.video && removed.video.startsWith('videos/uploads/')) {
    const vidPath = path.join(__dirname, 'public', removed.video);
    if (fs.existsSync(vidPath)) fs.unlinkSync(vidPath);
  }
  writeJSON(PROJECTS_FILE, projects);
  res.json({ success: true });
});

// ============================================================
// SERVICES — public read, admin-only write
// ============================================================
app.get('/api/services', (req, res) => {
  const services = readJSON(SERVICES_FILE);
  res.json(services.sort((a, b) => (a.order || 0) - (b.order || 0)));
});

app.post('/api/admin/services', requireAdmin, (req, res) => {
  const { title, description, featured } = req.body;
  if (!title) return res.status(400).json({ error: 'Service title is required.' });

  const services = readJSON(SERVICES_FILE);
  const newService = {
    id: Date.now(),
    title: String(title).trim(),
    description: description ? String(description).trim() : '',
    featured: featured === true || featured === 'true',
    order: services.length ? Math.max(...services.map(s => s.order || 0)) + 1 : 1
  };
  services.push(newService);
  writeJSON(SERVICES_FILE, services);
  res.status(201).json({ success: true, service: newService });
});

app.put('/api/admin/services/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const services = readJSON(SERVICES_FILE);
  const idx = services.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Service not found.' });

  const { title, description, featured } = req.body;
  const existing = services[idx];
  existing.title = title ?? existing.title;
  existing.description = description ?? existing.description;
  if (featured !== undefined) existing.featured = featured === true || featured === 'true';

  services[idx] = existing;
  writeJSON(SERVICES_FILE, services);
  res.json({ success: true, service: existing });
});

app.delete('/api/admin/services/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const services = readJSON(SERVICES_FILE);
  const idx = services.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Service not found.' });
  services.splice(idx, 1);
  writeJSON(SERVICES_FILE, services);
  res.json({ success: true });
});

// ============================================================
// TESTIMONIALS / CLIENT FEEDBACK
// Public can submit feedback (goes in as "pending").
// Only "approved" testimonials show on the public website.
// Admin can view all, approve, edit or delete.
// ============================================================
app.get('/api/testimonials', (req, res) => {
  const all = readJSON(TESTIMONIALS_FILE);
  const approved = all.filter(t => t.status === 'approved');
  res.json(approved.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// Public: a client submits feedback from the website
app.post('/api/testimonials', (req, res) => {
  const { name, role, quote } = req.body;
  if (!name || !quote) {
    return res.status(400).json({ error: 'Name and feedback message are required.' });
  }
  const testimonials = readJSON(TESTIMONIALS_FILE);
  const newTestimonial = {
    id: Date.now(),
    name: String(name).trim(),
    role: role ? String(role).trim() : '',
    quote: String(quote).trim(),
    status: 'pending', // waits for admin approval before it appears publicly
    createdAt: new Date().toISOString()
  };
  testimonials.push(newTestimonial);
  writeJSON(TESTIMONIALS_FILE, testimonials);
  res.status(201).json({ success: true, message: 'Thank you! Your feedback has been submitted for review.' });
});

// Admin: view all feedback, including pending
app.get('/api/admin/testimonials', requireAdmin, (req, res) => {
  const all = readJSON(TESTIMONIALS_FILE);
  res.json(all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// Admin: approve / edit a testimonial (e.g. change status, fix typos)
app.put('/api/admin/testimonials/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const testimonials = readJSON(TESTIMONIALS_FILE);
  const idx = testimonials.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Feedback not found.' });

  const { name, role, quote, status } = req.body;
  const existing = testimonials[idx];
  existing.name = name ?? existing.name;
  existing.role = role ?? existing.role;
  existing.quote = quote ?? existing.quote;
  if (status && ['approved', 'pending', 'rejected'].includes(status)) existing.status = status;

  testimonials[idx] = existing;
  writeJSON(TESTIMONIALS_FILE, testimonials);
  res.json({ success: true, testimonial: existing });
});

app.delete('/api/admin/testimonials/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const testimonials = readJSON(TESTIMONIALS_FILE);
  const idx = testimonials.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Feedback not found.' });
  testimonials.splice(idx, 1);
  writeJSON(TESTIMONIALS_FILE, testimonials);
  res.json({ success: true });
});

// ============================================================
// TEAM — public read, admin-only write
// ============================================================
app.get('/api/team', (req, res) => {
  res.json(readJSON(TEAM_FILE));
});

app.post('/api/admin/team', requireAdmin, uploadBrandAndTeam.single('photo'), (req, res) => {
  const { name, position, description } = req.body;
  if (!name || !position) return res.status(400).json({ error: 'Name and position are required.' });
  const team = readJSON(TEAM_FILE);
  const photo = req.file;
  const member = {
    id: Date.now(),
    name: String(name).trim(),
    position: String(position).trim(),
    description: description ? String(description).trim() : '',
    image: photo ? 'images/uploads/' + photo.filename : ''
  };
  team.push(member);
  writeJSON(TEAM_FILE, team);
  res.status(201).json({ success: true, member });
});

app.put('/api/admin/team/:id', requireAdmin, uploadBrandAndTeam.single('photo'), (req, res) => {
  const id = Number(req.params.id);
  const team = readJSON(TEAM_FILE);
  const idx = team.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Team member not found.' });
  const existing = team[idx];
  if (req.file) {
    if (existing.image && existing.image.startsWith('images/uploads/')) {
      const oldPath = path.join(__dirname, 'public', existing.image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    existing.image = 'images/uploads/' + req.file.filename;
  }
  existing.name = req.body.name ?? existing.name;
  existing.position = req.body.position ?? existing.position;
  existing.description = req.body.description ?? existing.description;
  writeJSON(TEAM_FILE, team);
  res.json({ success: true, member: existing });
});

app.delete('/api/admin/team/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const team = readJSON(TEAM_FILE);
  const idx = team.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Team member not found.' });
  const [removed] = team.splice(idx, 1);
  if (removed.image && removed.image.startsWith('images/uploads/')) {
    const imgPath = path.join(__dirname, 'public', removed.image);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }
  writeJSON(TEAM_FILE, team);
  res.json({ success: true });
});

// ============================================================
// COMPANY LOGO — admin-only upload
// ============================================================
app.post('/api/admin/logo', requireAdmin, uploadBrandAndTeam.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Please select a logo image.' });
  const current = readObjectJSON(SETTINGS_FILE);
  if (current.logo && current.logo.startsWith('images/uploads/')) {
    const oldPath = path.join(__dirname, 'public', current.logo);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  current.logo = 'images/uploads/' + req.file.filename;
  writeJSON(SETTINGS_FILE, current);
  res.json({ success: true, logo: current.logo });
});

app.delete('/api/admin/logo', requireAdmin, (req, res) => {
  const current = readObjectJSON(SETTINGS_FILE);
  if (current.logo && current.logo.startsWith('images/uploads/')) {
    const oldPath = path.join(__dirname, 'public', current.logo);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  current.logo = '';
  writeJSON(SETTINGS_FILE, current);
  res.json({ success: true });
});

// ============================================================
// SITE SETTINGS — phone, email, address, office hours
// public read, admin-only write
// ============================================================
app.get('/api/settings', (req, res) => {
  res.json(readObjectJSON(SETTINGS_FILE));
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const current = readObjectJSON(SETTINGS_FILE);
  const allowedFields = [
    'phone1', 'phone2', 'email1', 'email2',
    'addressLine1', 'addressLine2', 'hoursLine1', 'hoursLine2', 'whatsapp',
    'heroHeading', 'heroParagraph',
    'statYears', 'statYearsLabel', 'statProjects', 'statProjectsLabel',
    'statClients', 'statClientsLabel', 'statCities', 'statCitiesLabel',
    'aboutStoryTitle', 'aboutStory1', 'aboutStory2', 'missionTitle', 'missionText',
    'visionTitle', 'visionText', 'whyTitle', 'why1Title', 'why1Text', 'why2Title', 'why2Text', 'why3Title', 'why3Text'
  ];
  allowedFields.forEach(function (field) {
    if (req.body[field] !== undefined) {
      current[field] = String(req.body[field]).trim();
    }
  });
  writeJSON(SETTINGS_FILE, current);
  res.json({ success: true, settings: current });
});

// ---------- Multer error handling ----------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || (err.message && (err.message.includes('Photo must be') || err.message.includes('Video must be')))) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// ---------- Fallback: send index.html for any unknown non-API route ----------
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- Start server ----------
(async () => {
  initFirebase();
  await initialiseFirestoreData();

  app.listen(PORT, '0.0.0.0', () => {
    console.log("Nawab Marketing server running on port ${PORT}");
    console.log("Admin panel: http://localhost:${PORT}/admin.html");
    console.log('Data source: Firestore (local JSON kept as fallback/cache).');
  });
})().catch(err => {
  console.error('Startup failed:', err);
  process.exit(1);
});