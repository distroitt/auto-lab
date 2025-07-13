import { showNotification } from './notification.js';

document.addEventListener('DOMContentLoaded', () => {
    const workButton = document.getElementById("work-btn");
    const loginBtn = document.getElementById('loginBtn');
    const profileBtn = document.getElementById('profileBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginModal = document.getElementById('loginModal');
    const closeBtn = document.getElementById('closeBtn');
    const authForm = document.getElementById('authForm');

    async function checkIsAdmin() {
        try {
            const res = await fetch(window.env.API_BASE_URL + "/api/is_admin", {
                method: "GET",
                credentials: "include"
            });
            const isAdmin = await res.json();
            localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
            return isAdmin;
        } catch (error) {
            console.error('Ошибка проверки isAdmin:', error);
            localStorage.setItem('isAdmin', 'false');
            return false;
        }
    }

    async function checkAuthStatus() {
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

        loginBtn.style.display = isAuthenticated ? 'none' : 'flex';
        logoutBtn.style.display = isAuthenticated ? 'flex' : 'none';

        if (isAuthenticated) {
            const isAdmin = await checkIsAdmin();
            profileBtn.style.display = isAdmin ? 'flex' : 'none';

            if (workButton) {
                if (isAdmin) {
                    workButton.href = "/admin";
                } else {
                    workButton.href = "/tasks";
                }
            }
        } else {
            profileBtn.style.display = 'none';

            if (workButton) {
                workButton.href = "/tasks";
            }
        }
    }

    checkAuthStatus();

    loginBtn.addEventListener('click', () => {
        loginModal.style.display = 'flex';
        loginModal.style.animation = 'fadeIn 0.3s ease-out';
    });

    closeBtn.addEventListener('click', () => {
        loginModal.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            loginModal.style.display = 'none';
        }, 300);
    });

    window.addEventListener('click', e => {
        if (e.target === loginModal) {
            loginModal.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                loginModal.style.display = 'none';
            }, 300);
        }
    });
    logoutBtn.addEventListener('click', () => {
        logoutBtn.classList.add('logging-out');

        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('username');
        localStorage.removeItem('isAdmin');

        fetch(window.env.API_BASE_URL + "/api/logout", {
            method: "POST",
            credentials: "include"
        }).then(() => {
            checkAuthStatus();
            logoutBtn.classList.remove('logging-out');

            showNotification('Вы успешно вышли из системы', 'success');
        }).catch(error => {
            console.error('Ошибка при выходе:', error);
            showNotification('Не удалось выйти. Попробуйте снова', 'error');
        });
    });

    profileBtn.addEventListener('click', () => {
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (isAdmin) {
            window.location.href = "/admin";
        }
    });

    authForm.addEventListener('submit', async event => {
        event.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        try {
            const res = await fetch(window.env.API_BASE_URL + "/api/auth", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({username, password}),
                credentials: "include"
            });

            const data = await res.json();

            if (data.status_code === 401) {
                showNotification('Неверные данные для входа', 'error');
                return;
            }

            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('username', username);

            await checkAuthStatus();

            showNotification('Вход выполнен успешно', 'success');
        } catch (error) {
            console.error('Ошибка:', error);
            showNotification('Произошла ошибка при входе', 'error');
        } finally {
            loginModal.style.display = 'none';
        }
    });
});
