// server/src/app.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { PORT } = require('./config');

const authRoutes = require('./routes/auth');
const tasksRoutes = require('./routes/tasks');
const createApolloServer = require('./graphql');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true
  }
});

// In-memory storage moved to data.js and shared
const { tasks } = require('./data');

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../client')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes (REST)
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);

// Serve login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/login.html'));
});

// Serve main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/index.html'));
});

// Socket.IO authentication middleware (остается без изменений)
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.match(/jwt=([^;]+)/)?.[1];

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('./config');
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

// Socket.IO connection handling (остается)
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log(`User ${socket.username} connected`);
  connectedUsers.set(socket.userId, socket);

  // Send current tasks to the connected user
  const userTasks = tasks.filter(task => task.userId === socket.userId);
  socket.emit('tasks:list', userTasks);

  // Create new task
  socket.on('tasks:create', (taskData) => {
    try {
      const { title, dueDate } = taskData;

      if (!title || title.trim() === '') {
        return socket.emit('error', { message: 'Название задачи обязательно' });
      }

      const newTask = {
        id: require('uuid').v4(),
        title: title.trim(),
        dueDate: dueDate || null,
        attachment: null,
        completed: false,
        createdAt: new Date().toISOString(),
        userId: socket.userId
      };

      tasks.push(newTask);

      // Notify only the concerned user
      socket.emit('tasks:created', newTask);
      socket.emit('tasks:list', tasks.filter(task => task.userId === socket.userId));
    } catch (error) {
      socket.emit('error', { message: 'Ошибка при создании задачи' });
    }
  });

  // Toggle task completion
  socket.on('tasks:toggle', (taskId) => {
    const task = tasks.find(t => t.id === taskId && t.userId === socket.userId);

    if (!task) {
      return socket.emit('error', { message: 'Задача не найдена' });
    }

    task.completed = !task.completed;
    socket.emit('tasks:toggled', task);
    socket.emit('tasks:list', tasks.filter(task => task.userId === socket.userId));
  });

  // Delete task
  socket.on('tasks:delete', (taskId) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId && t.userId === socket.userId);

    if (taskIndex === -1) {
      return socket.emit('error', { message: 'Задача не найдена' });
    }

    tasks.splice(taskIndex, 1);
    socket.emit('tasks:deleted', taskId);
    socket.emit('tasks:list', tasks.filter(task => task.userId === socket.userId));
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.username} disconnected`);
    connectedUsers.delete(socket.userId);
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Initialize GraphQL (Apollo) and then start server
(async () => {
  try {
    await createApolloServer(app);
    const expressPlayground = require('graphql-playground-middleware-express').default;
    app.get('/playground', expressPlayground({ endpoint: '/graphql' }));

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
      console.log(`GraphQL Playground: http://localhost:${PORT}/playground`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
})();

