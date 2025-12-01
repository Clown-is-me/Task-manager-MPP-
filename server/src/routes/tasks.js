// server/src/routes/tasks.js
const express = require('express');
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');
const { tasks } = require('../data');
const router = express.Router();

// All task routes require authentication
router.use(authenticateToken);

// GET Get all tasks for current user
router.get('/', (req, res) => {
  const userTasks = tasks.filter(task => task.userId === req.user.userId);
  res.json(userTasks);
});

// POST Create new task
router.post('/', upload.single('attachment'), (req, res) => {
  try {
    const { title, dueDate } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Название задачи обязательно' });
    }

    const { v4: uuidv4 } = require('uuid');

    const newTask = {
      id: uuidv4(),
      title: title.trim(),
      dueDate: dueDate || null,
      attachment: req.file ? req.file.filename : null,
      completed: false,
      createdAt: new Date().toISOString(),
      userId: req.user.userId
    };

    tasks.push(newTask);
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Ошибка при создании задачи' });
  }
});

// PUT Toggle task completion
router.put('/:id/toggle', (req, res) => {
  const taskId = req.params.id;
  const task = tasks.find(t => t.id === taskId && t.userId === req.user.userId);

  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена' });
  }

  task.completed = !task.completed;
  res.json(task);
});

// DELETE Delete task
router.delete('/:id', (req, res) => {
  const taskId = req.params.id;
  const taskIndex = tasks.findIndex(t => t.id === taskId && t.userId === req.user.userId);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Задача не найдена' });
  }

  tasks.splice(taskIndex, 1);
  res.status(204).send();
});

module.exports = router;
