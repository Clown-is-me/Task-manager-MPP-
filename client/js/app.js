class TaskManager {
     constructor() {
        this.tasks = [];
        this.socket = window.authManager.socket;
        this.init();
        this.setupVisualFeedback();
    }

    setupVisualFeedback() {
        // Анимация при добавлении задачи
        const taskForm = document.getElementById('taskForm');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                const submitBtn = taskForm.querySelector('button[type="submit"]');
                submitBtn.textContent = 'Добавлено!';
                setTimeout(() => {
                    submitBtn.textContent = 'Добавить';
                }, 1000);
            });
        }
    }

    async init() {
        console.log('TaskManager init started');
        
        if (!window.authManager.isAuthenticated) {
            console.log('User not authenticated');
            return;
        }

        console.log('User authenticated, setting up WebSocket listeners...');
        this.setupSocketListeners();
        this.setupEventListeners();
    }

    setupSocketListeners() {
        // Receive tasks list
        this.socket.on('tasks:list', (tasks) => {
            console.log('Tasks received:', tasks);
            this.tasks = tasks;
            this.renderTasks();
        });

        // Task created
        this.socket.on('tasks:created', (task) => {
            console.log('Task created:', task);
            this.tasks.push(task);
            this.renderTasks();
        });

        // Task toggled
        this.socket.on('tasks:toggled', (task) => {
            const index = this.tasks.findIndex(t => t.id === task.id);
            if (index !== -1) {
                this.tasks[index] = task;
                this.renderTasks();
            }
        });

        // Task deleted
        this.socket.on('tasks:deleted', (taskId) => {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.renderTasks();
        });

        // Error handling
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            alert('Ошибка: ' + error.message);
        });
    }

    async loadTasks() {
        try {
            console.log('Loading tasks...');
            const response = await window.authManager.fetchWithAuth('/api/tasks');
            console.log('Tasks response status:', response.status);
            
            if (response.ok) {
                this.tasks = await response.json();
                console.log('Tasks loaded:', this.tasks);
                this.renderTasks();
            } else {
                console.error('Failed to load tasks:', response.status);
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            if (error.message === 'Authentication required') {
                window.authManager.logout();
            }
        }
    }

    setupEventListeners() {
        const taskForm = document.getElementById('taskForm');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addTask();
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => window.authManager.logout());
        }
    }


    addTask() {
        const titleInput = document.getElementById('taskTitle');
        const dueDateInput = document.getElementById('taskDueDate');
        const fileInput = document.getElementById('taskAttachment');

        const title = titleInput.value.trim();
        if (!title) {
            alert('Введите название задачи');
            return;
        }

        const taskData = {
            title: title,
            dueDate: dueDateInput.value || null
        };

        console.log('Creating task:', taskData);
        this.socket.emit('tasks:create', taskData);

        // Clear form
        titleInput.value = '';
        dueDateInput.value = '';
        fileInput.value = '';
    }

    toggleTask(taskId) {
        console.log('Toggling task:', taskId);
        this.socket.emit('tasks:toggle', taskId);
    }

    deleteTask(taskId) {
        if (!confirm('Вы уверены, что хотите удалить задачу?')) {
            return;
        }
        console.log('Deleting task:', taskId);
        this.socket.emit('tasks:delete', taskId);
    }

    renderTasks() {
        console.log('Rendering tasks:', this.tasks);
        this.renderTaskList('allTasks', this.tasks);
        this.renderTaskList('activeTasks', this.tasks.filter(task => !task.completed));
        this.renderTaskList('completedTasks', this.tasks.filter(task => task.completed));
    }

    renderTaskList(containerId, tasks) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }
        
        container.innerHTML = '';

        if (tasks.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'Нет задач';
            container.appendChild(emptyMessage);
            return;
        }

        tasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            container.appendChild(taskElement);
        });
    }

    createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;

        // Checkbox container
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'checkbox-container';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => this.toggleTask(task.id));
        checkboxContainer.appendChild(checkbox);

        // Status marker
        const statusMarker = document.createElement('div');
        statusMarker.className = `status-marker ${task.completed ? 'marker-completed' : 'marker-active'}`;

        // Task content
        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';
        
        const title = document.createElement('h3');
        title.textContent = task.title;
        taskContent.appendChild(title);

        if (task.dueDate) {
            const dateSpan = document.createElement('span');
            dateSpan.className = 'task-date';
            dateSpan.textContent = 'Дата: ' + new Date(task.dueDate).toLocaleDateString('ru-RU');
            taskContent.appendChild(dateSpan);
        }

        if (task.attachment) {
            const attachmentLink = document.createElement('a');
            attachmentLink.href = `/uploads/${task.attachment}`;
            attachmentLink.target = '_blank';
            attachmentLink.className = 'task-attachment';
            attachmentLink.textContent = '📎 Файл';
            taskContent.appendChild(attachmentLink);
        }

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Удалить';
        deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

        const actions = document.createElement('div');
        actions.className = 'task-actions';
        actions.appendChild(deleteBtn);

        // Собираем всё вместе
        li.appendChild(checkboxContainer);
        li.appendChild(statusMarker);
        li.appendChild(taskContent);
        li.appendChild(actions);

        return li;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    
    // Initialize auth manager first
    window.authManager = new AuthManager();
    
    // Then initialize task manager after auth check
    setTimeout(() => {
        if (window.authManager.isAuthenticated && window.authManager.socket) {
            new TaskManager();
        }
    }, 100);
});