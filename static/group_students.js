import { showNotification } from "./notification.js";

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
            signal: controller.signal,
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

function showError(message = "Произошла ошибка при загрузке данных") {
    const container = document.getElementById("students-list");
    container.innerHTML = `<div class="error-message" role="alert">${message}</div>`;
}

function showLoading() {
    const container = document.getElementById("students-list");
    container.setAttribute("aria-busy", "true");
    container.innerHTML = `
        <div class="loading-indicator" aria-live="polite" aria-busy="true" role="status">
            <div class="loading-spinner" aria-hidden="true"></div>
            <span>Загрузка данных...</span>
        </div>
    `;
}


function createFilesButton(submitId, username) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-files";
    btn.textContent = "Файлы";
    btn.addEventListener("click", () => showSubmitFiles(submitId, username));
    btn.setAttribute("aria-label", `Показать файлы посылки ${submitId} пользователя ${username}`);
    return btn;
}

function createCodeModal() {
    const modal = document.createElement("div");
    modal.className = "code-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "modal-title");
    modal.tabIndex = -1;

    const modalContent = document.createElement("div");
    modalContent.className = "code-modal-content";

    const modalHeader = document.createElement("div");
    modalHeader.className = "code-modal-header";

    const modalTitle = document.createElement("h3");
    modalTitle.id = "modal-title";
    modalTitle.textContent = "Файлы посылки";

    const closeButton = document.createElement("button");
    closeButton.className = "code-modal-close";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "Закрыть окно");
    closeButton.type = "button";

    closeButton.addEventListener("click", () => {
        modal.classList.remove("show");
        modal.style.display = "none";
        modal.focus();
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.remove("show");
            modal.style.display = "none";
            modal.focus();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("show")) {
            modal.classList.remove("show");
            modal.style.display = "none";
            modal.focus();
        }
    });

    const modalBody = document.createElement("div");
    modalBody.className = "code-modal-body";

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modal.appendChild(modalContent);

    document.body.appendChild(modal);

    return modal;
}

async function showSubmitFiles(submitId, username) {
    let modal = document.querySelector(".code-modal");
    if (!modal) {
        modal = createCodeModal();
    }
    const modalBody = modal.querySelector(".code-modal-body");
    modalBody.innerHTML = `
        <div class="loading-indicator" aria-live="polite" role="status">
            <div class="loading-spinner" aria-hidden="true"></div>
            <span>Загрузка файлов...</span>
        </div>
    `;

    modal.style.display = "flex";
    modal.classList.add("show");
    modal.focus();

    try {
        const res = await fetchWithTimeout(`/api/tasks/get_user_code?task_id=${encodeURIComponent(submitId)}&uid=${encodeURIComponent(username)}`);

        if (!res.ok) {
            throw new Error(`Ошибка HTTP: ${res.status}`);
        }

        const files = await res.json();

        if (!files || typeof files !== "object" || Object.keys(files).length === 0) {
            modalBody.innerHTML = '<div class="empty-message">Файлы не найдены</div>';
            return;
        }

        const fragment = document.createDocumentFragment();

        Object.entries(files).forEach(([filename, content]) => {
            const container = document.createElement("div");
            container.className = "file-container";

            const header = document.createElement("div");
            header.className = "file-header";

            const strong = document.createElement("strong");
            strong.textContent = filename;

            header.appendChild(strong);

            const pre = document.createElement("pre");
            pre.className = "file-content";

            const code = document.createElement("code");
            code.textContent = content || "";

            pre.appendChild(code);

            container.appendChild(header);
            container.appendChild(pre);

            fragment.appendChild(container);
        });

        modalBody.innerHTML = "";
        modalBody.appendChild(fragment);
    } catch (error) {
        console.error(`Ошибка загрузки файлов для посылки ${submitId}:`, error);
        modalBody.innerHTML = '<div class="error-message" role="alert">Ошибка загрузки файлов</div>';
    }
}

