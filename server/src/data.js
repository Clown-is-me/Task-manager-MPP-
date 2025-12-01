const { v4: uuidv4 } = require('uuid');
const users = []; // { id, username, password(hashed), createdAt }
let userIdCounter = 1;

let tasks = []; // { id, title, dueDate, attachment, completed, createdAt, userId }

module.exports = {
  users,
  tasks,
  getNextUserId: () => userIdCounter++,
  makeTaskId: () => uuidv4(),
};
