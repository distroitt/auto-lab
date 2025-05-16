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
            const res = await fetch("/api/is_admin", {
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

    // Обновленная функция для проверки статуса аутентификации и обновления URL кнопки
    async function checkAuthStatus() {
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

        loginBtn.style.display = isAuthenticated ? 'none' : 'flex';
        logoutBtn.style.display = isAuthenticated ? 'flex' : 'none';

        // Показываем кнопку профиля только для администратора
        if (isAuthenticated) {
            const isAdmin = await checkIsAdmin();
            profileBtn.style.display = isAdmin ? 'flex' : 'none';

            // Обновляем URL для кнопки work-btn в зависимости от роли пользователя
            if (workButton) {
                if (isAdmin) {
                    // URL для администраторов
                    workButton.href = "/admin";
                } else {
                    // URL для обычных пользователей
                    workButton.href = "/tasks";
                }
            }
        } else {
            profileBtn.style.display = 'none';

            // Для неавторизованных пользователей также устанавливаем URL на /tasks
            if (workButton) {
                workButton.href = "/tasks";
            }
        }
    }

    // Инициализация при загрузке страницы
    checkAuthStatus();

    // Показ/скрытие модального окна авторизации с анимацией
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

    // Закрытие модального окна при клике вне его области
    window.addEventListener('click', e => {
        if (e.target === loginModal) {
            loginModal.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                loginModal.style.display = 'none';
            }, 300);
        }
    });
    // Обработка логаута с улучшенной обратной связью
    logoutBtn.addEventListener('click', () => {
        // Анимация выхода
        logoutBtn.classList.add('logging-out');

        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('username');
        localStorage.removeItem('isAdmin');

        fetch("/api/logout", {
            method: "POST",
            credentials: "include"
        }).then(() => {
            checkAuthStatus(); // Обновит URL кнопки при выходе
            logoutBtn.classList.remove('logging-out');

            // Необязательно: всплывающее уведомление об успешном выходе
            showNotification('Вы успешно вышли из системы', 'success');
        }).catch(error => {
            console.error('Ошибка при выходе:', error);
            showNotification('Не удалось выйти. Попробуйте снова', 'error');
        });
    });

    // Переход в профиль с проверкой роли
    profileBtn.addEventListener('click', () => {
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (isAdmin) {
            window.location.href = "/admin";
        }
    });

    // Обработка формы авторизации
    authForm.addEventListener('submit', async event => {
        event.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        try {
            const res = await fetch("/api/auth", {
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

            // Проверяем статус администратора и обновляем URL кнопки
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
