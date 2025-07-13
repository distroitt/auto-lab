import {showNotification} from './notification.js';

class TaskManager {
    constructor() {
        this.userId = this.extractUserIdFromUrl();
        this.container = document.getElementById('tasks-container');
        this.loadingElem = document.getElementById('loading');
        this.aiModal = document.getElementById('ai-modal');
        this.aiModalBody = document.getElementById('ai-modal-body');
        this.aiModalCloseBtn = this.aiModal.querySelector('.close-btn');
        this.aiModalAccumResult = '';
        this.initModalEvents();
    }

    extractUserIdFromUrl() {
        try {
            const uriParts = document.documentURI.split('/');
            return uriParts[4] ? encodeURIComponent(uriParts[4]) : null;
        } catch {
            return null;
        }
    }

    async loadTasks() {
        try {
            let url = window.env.API_BASE_URL + '/api/tasks';
            if (this.userId) url += '?uid=' + this.userId;

            const response = await fetch(url);

            if (response.status === 401) {
                showNotification('Для просмотра задач необходимо войти в систему', 'error');
                this.loadingElem.textContent = 'Задачи не найдены';
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
                return;
            }

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const data = await response.json();

            if (!data || Object.keys(data).length === 0) {
                this.loadingElem.textContent = 'Задачи не найдены';
                return;
            }

            this.loadingElem.style.display = 'none';
            this.renderTasks(data);
        } catch (error) {
            console.error('Ошибка при загрузке задач:', error);
            this.loadingElem.textContent = 'Произошла ошибка при загрузке данных. Пожалуйста, обновите страницу.';
            showNotification('Не удалось загрузить задачи. Попробуйте позже.', 'error');
        }
    }

