const loginBtn = document.getElementById('loginBtn');
const profileBtn = document.getElementById('profileBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginModal = document.getElementById('loginModal');
const closeBtn = document.getElementById('closeBtn');
const authForm = document.getElementById('authForm');

async function checkIsAdmin() {
    try {
        const res = await fetch("http://127.0.0.1:8000/api/is_admin", {
            method: "GET",
            credentials: "include"
        });
        const isAdmin = await res.json(); // просто true/false
        localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
    } catch (error) {
        console.error('Ошибка проверки isAdmin:', error);
        localStorage.setItem('isAdmin', 'false');
    }
}


// Проверка статуса авторизации
function checkAuthStatus() {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    loginBtn.hidden = isAuthenticated;
    profileBtn.hidden = !isAuthenticated;
    logoutBtn.hidden = !isAuthenticated;
}

checkAuthStatus();

// Показ/скрытие модального окна авторизации
loginBtn.addEventListener('click', () => loginModal.style.display = 'flex');
closeBtn.addEventListener('click', () => loginModal.style.display = 'none');
window.addEventListener('click', e => {
    if (e.target === loginModal) loginModal.style.display = 'none';
});

// Обработка логаута
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    checkAuthStatus();

    fetch("http://127.0.0.1:8000/api/logout", {
        method: "POST",
        credentials: "include"
    });

    // Если нужно - раскомментировать редирект:
    // window.location.href = "http://127.0.0.1:8000/";
});

// Переход в профиль
profileBtn.addEventListener('click', () => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    if (isAdmin) {
        window.location.href = "http://127.0.0.1:8000/admin";
    } else {
        window.location.href = "http://127.0.0.1:8000/upl_tasks";
    }
});

// Обработка формы авторизации
authForm.addEventListener('submit', async event => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const res = await fetch("http://127.0.0.1:8000/api/auth", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({username, password}),
            credentials: "include"
        });
        const data = await res.json();

        if (data.status_code === 401) {
            alert('Ошибка: Неверные имя пользователя или пароль!');
            return;
        }

        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('username', username);
        await checkIsAdmin();
        checkAuthStatus();
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (isAdmin) {
            window.location.href = "http://127.0.0.1:8000/admin";
        } else {
            window.location.href = "http://127.0.0.1:8000/upl_tasks";
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Произошла ошибка при входе');
    } finally {
        loginModal.style.display = 'none';
    }
});

