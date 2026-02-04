require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ────────────────────────────────────────────────
// Middlewares
// ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, '..')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/create-rule', (req, res) => {
  res.send('OK');
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext && ext.length <= 5 ? ext : '';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Solo se permiten imágenes'));
  }
});

// ────────────────────────────────────────────────
// Conexión a MongoDB Atlas
// ────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI, {
  dbName: 'conection'
})
.then(() => {
  console.log('MongoDB conectado correctamente');
})
.catch((error) => {
  console.error('Error MongoDB:', error.message);
  process.exit(1);
});

// ────────────────────────────────────────────────
// Modelos (uno por cada colección)
// ────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  numero: { type: Number, unique: true },
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  permisos: { type: Boolean, default: false },
  displayName: { type: String, trim: true },
  photoUrl: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema, 'users');  // fuerza el nombre de la colección

const ProjectSchema = new mongoose.Schema({
  numero: { type: Number, unique: true },
  name: { type: String, required: true, trim: true },
  description: String,
  createdBy: { type: String, required: true }, // username o _id
  createdAt: { type: Date, default: Date.now }
});
const Project = mongoose.model('Project', ProjectSchema, 'projects');

const TaskSchema = new mongoose.Schema({
  numero: { type: Number, unique: true },
  title: { type: String, required: true, trim: true },
  description: String,
  status: { type: String, default: 'Pendiente' },
  priority: { type: String, default: 'Media' },
  projectId: String,
  assignedTo: String, // username por simplicidad
  dueDate: Date,
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Task = mongoose.model('Task', TaskSchema, 'tasks');

const CommentSchema = new mongoose.Schema({
  numero: { type: Number, unique: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, required: true },
  user: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', CommentSchema, 'comments');

const HistorySchema = new mongoose.Schema({
  numero: { type: Number, unique: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, required: true },
  user: { type: String, required: true },
  action: { type: String, required: true },
  field: String,
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});
const History = mongoose.model('History', HistorySchema, 'history');

const NotificationSchema = new mongoose.Schema({
  numero: { type: Number, unique: true },
  user: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' },
  read: { type: Boolean, default: false },
  link: String,
  createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', NotificationSchema, 'notifications');

const CounterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', CounterSchema, 'counters');

async function backfillNumeroForProjects() {
  const maxDoc = await Project.findOne({ numero: { $ne: null } })
    .sort({ numero: -1 })
    .select('numero');
  let next = maxDoc && maxDoc.numero ? maxDoc.numero + 1 : 1;
  const missing = await Project.find({ numero: { $exists: false } }).sort({ createdAt: 1 });
  if (!missing.length) return;
  const ops = missing.map((doc) => ({
    updateOne: {
      filter: { _id: doc._id },
      update: { $set: { numero: next++ } }
    }
  }));
  await Project.bulkWrite(ops);
}

mongoose.connection.once('open', async () => {
  try {
    await User.updateMany(
      { $or: [{ username: 'admin' }, { role: 'admin' }], permisos: { $ne: true } },
      { $set: { permisos: true } }
    );
    await backfillNumeroForProjects();
  } catch (err) {
    console.error('Error al asignar numeros a proyectos:', err.message);
  }
});

// ────────────────────────────────────────────────
// Middleware de autenticación simple (JWT)
// ────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.permisos) {
    return res.status(403).json({ error: 'Solo admin' });
  }
  next();
};

// ────────────────────────────────────────────────
// Rutas de ejemplo (solo auth y tasks por ahora)
// Puedes copiar el patrón para las demás
// ────────────────────────────────────────────────

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign(
    { username: user.username, role: user.role, permisos: user.permisos === true },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      username: user.username,
      role: user.role,
      permisos: user.permisos === true,
      displayName: user.displayName || '',
      photoUrl: user.photoUrl || ''
    }
  });
});

// Perfil (ver / actualizar)
app.get('/api/profile', auth, async (req, res) => {
  const user = await User.findOne({ username: req.user.username }, { password: 0 });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({
    username: user.username,
    permisos: user.permisos === true,
    displayName: user.displayName || '',
    photoUrl: user.photoUrl || ''
  });
});