    async loadTestCode(lab_num, line) {
        try {
            const response = await fetch(window.env.API_BASE_URL + '/api/tasks/get_test_block', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({lab_num, line}),
            });
            if (!response.ok) return `Ошибка HTTP: ${response.status}`;
            const data = await response.json();
            return data.test_code || 'Не удалось загрузить блок кода теста.';
        } catch (error) {
            return `Ошибка: ${error.message}`;
        }
    }

    initModalEvents() {
        this.aiModalCloseBtn.onclick = () => {
            this.closeAiModal();
        };
        window.onclick = (event) => {
            if (event.target === this.aiModal) {
                this.closeAiModal();
            }
        };
    }

    openAiModal(initialContent = '') {
        this.aiModalBody.innerHTML = initialContent ? marked.parse(initialContent) : '';
        this.aiModal.style.display = 'flex';
    }

    closeAiModal() {
        this.aiModal.style.display = 'none';
        this.aiModalBody.innerHTML = '';
    }

    updateAiModalMarkdown(markdown) {
        this.aiModalBody.innerHTML = marked.parse(markdown);
        this.aiModalBody.scrollTop = this.aiModalBody.scrollHeight;
    }

    async getNeuralVerdict(task_id) {
        try {
            const response = await fetch(
                window.env.API_BASE_URL + `/api/tasks/get_neural_verdict?task_id=${task_id}` +
                (this.userId ? `&uid=${this.userId}` : ''),
                {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                });

            if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            this.aiModalAccumResult = '';

            this.openAiModal('');

            while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                this.aiModalAccumResult += decoder.decode(value, {stream: true});
                this.updateAiModalMarkdown(this.aiModalAccumResult);
            }

            this.updateAiModalMarkdown(this.aiModalAccumResult);
            return this.aiModalAccumResult || 'Нейросеть не предоставила вердикт.';
        } catch (error) {
            this.closeAiModal();
            throw new Error(`Ошибка при запросе вердикта: ${error.message}`);
        }
    }

    renderTasks(tasksData) {
        this.container.innerHTML = '';
        const sortedTaskIds = Object.keys(tasksData).sort();
        for (const taskId of sortedTaskIds) {
            const taskDescription = tasksData[taskId];
            this.container.appendChild(this.createTaskElement(taskId, taskDescription));
        }
    }

    createTaskElement(taskId, taskDescription) {
        const taskContainer = document.createElement('div');
        taskContainer.className = 'task-container';

        const taskHeader = document.createElement('div');
        taskHeader.className = 'task-header';
        taskHeader.onclick = () => this.toggleContent(taskHeader);

        taskHeader.innerHTML = `
            <div class="task-id"><span class="toggle-icon">▶</span>ID: ${taskId}</div>
            <div class="task-status status-${taskDescription.status}">${taskDescription.status.toUpperCase()}</div>
        `;
        taskContainer.appendChild(taskHeader);

        if (taskDescription.status !== 'processing') {
            const taskContent = document.createElement('div');
            taskContent.className = 'task-content';

            const verdictButton = document.createElement('button');
            verdictButton.className = 'verdict-btn';
            verdictButton.textContent = 'Получить вердикт нейросети';

            verdictButton.onclick = async (e) => {
                e.stopPropagation();
                verdictButton.disabled = true;
                verdictButton.textContent = 'Загрузка...';
                try {
                    await this.getNeuralVerdict(taskId);
                } catch (error) {
                    console.error('Ошибка получения вердикта:', error);
                    alert('Не удалось получить вердикт нейросети. Попробуйте позже.');
                } finally {
                    verdictButton.disabled = false;
                    verdictButton.textContent = 'Получить вердикт нейросети';
                }
            };

            taskContent.appendChild(verdictButton);

            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'content-wrapper';

            if (taskDescription.test_result) {
                this.renderTestSummaryBlock(taskDescription.test_result, taskId, contentWrapper, taskDescription);

            }

            if (taskDescription.lint_result) {
                this.renderLinterResult(taskDescription.lint_result, contentWrapper);
            }


            taskContent.appendChild(contentWrapper);
            taskContainer.appendChild(taskContent);
        }

        return taskContainer;
    }

    renderLinterResult(result, wrapper) {
        const diagnostics = result?.Diagnostics || [];
        if (diagnostics.length === 0) {
            const noIssues = document.createElement('div');
            noIssues.className = 'lint-no-issues';
            noIssues.textContent = '✔ Ошибок и предупреждений не найдено. Всё отлично!';
            wrapper.appendChild(noIssues);
            return;
        }

        const severityMeta = {
            'Error': {color: '#c0392b', icon: '❌'},
            'Warning': {color: '#e67e22', icon: '⚠️'},
            'Info': {color: '#2980b9', icon: 'ℹ️'}
        };

        const summary = document.createElement('div');
        summary.className = 'lint-header';
        summary.innerHTML = `<span style="float:right;color:#777;">Всего: ${diagnostics.length}</span>`;
        wrapper.appendChild(summary);

        let i = 0;
        diagnostics.forEach(diag => {
            const diagDiv = document.createElement('div');
            diagDiv.className = 'lint-diagnostic improved-diag';

            const level = diag.Level || 'Error';
            const {color, icon} = severityMeta[level] || severityMeta['Error'];

            const title = document.createElement('div');
            title.className = 'lint-title';
            title.style.color = color;
            title.innerHTML = `<span style="font-size:1.2em;margin-right:7px;">${icon}</span><b>${diag.DiagnosticName || 'Без имени'}</b>`;
            diagDiv.appendChild(title);

            const message = diag.DiagnosticMessage?.Message || '';
            if (message) {
                const msgDiv = document.createElement('div');
                msgDiv.className = 'lint-message';
                msgDiv.textContent = message;
                msgDiv.style.marginTop = '4px';
                diagDiv.appendChild(msgDiv);
            }

            const file = diag.DiagnosticMessage?.FilePath || '';
            if (file) {
                const split_file = file.split('/').pop(); // last part
                const fileDiv = document.createElement('div');
                fileDiv.className = 'lint-filepath';
                fileDiv.innerHTML = `Файл: <span style="color:#2980b9;font-weight:500">${split_file}</span>
                    <span> | </span>
                    Строка: <span style="background:#f9c3c3;color:#b40013;font-weight:bold; padding:1px 7px; border-radius:8px;">
                    ${result.idxs?.[i] || '?'}</span>`;
                diagDiv.appendChild(fileDiv);
                i++;
            }

            wrapper.appendChild(diagDiv);
        });
    }

    renderTestSummaryBlock(summary, taskId, wrapper, result) {
        const statBlock = document.createElement('div');
        statBlock.className = 'test-stats-summary';

        statBlock.innerHTML = `
        <div class="grade" title="Ваша оценка">
            <i class="fa-solid fa-star" style="color:#f7b731"></i> ${result.grade}
        </div>
        <div class="stat-group">
            <span class="stat-label">Всего:</span>
            <span class="stat-val total">${summary.total}</span>
        </div>
        <div class="stat-group">
            <span class="stat-label">
                <i class="fa-solid fa-check-circle" style="color: #27ae60;"></i> Успешно:
            </span>
            <span class="stat-val success">${summary.passed}</span>
        </div>
        <div class="stat-group">
            <span class="stat-label">
                <i class="fa-solid fa-times-circle" style="color: #e74c3c;"></i> Провалено:
            </span>
            <span class="stat-val fail">${summary.failed}</span>
        </div>
    `;
wrapper.appendChild(statBlock);
        const summaryBlock = document.createElement('div');
        summaryBlock.className = 'test-summary';

        if (summary.failed > 0) {
            let html = '';

            Object.entries(summary.tests).forEach(([testName, testData]) => {
                if (testData.status === 'failed') {
                    html += `
                    <div style="margin-top:10px; padding-left:20px;">
                        <b>Тест:</b> ${this.escapeHtml(testName)} (<span style="color:red;">Провален</span>)
                        <ul>
                            ${testData.errors.map((error, i) => {
                        const errorId = `error-${taskId}-${i}-${Math.random().toString(36).slice(2, 8)}`;
                        return `<li style="margin-bottom:16px;">
                                    <b>Файл:</b> ${this.escapeHtml(error.file.split("/").pop())}, <b>строка:</b> ${error.line}<br>
                                    <b>Описание ошибки:</b>
                                    <pre style="white-space:pre-wrap; background:#f5f5f5; color:#333; border:1px solid #ddd; padding:8px;">${this.escapeHtml(error.error)}</pre>
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
                const buttons = summaryBlock.querySelectorAll('.show-test-btn');
                buttons.forEach(btn => {
                    btn.onclick = async () => {
                        const file = decodeURIComponent(btn.dataset.file);
                        const line = parseInt(btn.dataset.line);
                        const targetId = btn.dataset.target;
                        const viewer = document.getElementById(targetId);

                        if (viewer.style.display !== 'none') {
                            viewer.style.display = 'none';
                            btn.textContent = 'Показать тест';
                            return;
                        }
                        btn.textContent = 'Загрузка...';
                        const testCode = await this.loadTestCode(result.lab_num, line);
                        viewer.innerHTML = `<pre>${this.escapeHtml(testCode)}</pre>`;
                        viewer.style.display = 'block';
                        btn.textContent = 'Скрыть тест';
                    };
                });
            }, 50);
        } else {
            summaryBlock.textContent = 'Все тесты успешно пройдены.';
        }
        wrapper.appendChild(summaryBlock);
    }


    escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    toggleContent(header) {
        const contentDiv = header.nextElementSibling;
        const toggleIcon = header.querySelector('.toggle-icon');
        if (contentDiv && contentDiv.classList.contains('task-content')) {
            contentDiv.classList.toggle('show');
            toggleIcon.classList.toggle('rotate');
        }
    }

    expandTaskByUrl() {
        const currentTaskId = new URLSearchParams(window.location.search).get('taskId');
        if (!currentTaskId) return;
        [...document.getElementsByClassName('task-header')].forEach(element => {
            if (element.textContent.includes(currentTaskId)) element.click();
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const taskManager = new TaskManager();
    await taskManager.loadTasks();
    taskManager.expandTaskByUrl();
});
