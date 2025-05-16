import { showNotification } from './notification.js';

// ===== API FUNCTIONS =====
async function loadTasks() {
    try {
        const rar = document.documentURI;
        let response;
        if (rar.split("/")[4]){
          const userId = encodeURIComponent(rar.split("/")[4]);
          response = await fetch('/api/tasks?uid=' + userId);
        }
        else response = await fetch('/api/tasks');

        if (response.status === 401) {
            // Обработка unauthorized доступа
            showNotification('Для просмотра задач необходимо войти в систему', 'error');
            document.getElementById("loading").textContent = 'Задачи не найдены';
            // Опционально: перенаправление на страницу входа
            setTimeout(() => {
                window.location.href = '/'; // Замените на вашу страницу входа
            }, 2000);

            return; // Прекращаем выполнение функции
        }

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        document.getElementById('loading').style.display = 'none';
        renderTasks(data);
    } catch (error) {
        console.error('Ошибка при загрузке задач:', error);
        document.getElementById('loading').textContent =
            'Произошла ошибка при загрузке данных. Пожалуйста, обновите страницу.';

        // Показываем уведомление об общей ошибке
        showNotification('Не удалось загрузить задачи. Попробуйте позже.', 'error');
    }
}

async function loadTestCode(file, line) {
    try {
        const response = await fetch('/api/tasks/get_test_block', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file, line }),
        });
        if (!response.ok) return `Ошибка HTTP: ${response.status}`;
        const data = await response.json();
        return data.test_code || 'Не удалось загрузить блок кода теста.';
    } catch (error) {
        return `Ошибка: ${error.message}`;
    }
}



async function parseTestSummary(testResultStr) {
    const response = await fetch('http://127.0.0.1:8000/api/tasks/analyze_tests', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: Array.isArray(testResultStr) ? testResultStr.join('\n') : testResultStr,
    });
    if (!response.ok) throw new Error('Ошибка сервера при анализе тестов.');
    return await response.json();
}

let aiModalAccumResult = '';

function appendToAiModal(markdownChunk) {
    const modalBody = document.getElementById('ai-modal-body');
    if (!modalBody) return;

    // Конвертируем markdown часть в HTML
    // Для корректного добавления покусочно преобразуем chunk в HTML и добавляем его
    const htmlChunk = marked.parse(markdownChunk);

    // Добавляем в конец содержимого (сохраняем предыдущий текст!)
    modalBody.innerHTML += htmlChunk;

    // По желанию можно прокрутить скролл в конец чтобы видеть новые данные
    modalBody.scrollTop = modalBody.scrollHeight;
}



