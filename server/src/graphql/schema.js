// server/src/graphql/schema.js
const { gql } = require('apollo-server-express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { users, tasks, makeTaskId, getNextUserId } = require('../data');

// GraphQL schema
const typeDefs = gql`
  type User {
    id: ID!
    username: String!
    createdAt: String
  }

  type Task {
    id: ID!
    title: String!
    dueDate: String
    attachment: String
    completed: Boolean!
    createdAt: String!
    userId: ID!
  }

  type AuthPayload {
    user: User!
    message: String
  }

  type Query {
    me: User
    tasks: [Task!]!
    task(id: ID!): Task
  }

  type Mutation {
    register(username: String!, password: String!): AuthPayload!
    login(username: String!, password: String!): AuthPayload!
    logout: Boolean!
    createTask(title: String!, dueDate: String): Task!
    toggleTask(id: ID!): Task!
    deleteTask(id: ID!): Boolean!
  }
`;

// Resolvers
const resolvers = {
  Query: {
    me: (_, __, { user }) => {
      if (!user) throw new Error('UNAUTHENTICATED');
      const found = users.find(u => u.id === user.userId);
      if (!found) return null;
      return { id: found.id, username: found.username, createdAt: found.createdAt };
    },

    tasks: (_, __, { user }) => {
      if (!user) throw new Error('UNAUTHENTICATED');
      return tasks.filter(t => t.userId === user.userId);
    },

    task: (_, { id }, { user }) => {
      if (!user) throw new Error('UNAUTHENTICATED');
      return tasks.find(t => t.id === id && t.userId === user.userId) || null;
    }
  },

  Mutation: {
    register: async (_, { username, password }, { res }) => {
      if (!username || !password) throw new Error('INVALID_INPUT');
      if (username.length < 3) throw new Error('USERNAME_TOO_SHORT');
      if (password.length < 6) throw new Error('PASSWORD_TOO_SHORT');

      const existing = users.find(u => u.username === username);
      if (existing) throw new Error('USER_EXISTS');

      const hashed = await bcrypt.hash(password, 10);
      const newUser = {
        id: getNextUserId(),
        username,
        password: hashed,
        createdAt: new Date().toISOString()
      };
      users.push(newUser);

      const token = jwt.sign({ userId: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '24h' });
      // set httponly cookie via express response object available in context
      if (res && res.cookie) {
        res.cookie('jwt', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000
        });
      }

      return { user: { id: newUser.id, username: newUser.username, createdAt: newUser.createdAt }, message: 'Регистрация успешна' };
    },

    login: async (_, { username, password }, { res }) => {
      if (!username || !password) throw new Error('INVALID_INPUT');

      const user = users.find(u => u.username === username);
      if (!user) throw new Error('INVALID_CREDENTIALS');

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) throw new Error('INVALID_CREDENTIALS');

      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
      if (res && res.cookie) {
        res.cookie('jwt', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000
        });
      }

      return { user: { id: user.id, username: user.username, createdAt: user.createdAt }, message: 'Аутентификация успешна' };
    },

    logout: (_, __, { res }) => {
      if (res && res.clearCookie) {
        res.clearCookie('jwt');
      }
      return true;
    },

    createTask: (_, { title, dueDate }, { user }) => {
      if (!user) throw new Error('UNAUTHENTICATED');
      if (!title || title.trim() === '') throw new Error('TITLE_REQUIRED');

      const newTask = {
        id: makeTaskId(),
        title: title.trim(),
        dueDate: dueDate || null,
        attachment: null,
        completed: false,
        createdAt: new Date().toISOString(),
        userId: user.userId
      };

      tasks.push(newTask);
      return newTask;
    },

    toggleTask: (_, { id }, { user }) => {
      if (!user) throw new Error('UNAUTHENTICATED');
      const task = tasks.find(t => t.id === id && t.userId === user.userId);
      if (!task) throw new Error('TASK_NOT_FOUND');
      task.completed = !task.completed;
      return task;
    },

    deleteTask: (_, { id }, { user }) => {
      if (!user) throw new Error('UNAUTHENTICATED');
      const idx = tasks.findIndex(t => t.id === id && t.userId === user.userId);
      if (idx === -1) throw new Error('TASK_NOT_FOUND');
      tasks.splice(idx, 1);
      return true;
    }
  }
};

module.exports = { typeDefs, resolvers };
