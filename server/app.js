require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// ────────────────────────────────────────────────
// Middlewares
// ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

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
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema, 'users');  // fuerza el nombre de la colección

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: String,
  createdBy: { type: String, required: true }, // username o _id
  createdAt: { type: Date, default: Date.now }
});
const Project = mongoose.model('Project', ProjectSchema, 'projects');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: String,
  status: { type: String, default: 'Pendiente' },
  priority: { type: String, default: 'Media' },
  projectId: mongoose.Schema.Types.ObjectId,
  assignedTo: String, // username por simplicidad
  dueDate: Date,
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Task = mongoose.model('Task', TaskSchema, 'tasks');

const CommentSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, required: true },
  user: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', CommentSchema, 'comments');

const HistorySchema = new mongoose.Schema({
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
  user: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' },
  read: { type: Boolean, default: false },
  link: String,
  createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', NotificationSchema, 'notifications');

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
    { username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user: { username: user.username, role: user.role } });
});

// Crear tarea (ejemplo completo)
app.post('/api/tasks', auth, async (req, res) => {
  try {
    const task = new Task({
      ...req.body,
      createdBy: req.user.username
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

// ────────────────────────────────────────────────
// Iniciar servidor
// ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log('Listo para recibir peticiones → MongoDB conectado');
});