async function getNeuralVerdict(task_id) {
    try {
        const response = await fetch(`/api/tasks/get_neural_verdict?task_id=${task_id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        aiModalAccumResult = '';

        openAiModal(''); // Открыть окно заранее

        // Обновлять модалку раз в 200 мс
        let updateInterval = setInterval(() => {
            updateAiModalMarkdown(aiModalAccumResult);
        }, 200);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            aiModalAccumResult += decoder.decode(value, { stream: true });
        }

        // Последнее обновление
        updateAiModalMarkdown(aiModalAccumResult);
        clearInterval(updateInterval);

        return aiModalAccumResult || 'Нейросеть не предоставила вердикт.';
    } catch (error) {
        throw new Error(`Ошибка при запросе вердикта: ${error.message}`);
    }
}

function updateAiModalMarkdown(markdown) {
    const modalBody = document.getElementById('ai-modal-body');
    if (!modalBody) return;
    modalBody.innerHTML = marked.parse(markdown);
    modalBody.scrollTop = modalBody.scrollHeight;
}


// ===== MODAL FUNCTIONS =====
function openAiModal(initialContent) {
    const modal = document.getElementById('ai-modal');
    const modalBody = document.getElementById('ai-modal-body');

    if (!modal || !modalBody) {
        console.error('Ошибка: Модальное окно или его содержимое не существует.');
        return;
    }

    modalBody.innerHTML = ''; // Очищаем содержимое перед вставкой новых данных или стримом
    if (initialContent) {
        modalBody.innerHTML = marked.parse(initialContent);
    }
    modal.style.display = 'flex';

    // Закрытие через кнопку
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };

    // Закрытие по нажатию на затемненный фон
    window.onclick = event => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}



// ===== RENDERING =====
function renderTasks(tasksData) {
    const container = document.getElementById('tasks-container');
    container.innerHTML = '';
    // Сортировка опционально: можно добавить sort по taskId, если надо
    for (const [taskId, taskDescription] of Object.entries(tasksData)) {
        container.prepend(createTaskElement(taskId, taskDescription));
    }
}

function createTaskElement(taskId, taskDescription) {
    const taskContainer = document.createElement('div');
    taskContainer.className = 'task-container';

    // --- Header ---
    const taskHeader = document.createElement('div');
    taskHeader.className = 'task-header';
    taskHeader.onclick = () => toggleContent(taskHeader);

    taskHeader.innerHTML = `
        <div class="task-id"><span class="toggle-icon">▶</span>ID: ${taskId}</div>
        <div class="task-status status-${taskDescription.status}">${taskDescription.status.toUpperCase()}</div>
    `;
    taskContainer.appendChild(taskHeader);

    // --- Content ---
    if (taskDescription.status !== "processing") {
        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';

        // --- Кнопка "Получить вердикт нейросети" ---
        // Moved outside the content wrapper
        const verdictButton = document.createElement('button');
        verdictButton.className = 'verdict-btn';
        verdictButton.textContent = 'Получить вердикт нейросети';
        verdictButton.onclick = async (e) => {
            e.stopPropagation(); // Prevent toggle
            verdictButton.disabled = true;
            verdictButton.textContent = 'Загрузка...';
            try {
                await getNeuralVerdict(taskId);
            } catch (error) {
                console.error('Ошибка получения вердикта:', error);
                alert('Не удалось получить вердикт нейросети. Попробуйте позже.');
            } finally {
                verdictButton.disabled = false;
                verdictButton.textContent = 'Получить вердикт нейросети';
            }
        };

        // First add button, then the content wrapper
        taskContent.appendChild(verdictButton);

        // Test results container
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'content-wrapper';

        // Линтер/Ошибки
        if (taskDescription.lint_result) renderLinterResult(taskDescription.lint_result, contentWrapper);

        // Тесты
        if (taskDescription.test_result) {
            parseTestSummary(taskDescription.test_result).then(summary => {
                renderTestSummaryBlock(taskDescription.test_result, taskId, contentWrapper, taskDescription);
            });
        }

        // Add content wrapper after the button
        taskContent.appendChild(contentWrapper);
        taskContainer.appendChild(taskContent);
    }

    return taskContainer;
}


// ===== HELPERS =====
function renderLinterResult(result, wrapper) {
    // Очищаем wrapper
    wrapper.innerHTML = '';
    const diagnostics = result?.Diagnostics || [];
    if (diagnostics.length === 0) {
        const noIssues = document.createElement('div');
        noIssues.className = 'lint-no-issues';
        noIssues.textContent = '✔ Ошибок и предупреждений не найдено. Всё отлично!';
        wrapper.appendChild(noIssues);
        return;
    }

    // Получаем количество ошибок и варнингов
    const errorCount = diagnostics.filter(d => d.Level === 'Error').length;
    const warnCount = diagnostics.filter(d => d.Level === 'Warning').length;

    // Красивый блок-сводка
    const summary = document.createElement('div');
    summary.className = 'lint-header';
    summary.innerHTML = `
        <span style="color: #e74c3c; font-weight: bold;">Ошибки: ${errorCount}</span>
        <span style="color: #f39c12; font-weight: bold; margin-left:18px;">Предупреждения: ${warnCount}</span>
        <span style="float:right;color:#777;">Всего: ${diagnostics.length}</span>
    `;
    wrapper.appendChild(summary);
    console.log(diagnostics);
    let i = 0;
    diagnostics.forEach(diag => {
        const diagDiv = document.createElement('div');
        diagDiv.className = 'lint-diagnostic improved-diag';

        // Цвет и иконка по типу
        let color = '#c0392b'; let icon = '❌';
        if (diag.Level === 'Warning') { color = '#e67e22'; icon = '⚠️'; }
        if (diag.Level === 'Info') { color = '#2980b9'; icon = 'ℹ️'; }

        // 1. Основная строка (тип, иконка, имя)
        const title = document.createElement('div');
        title.className = 'lint-title';
        title.style.color = color;
        title.innerHTML = `<span style="font-size:1.2em;margin-right:7px;">${icon}</span><b>${diag.DiagnosticName || 'Без имени'}</b>`;
        diagDiv.appendChild(title);

        // 2. Описание ошибки/предупреждения
        const message = diag.DiagnosticMessage?.Message || '';
        if (message) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'lint-message';
            msgDiv.textContent = message;
            msgDiv.style.marginTop = '4px';
            diagDiv.appendChild(msgDiv);
        }

        // 3. Файл, строка с ярким выделением номера строки
        const file = diag.DiagnosticMessage?.FilePath || '';
        if (file) {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'lint-filepath';
            fileDiv.innerHTML = `Файл: <span style="color:#2980b9;font-weight:500">${file}</span>
            <span> | </span>
            Строка: <span style="background:#f9c3c3;color:#b40013;
            font-weight:bold; padding:1px 7px; border-radius:8px;">
            ${result.idxs[i]}</span>`;
            diagDiv.appendChild(fileDiv);
            i += 1;
        }

        // 4. Примечания/подсказки (если есть)
        // if (Array.isArray(diag.Notes) && diag.Notes.length > 0) {
        //     const notesDiv = document.createElement('div');
        //     notesDiv.className = 'lint-notes';
        //     notesDiv.innerHTML = '<div style="margin-top:5px;font-size:90%;color:#555">Подсказки:</div>';
        //     const ul = document.createElement('ul');
        //     diag.Notes.forEach(note => {
        //         const li = document.createElement('li');
        //         li.textContent = note.Message || '';
        //         ul.appendChild(li);
        //     });
        //     notesDiv.appendChild(ul);
        //     diagDiv.appendChild(notesDiv);
        // }

        wrapper.appendChild(diagDiv);
    });
}


function renderTestSummaryBlock(summary, taskId, wrapper, result) {
    const summaryBlock = document.createElement('div');
    summaryBlock.className = 'test-summary';

    if (summary.failed > 0) {
        let html = `<div><b>Оценка:</b> ${result.grade}</div><div><b>Результаты тестирования:</b></div>
            <div>Всего тестов: <b>${summary.total}</b>
            | <span style="color:#27ae60;">Успешно: ${summary.passed}</span>
            | <span style="color:#e74c3c;">Провалено: ${summary.failed}</span></div>`;
        Object.entries(summary.tests).forEach(([testName, testData]) => {
            if (testData.status === 'failed') {
                html += `
                    <div style="margin-top:10px; padding-left:20px;">
                        <b>Тест:</b> ${testName} (<span style="color:red;">Провален</span>)
                        <ul>
                            ${testData.errors.map((error, i) => {
                    const errorId = `error-${taskId}-${i}-${Math.random().toString(36).slice(2, 8)}`;
                    return `<li>
                                    <b>Файл:</b> ${error.file}, <b>строка:</b> ${error.line}<br>
                                    <b>Описание ошибки:</b>
                                    <pre style="white-space:pre-wrap; background:#f5f5f5; color:#333; border:1px solid #ddd; padding:8px;">${error.error}</pre>
                                    <button class="show-test-btn" data-file="${encodeURIComponent(error.file)}" data-line="${error.line}" data-target="${errorId}">Показать тест</button>
                                    <div id="${errorId}" class="test-code-viewer" style="display:none; margin-top:8px; background:#222; color:#eee; padding:8px; border:1px solid #333; font-family:monospace; font-size:13px;"></div>
                                </li>`;
                }).join('')}
                        </ul>
                    </div>`;
            }
        });
        summaryBlock.innerHTML = html;
        setTimeout(() => {
            summaryBlock.querySelectorAll('.show-test-btn').forEach(btn => {
                btn.onclick = async function () {
                    const file = decodeURIComponent(this.dataset.file);
                    const line = parseInt(this.dataset.line);
                    const targetId = this.dataset.target;
                    const viewer = document.getElementById(targetId);

                    if (viewer.style.display !== 'none') {
                        viewer.style.display = 'none';
                        this.textContent = 'Показать тест';
                        return;
                    }
                    this.textContent = 'Загрузка...';
                    const testCode = await loadTestCode(file, line);
                    viewer.innerHTML = `<pre>${testCode.replace(/</g, '&lt;')}</pre>`;
                    viewer.style.display = 'block';
                    this.textContent = 'Скрыть тест';
                };
            });
        }, 50);
    } else {
        summaryBlock.innerHTML = `<div>Все тесты успешно пройдены.</div>`;
    }
    wrapper.prepend(summaryBlock);
}

// ===== UI Collapsing, Expansion and Startup =====

function toggleContent(header) {
    const contentDiv = header.nextElementSibling;
    const toggleIcon = header.querySelector('.toggle-icon');
    if (contentDiv && contentDiv.classList.contains('task-content')) {
        contentDiv.classList.toggle('show');
        toggleIcon.classList.toggle('rotate');
    }
}

function expandTaskByUrl() {
    const currentTaskId = new URLSearchParams(window.location.search).get("taskId");
    if (!currentTaskId) return;
    [...document.getElementsByClassName("task-header")].forEach(element => {
        if (element.outerText.includes(`${currentTaskId}`)) element.click();
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadTasks();
    expandTaskByUrl();
});
