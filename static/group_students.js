function getGroupIdFromUrl() {
    const match = window.location.pathname.match(/\/group\/(\d+)/);
    return match ? match[1] : null;
}

async function fetchWithTimeout(url, options = {}, timeout = 15000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
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

function showError(message) {
    const studentsListDiv = document.getElementById('students-list');
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

        const submitItems = Object.entries(submits).map(([submitId, submit]) => `
            <div class="submit-item">
                <div>
                    <span class="submit-id">${submitId}</span>
                </div>
                <div class="submit-info">
                    <span class="submit-status ${submit.status}">${submit.status === 'completed' ? 'Завершен' : 'Ошибка'}</span>
                    <span class="submit-grade">Оценка: ${submit.grade ?? '—'}</span>
                </div>
            </div>
        `).join('');

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
            <div class="loading-indicator" style="padding: 0.5rem">
                <div class="loading-spinner" style="width: 1.5rem; height: 1.5rem;"></div>
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

document.addEventListener('DOMContentLoaded', async () => {
    const groupId = getGroupIdFromUrl();

    if (!groupId) {
        showError('Идентификатор группы не найден');
        return;
    }

    showLoading();
    try {
        const res = await fetchWithTimeout(`/api/group/${groupId}`);

        if (!res.ok) {
            if (res.status === 404) {
                showError('Группа не найдена');
            } else {
                showError(`Ошибка загрузки данных: ${res.status}`);
            }
            return;
        }

        const students = await res.json();

        if (!students || !Array.isArray(students)) {
            showError('Получены некорректные данные');
            return;
        }

        // Сортируем студентов по фамилии
        students.sort((a, b) => a.surname.localeCompare(b.surname));

        renderStudents(students);
    } catch (error) {
        console.error('Ошибка при загрузке студентов:', error);

        if (error.name === 'AbortError') {
            showError('Превышено время ожидания запроса. Пожалуйста, попробуйте позже.');
        } else {
            showError('Произошла ошибка при загрузке данных. Пожалуйста, обновите страницу.');
        }
    }
});

// Добавляем функцию для обработки повторной загрузки
function reloadData() {
    const studentsListDiv = document.getElementById('students-list');
    showLoading();

    // Имитируем перезагрузку страницы с небольшой задержкой
    setTimeout(() => {
        window.location.reload();
    }, 300);
}

// Вспомогательная функция для форматирования оценок
function formatGrade(grade) {
    if (grade === null || grade === undefined) return '—';

    // Преобразуем в число и округляем до 2 знаков после запятой
    const numGrade = parseFloat(grade);
    if (isNaN(numGrade)) return grade;

    // Если целое число, возвращаем как есть
    if (Number.isInteger(numGrade)) return numGrade.toString();

    // Иначе округляем до 2 знаков
    return numGrade.toFixed(2);
}
