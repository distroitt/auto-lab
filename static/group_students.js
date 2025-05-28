import {showNotification} from "./notification.js";

function getGroupIdFromUrl() {
    const match = window.location.pathname.match(/\/group\/(\d+)/);
    return match ? match[1] : null;
}

async function fetchWithTimeout(url, options = {}, timeout = 15000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(window.env.API_BASE_URL + url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

function showError() {
    const studentsListDiv = document.getElementById('students-list');
    const message = "Произошла ошибка при загрузке данных";
    studentsListDiv.innerHTML = `<div class="error-message">${message}</div>`;
}

function showLoading() {
    const studentsListDiv = document.getElementById('students-list');
    studentsListDiv.innerHTML = `
        <div class="loading-indicator">
            <div class="loading-spinner"></div>
            <span>Загрузка данных...</span>
        </div>
    `;
}

function createCodeModal() {
    const modal = document.createElement('div');
    modal.className = 'code-modal';

    const modalContent = document.createElement('div');
    modalContent.className = 'code-modal-content';

    const modalHeader = document.createElement('div');
    modalHeader.className = 'code-modal-header';

    const modalTitle = document.createElement('h3');
    modalTitle.textContent = 'Файлы посылки';

    const closeButton = document.createElement('button');
    closeButton.className = 'code-modal-close';
    closeButton.textContent = '×';

    const modalBody = document.createElement('div');
    modalBody.className = 'code-modal-body';

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modal.appendChild(modalContent);

    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    document.body.appendChild(modal);
    return modal;
}

async function showSubmitFiles(submitId, username) {
    let modal = document.querySelector('.code-modal');
    if (!modal) {
        modal = createCodeModal();
    }

    const modalBody = modal.querySelector('.code-modal-body');
    modalBody.innerHTML = `
        <div class="loading-indicator">
            <div class="loading-spinner"></div>
            <span>Загрузка файлов...</span>
        </div>
    `;

    modal.style.display = 'flex';

    try {
        const res = await fetchWithTimeout(`/api/tasks/get_user_code?task_id=${submitId}&uid=${username}`);

        if (!res.ok) {
            throw new Error(`Ошибка HTTP: ${res.status}`);
        }

        const files = await res.json();

        if (!files || typeof files !== 'object' || Object.keys(files).length === 0) {
            modalBody.innerHTML = '<div class="empty-message">Файлы не найдены</div>';
            return;
        }

        let filesHtml = '';
        Object.entries(files).forEach(([filename, content]) => {
            const escapedContent = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            filesHtml += `
                <div class="file-container">
                    <div class="file-header">
                        <strong>${filename}</strong>
                    </div>
                    <pre class="file-content"><code>${escapedContent}</code></pre>
                </div>
            `;
        });

        modalBody.innerHTML = filesHtml;
    } catch (error) {
        console.error(`Ошибка загрузки файлов для посылки ${submitId}:`, error);
        modalBody.innerHTML = '<div class="error-message">Ошибка загрузки файлов</div>';
    }
}

async function renderStudentSubmits(student, submitsSummaryDiv) {
    try {
        const res = await fetchWithTimeout(`/api/tasks?uid=${student.username}`);

        if (!res.ok) {
            throw new Error(`Ошибка HTTP: ${res.status}`);
        }

        const submits = await res.json();

        if (!Object.keys(submits).length) {
            submitsSummaryDiv.innerHTML = '<div class="empty-message">Посылок нет</div>';
            return;
        }

        const submitItems = Object.entries(submits).map(([submitId, submit]) => {
            const shortId = submitId.substring(0, 8); // Берем первые 8 символов
            return `
                <div class="submit-item">
                    <div class="submit-main">
                        <span class="submit-lab">${submit.lab_num || '?'}</span>
                        <span class="submit-id" title="${submitId}">${shortId}</span>
                        <span class="submit-status ${submit.status}">${submit.status === 'completed' ? 'Завершен' : 'Ошибка'}</span>
                        <span class="submit-grade">Оценка: ${submit.grade ?? '—'}</span>
                    </div>
                    <button 
                        onclick="showSubmitFiles('${submitId}', '${student.username}')" 
                        class="btn-files"
                    >
                        Файлы
                    </button>
                </div>
            `;
        }).join('');

        submitsSummaryDiv.innerHTML = submitItems;
    } catch (error) {
        console.error(`Ошибка загрузки посылок для ${student.username}:`, error);
        submitsSummaryDiv.innerHTML = '<div class="empty-message">Ошибка загрузки посылок</div>';
    }
}

async function renderStudents(students) {
    const studentsListDiv = document.getElementById('students-list');
    studentsListDiv.innerHTML = '';

    if (!students.length) {
        studentsListDiv.innerHTML = '<div class="empty-message">В группе нет студентов</div>';
        return;
    }

    for (const student of students) {
        const studentDiv = document.createElement('div');
        studentDiv.className = 'student-container';

        const submitsSummaryDiv = document.createElement('div');
        submitsSummaryDiv.className = 'submits-summary';
        submitsSummaryDiv.innerHTML = `
            <div class="loading-indicator">
                <div class="loading-spinner"></div>
                <span>Загрузка посылок...</span>
            </div>
        `;

        studentDiv.innerHTML = `
            <div class="student-header">
                <div class="student-name">
                    ${student.surname} ${student.name}
                    <span class="student-username">(${student.username})</span>
                </div>
                <a href="/tasks/${encodeURIComponent(student.username)}" class="btn-details">Подробнее</a>
            </div>
        `;

        studentDiv.appendChild(submitsSummaryDiv);
        studentsListDiv.appendChild(studentDiv);

        // Загружаем посылки асинхронно
        renderStudentSubmits(student, submitsSummaryDiv);
    }
}

// Добавляем функцию в глобальную область видимости для onclick
window.showSubmitFiles = showSubmitFiles;

document.addEventListener('DOMContentLoaded', async () => {
    const groupId = getGroupIdFromUrl();

    if (!groupId) {
        showNotification("Идентификатор группы не найден", "error");
        showError();
        return;
    }

    showLoading();
    try {
        const res = await fetchWithTimeout(`/api/group/${groupId}`);

        if (!res.ok) {
            if (res.status === 404) {
                showNotification("Такая группа не найдена", "error");
                showError();
            } else {
                showNotification("У вас нет прав для просмотра содержимого", "error");
                showError();
            }
            return;
        }

        const students = await res.json();

        if (!students || !Array.isArray(students)) {
            showNotification("Получены некорректные данные", "error");

            showError();
            return;
        }

        // Сортируем студентов по фамилии
        students.sort((a, b) => a.surname.localeCompare(b.surname));

        renderStudents(students);
    } catch (error) {
        console.error('Ошибка при загрузке студентов:', error);

        if (error.name === 'AbortError') {
            showNotification("Превышено время ожидания запроса. Пожалуйста, попробуйте позже.");
            showError();
        } else {
            showNotification("Произошла ошибка при загрузке данных. Пожалуйста, обновите страницу.");

            showError();
        }
    }
});