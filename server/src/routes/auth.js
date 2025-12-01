// server/src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { users, getNextUserId } = require('../data');

const router = express.Router();

// POST User registration
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Логин должен быть не менее 3 символов' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }

    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: getNextUserId(),
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      message: 'Регистрация успешна',
      user: { id: newUser.id, username: newUser.username }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST User login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      message: 'Аутентификация успешна',
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST User logout
router.post('/logout', (req, res) => {
  res.clearCookie('jwt');
  res.json({ message: 'Выход выполнен успешно' });
});

// GET Get current user info
router.get('/me', (req, res) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.status(401).json({ error: 'Не аутентифицирован' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: { id: decoded.userId, username: decoded.username } });
  } catch (error) {
    res.status(401).json({ error: 'Недействительный токен' });
  }
});

module.exports = router;