app.put('/api/profile', auth, upload.single('photo'), async (req, res) => {
  try {
    const { displayName } = req.body || {};
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const user = await User.findOneAndUpdate(
      { username: req.user.username },
      {
        $set: {
          displayName: (displayName || '').trim(),
          ...(photoUrl ? { photoUrl } : {})
        }
      },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({
      username: user.username,
      permisos: user.permisos === true,
      displayName: user.displayName || '',
      photoUrl: user.photoUrl || ''
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Inicializar admin por defecto (si no existe)
app.get('/api/init', async (req, res) => {
  const admin = await User.findOne({ username: 'admin' });
  if (!admin) {
    const hashed = await bcrypt.hash('admin', 10);
    const counter = await Counter.findOneAndUpdate(
      { name: 'users' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    await User.create({ numero: counter.seq, username: 'admin', password: hashed, role: 'admin', permisos: true });
    return res.json({ message: 'Admin creado' });
  }
  res.json({ message: 'Admin ya existe' });
});

// Usuarios (admin registra / lista)
app.get('/api/users', auth, async (req, res) => {
  const users = await User.find({}, { username: 1, role: 1, numero: 1 }).sort({ username: 1 });
  res.json(users);
});

app.post('/api/users', auth, requireAdmin, async (req, res) => {
  try {
    const { username, password, role = 'user' } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Usuario ya existe' });
    const counter = await Counter.findOneAndUpdate(
      { name: 'users' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ numero: counter.seq, username, password: hashed, role, permisos: false });
    await user.save();
    res.status(201).json({ numero: user.numero, username: user.username, role: user.role });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Cambiar contraseña (solo admin)
app.put('/api/users/:username/password', auth, requireAdmin, async (req, res) => {
  try {
    const { username } = req.params;
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Proyectos
app.get('/api/projects', auth, async (req, res) => {
  const projects = await Project.find({ createdBy: req.user.username }).sort({ createdAt: -1 });
  res.json(projects);
});

app.post('/api/projects', auth, async (req, res) => {
  try {
    const counter = await Counter.findOneAndUpdate(
      { name: 'projects' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const project = new Project({
      ...req.body,
      createdBy: req.user.username,
      numero: counter.seq
    });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/projects/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.username },
      req.body,
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ error: 'Proyecto no encontrado o no autorizado' });
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', auth, async (req, res) => {
  const project = await Project.findOneAndDelete({ _id: req.params.id, createdBy: req.user.username });
  if (!project) return res.status(404).json({ error: 'No encontrado o no autorizado' });
  res.json({ message: 'Eliminado' });
});

// Crear tarea (ejemplo completo)
app.post('/api/tasks', auth, async (req, res) => {
  try {
    const counter = await Counter.findOneAndUpdate(
      { name: 'tasks' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const task = new Task({
      ...req.body,
      createdBy: req.user.username,
      numero: counter.seq
    });
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Listar tareas del usuario logueado
app.get('/api/tasks', auth, async (req, res) => {
  const tasks = await Task.find({ createdBy: req.user.username }).sort({ createdAt: -1 });
  res.json(tasks);
});

// Actualizar tarea (solo si es del usuario)
app.put('/api/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.username },
      req.body,
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada o no autorizada' });
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Eliminar tarea
app.delete('/api/tasks/:id', auth, async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, createdBy: req.user.username });
  if (!task) return res.status(404).json({ error: 'No encontrada o no autorizada' });
  res.json({ message: 'Eliminada' });
});

// Comentarios
app.get('/api/comments', auth, async (req, res) => {
  const taskId = req.query.taskId;
  const query = taskId ? { taskId } : { user: req.user.username };
  const comments = await Comment.find(query).sort({ createdAt: -1 });
  res.json(comments);
});

app.post('/api/comments', auth, async (req, res) => {
  try {
    const { taskId, content } = req.body;
    const counter = await Counter.findOneAndUpdate(
      { name: 'comments' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const comment = new Comment({
      taskId,
      content,
      user: req.user.username,
      numero: counter.seq
    });
    await comment.save();
    res.status(201).json(comment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Historial
app.get('/api/history', auth, async (req, res) => {
  const taskId = req.query.taskId;
  const query = taskId ? { taskId } : { user: req.user.username };
  const history = await History.find(query).sort({ createdAt: -1 });
  res.json(history);
});

app.post('/api/history', auth, async (req, res) => {
  try {
    const { taskId, action, field, oldValue, newValue } = req.body;
    const counter = await Counter.findOneAndUpdate(
      { name: 'history' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const entry = new History({
      taskId,
      action,
      field,
      oldValue,
      newValue,
      user: req.user.username,
      numero: counter.seq
    });
    await entry.save();
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Notificaciones
app.get('/api/notifications', auth, async (req, res) => {
  const notifications = await Notification.find({ user: req.user.username }).sort({ createdAt: -1 });
  res.json(notifications);
});

app.post('/api/notifications', auth, async (req, res) => {
  try {
    const { user, message, type = 'info', link } = req.body;
    const counter = await Counter.findOneAndUpdate(
      { name: 'notifications' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const notif = new Notification({ user, message, type, link, numero: counter.seq });
    await notif.save();
    res.status(201).json(notif);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/notifications/read-all', auth, async (req, res) => {
  await Notification.updateMany({ user: req.user.username }, { $set: { read: true } });
  res.json({ message: 'Notificaciones marcadas' });
});

// ────────────────────────────────────────────────
// Iniciar servidor
// ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log('Listo para recibir peticiones → MongoDB conectado');
});