class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.socket = null;
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        this.setupTabSwitching();
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.isAuthenticated = true;
                this.currentUser = data.user;
                this.initializeSocket();
                this.redirectToApp();
            } else {
                this.showAuthPage();
            }
        } catch (error) {
            console.error('Auth check error:', error);
            this.showAuthPage();
        }
    }

    initializeSocket() {
        if (this.socket) {
            this.socket.disconnect();
        }

        this.socket = io({
            auth: {
                token: this.getCookie('jwt')
            }
        });

        this.socket.on('connect', () => {
            console.log('WebSocket connected');
        });

        this.socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
        });

        this.socket.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.showMessage(error.message, 'error');
        });
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    async register(username, password) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                this.isAuthenticated = true;
                this.currentUser = data.user;
                this.showMessage('Регистрация успешна!', 'success');
                setTimeout(() => this.redirectToApp(), 1000);
            } else {
                this.showMessage(data.error, 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showMessage('Ошибка соединения', 'error');
        }
    }

    async login(username, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                this.isAuthenticated = true;
                this.currentUser = data.user;
                this.redirectToApp();
            } else {
                this.showMessage(data.error, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('Ошибка соединения', 'error');
        }
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.isAuthenticated = false;
            this.currentUser = null;
            window.location.href = '/login';
        }
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    setupTabSwitching() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const authForms = document.querySelectorAll('.auth-form');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                
                // Update active tab
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show corresponding form
                authForms.forEach(form => {
                    form.classList.remove('active');
                    if (form.getAttribute('data-form') === tabName) {
                        form.classList.add('active');
                    }
                });

                // Clear message
                this.showMessage('', '');
            });
        });
    }

    handleLogin() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            this.showMessage('Заполните все поля', 'error');
            return;
        }

        this.login(username, password);
    }

    handleRegister() {
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;

        if (!username || !password) {
            this.showMessage('Заполните все поля', 'error');
            return;
        }

        if (username.length < 3) {
            this.showMessage('Логин должен быть не менее 3 символов', 'error');
            return;
        }

        if (password.length < 6) {
            this.showMessage('Пароль должен быть не менее 6 символов', 'error');
            return;
        }

        this.register(username, password);
    }

    showMessage(message, type = 'info') {
        const messageEl = document.getElementById('authMessage');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `message ${type}`;
            messageEl.style.display = message ? 'block' : 'none';
        }
    }

    redirectToApp() {
        if (window.location.pathname !== '/') {
            window.location.href = '/';
        }
    }

    showAuthPage() {
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }

    async fetchWithAuth(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            credentials: 'include'
        });

        if (response.status === 401) {
            this.logout();
            throw new Error('Authentication required');
        }

        return response;
    }
}

// Initialize auth manager
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});