async function renderStudentSubmits(student, container) {
    container.setAttribute("aria-busy", "true");
    container.innerHTML = `
        <div class="loading-indicator" aria-live="polite" role="status">
            <div class="loading-spinner" aria-hidden="true"></div>
            <span>Загрузка посылок...</span>
        </div>
    `;

    try {
        const res = await fetchWithTimeout(`/api/tasks?uid=${encodeURIComponent(student.username)}`);

        if (!res.ok) {
            throw new Error(`Ошибка HTTP: ${res.status}`);
        }

        const submits = await res.json();

        if (!submits || !Object.keys(submits).length) {
            container.innerHTML = '<div class="empty-message">Посылок нет</div>';
            container.removeAttribute("aria-busy");
            return;
        }

        const fragment = document.createDocumentFragment();

        const submitEntries = Object.entries(submits).slice(0, 20);

        submitEntries.forEach(([submitId, submit]) => {
            const div = document.createElement("div");
            div.className = "submit-item";

            const mainDiv = document.createElement("div");
            mainDiv.className = "submit-main";

            const labSpan = document.createElement("span");
            labSpan.className = "submit-lab";
            labSpan.textContent = submit.lab_num || "?";

            const shortId = submitId.substring(0, 8);

            const idSpan = document.createElement("span");
            idSpan.className = "submit-id";
            idSpan.title = submitId;
            idSpan.textContent = shortId;
            idSpan.tabIndex = 0;

            const statusSpan = document.createElement("span");
            statusSpan.className = `submit-status ${submit.status === "completed" ? "completed" : "failed"}`;
            statusSpan.textContent = submit.status === "completed" ? "Завершен" : "Ошибка";

            const gradeSpan = document.createElement("span");
            gradeSpan.className = "submit-grade";
            gradeSpan.textContent = `Оценка: ${submit.grade ?? "—"}`;

            mainDiv.appendChild(labSpan);
            mainDiv.appendChild(idSpan);
            mainDiv.appendChild(statusSpan);
            mainDiv.appendChild(gradeSpan);

            const btnFiles = createFilesButton(submitId, student.username);

            div.appendChild(mainDiv);
            div.appendChild(btnFiles);

            fragment.appendChild(div);
        });

        container.innerHTML = "";
        container.appendChild(fragment);
        container.removeAttribute("aria-busy");
    } catch (error) {
        console.error(`Ошибка загрузки посылок для ${student.username}:`, error);
        container.innerHTML = '<div class="empty-message" role="alert">Ошибка загрузки посылок</div>';
        container.removeAttribute("aria-busy");
    }
}

async function renderStudents(students) {
    const container = document.getElementById("students-list");
    container.setAttribute("aria-busy", "false");
    container.innerHTML = "";

    if (!students.length) {
        container.innerHTML = '<div class="empty-message">В группе нет студентов</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    const submitsLoaders = [];

    students.forEach((student) => {
        const studentDiv = document.createElement("div");
        studentDiv.className = "student-container";

        studentDiv.innerHTML = `
            <div class="student-header">
                <div class="student-name">
                    ${student.surname} ${student.name}
                    <span class="student-username">(${student.username})</span>
                </div>
                <a href="/tasks/${encodeURIComponent(student.username)}" class="btn-details" aria-label="Подробнее о пользователе ${student.username}">Подробнее</a>
            </div>
        `;

        const submitsSummaryDiv = document.createElement("div");
        submitsSummaryDiv.className = "submits-summary";

        studentDiv.appendChild(submitsSummaryDiv);
        fragment.appendChild(studentDiv);

        submitsLoaders.push(renderStudentSubmits(student, submitsSummaryDiv));
    });

    container.appendChild(fragment);

    await Promise.all(submitsLoaders);
}

document.addEventListener("DOMContentLoaded", async () => {
    const groupId = getGroupIdFromUrl();

    if (!groupId) {
        showNotification("Идентификатор группы не найден", "error");
        showError();
        return;
    }

    showLoading();

    try {
        const res = await fetchWithTimeout(`/api/group/${encodeURIComponent(groupId)}`);

        if (!res.ok) {
            if (res.status === 404) {
                showNotification("Такая группа не найдена", "error");
                showError("Группа не найдена");
            } else if (res.status === 403) {
                showNotification("У вас нет прав для просмотра содержимого", "error");
                showError("Нет прав доступа");
            } else {
                showNotification("Произошла ошибка при загрузке данных", "error");
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

        students.sort((a, b) => a.surname.localeCompare(b.surname));

        await renderStudents(students);
    } catch (error) {
        console.error("Ошибка при загрузке студентов:", error);
        if (error.name === "AbortError") {
            showNotification("Превышено время ожидания запроса. Пожалуйста, попробуйте позже.", "error");
            showError("Превышено время ожидания запроса");
        } else {
            showNotification("Произошла ошибка при загрузке данных. Пожалуйста, обновите страницу.", "error");
            showError();
        }
    }
});

window.showSubmitFiles = showSubmitFiles;
