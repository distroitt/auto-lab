import {showNotification} from "./notification.js";

document.addEventListener('DOMContentLoaded', () => {
    // Константы
    const API_URL = '/api';
    const LABS_URL = '/admin/labs';

    // Кэш элементов
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const uploadBtn = document.getElementById('upload-btn');
    const labSelect = document.getElementById('lab-select');
    const statusContainer = document.getElementById('status-container');
    const progressBar = document.getElementById('progress');
    const statusText = document.getElementById('status-text');
    const resultsContainer = document.getElementById('results-container');
    const resultsBox = document.getElementById('results-box');

    let resetButton = null;
    let files = [];
    let currentTaskId = null;
    let pollingInterval = null;

    // Инициализация
    async function init() {
        bindEvents();
        await loadLabs();
        initResetButton();
        updateUploadButtonState();
    }

    function bindEvents() {
        fileInput.addEventListener('change', onFileInputChange);
        uploadBtn.addEventListener('click', uploadFiles);
        labSelect.addEventListener('change', async () => {
            // Когда выбрали лабу — подкидываем интерфейс.
            await fetchAndAddInterfaceFile(labSelect.value);
            updateUploadButtonState();
        });
        fileList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-file')) {
                const index = +e.target.dataset.index;
                files.splice(index, 1);
                updateFileList();
            }
        });
    }

    async function loadLabs() {
        try {
            const response = await fetch(LABS_URL);
            if (response.status === 401) {
                console.log(response);
            // Обработка unauthorized доступа
            showNotification('Для загрузки задач необходимо войти в систему', 'error');
            // Опционально: перенаправление на страницу входа
            setTimeout(() => {
                window.location.href = '/'; // Замените на вашу страницу входа
            }, 2000);

            return; // Прекращаем выполнение функции
        }
            const labs = await response.json();
            labSelect.innerHTML = '<option value="" disabled selected>Выберите лабораторную работу</option>';
            labs.forEach(lab => {
                const opt = document.createElement('option');
                opt.value = lab;
                opt.textContent = lab;
                labSelect.appendChild(opt);
            });
            labSelect.disabled = false;
        } catch (err) {
            console.error(err);
            labSelect.innerHTML = '<option disabled>Не удалось загрузить лабораторные</option>';
            labSelect.disabled = true;
        }
    }

    function onFileInputChange(e) {
        const newFiles = Array.from(e.target.files);
        files = [...files, ...newFiles];
        updateFileList();
    }

    function updateFileList() {
        fileList.innerHTML = '';
        if (files.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Файлы не выбраны';
            fileList.appendChild(li);
        } else {
            files.forEach((file, index) => {
                const li = document.createElement('li');
                li.innerHTML = `
          <span>${file.name} <small>(${formatFileSize(file.size)})</small></span>
          <span class="remove-file" data-index="${index}" style="cursor:pointer;">✕</span>
        `;
                fileList.appendChild(li);
            });
        }
        updateUploadButtonState();
    }

    async function fetchAndAddInterfaceFile(labId) {
        try {
            const res = await fetch(`${API_URL}/labs/${labId}/interface`);
            console.log(res);
            if (!res.ok) throw new Error('Не удалось получить файл интерфейса');
            const text = await res.text();

            // Создаем файл
            const interfaceFile = new File(
                [text],
                'interface.h',
                {type: 'text/plain'}
            );

            // Добавляем только если еще нет такого файла
            if (!files.some(f => f.name === interfaceFile.name && f.size === interfaceFile.size)) {
                files = [interfaceFile, ...files];
                updateFileList();
            }
        } catch (err) {
            console.error(err);
            // Можно показать ошибку пользователю, если нужно
        }
    }


    function updateUploadButtonState() {
        uploadBtn.disabled = !(labSelect.value && files.length > 0);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Байт';
        const k = 1024;
        const sizes = ['Байт', 'КБ', 'МБ', 'ГБ'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    }

    async function uploadFiles() {
        if (!files.length) return;

        stopPolling();
        resultsContainer.style.display = 'none';
        progressBar.style.backgroundColor = '#3498db';
        statusContainer.style.display = 'block';

        statusText.textContent = 'Подготовка файлов...';
        uploadBtn.disabled = true;

        const formData = new FormData();
        files.forEach(f => formData.append('files', f));

        try {
            statusText.textContent = 'Загрузка файлов на сервер...';

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const labResponse = await fetch(`${API_URL}/labs/${labSelect.value}/interface_name`);
            console.log(labResponse)
            if (!labResponse.ok) throw new Error('Ошибка загрузки интерфейса');
            const interfaceName = await labResponse.json();

            const response = await fetch(`${API_URL}/upload?interface_name=${interfaceName}`, {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMsg = 'Ошибка сервера';
                try {
                    const data = await response.json();
                    errorMsg = data.detail || data.error || errorMsg;
                } catch {
                    errorMsg = await response.text() || errorMsg;
                }
                throw new Error(errorMsg);
            }

            const respData = await response.json();

            if (!respData.task_id) {
                if (respData.short_result) {
                    progressBar.style.width = '100%';
                    statusText.textContent = 'Проверка завершена!';
                    await showResults(respData);
                    uploadBtn.disabled = false;
                    return;
                }
                throw new Error('Сервер не вернул ID задачи или результат');
            }

            currentTaskId = respData.task_id;
            progressBar.style.width = '50%';
            statusText.textContent = 'Выполняется проверка кода...';

            startPolling(currentTaskId);

        } catch (error) {
            console.error(error);
            statusText.textContent = `Ошибка: ${error.message}`;
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = '#e74c3c';
            uploadBtn.disabled = false;
        }
    }

    function startPolling(taskId) {
        stopPolling();
        let retries = 0;
        const maxRetries = 30;
        pollingInterval = setInterval(async () => {
            try {
                if (retries >= maxRetries) throw new Error('Превышено время ожидания результатов');
                retries++;
                const response = await fetch(`${API_URL}/task/${taskId}`);
                if (!response.ok) {
                    console.log(`Еще не готово: попытка ${retries}`);
                    return;
                }
                const taskData = await response.json();
                if (taskData.status === 'completed') {
                    progressBar.style.width = '100%';
                    statusText.textContent = 'Проверка завершена!';
                    await showResults(taskData);
                    stopPolling();
                    uploadBtn.disabled = false;
                } else if (taskData.status === 'error') {
                    progressBar.style.width = '100%';
                    progressBar.style.backgroundColor = '#e74c3c';
                    statusText.textContent = `Ошибка: ${taskData.message || 'Неизвестная ошибка'}`;
                    stopPolling();
                    uploadBtn.disabled = false;
                } else {
                    const progressPercent = Math.min(50 + retries * 1.5, 90);
                    progressBar.style.width = `${progressPercent}%`;
                    statusText.textContent = `Выполняется проверка... (${retries} сек)`;
                }
            } catch (error) {
                console.error('Ошибка в опросе:', error);
                stopPolling();
                statusText.textContent = `Ошибка: ${error.message}`;
                progressBar.style.backgroundColor = '#e74c3c';
                uploadBtn.disabled = false;
            }
        }, 1000);
    }

    function stopPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    async function showResults(result) {
        resultsContainer.style.display = 'block';
        let text = '';
        console.log(result);
        const diagnostics = result?.lint_result?.Diagnostics || [];
        console.log(diagnostics);
        //const warningsMatch = result.ling_result?.match(/Warnings: (\d+)/);
        const errorsMatch = result.short_result?.match(/Errors: (\d+)/);
        //const warnings = warningsMatch ? parseInt(warningsMatch[1]) : 0;
        const warnings = diagnostics.length;
        const errors = errorsMatch ? parseInt(errorsMatch[1]) : 0;

        text += `<div>Результат проверки:</div>
             <div class="${warnings > 0 ? 'warning' : 'success'}">Предупреждения: ${warnings}</div>
             <div class="${errors > 0 ? 'error' : 'success'}">Ошибки: ${errors}</div>`;

        try {
            if (result.test_result.total > 0) {
                text += `<div style="margin-top:10px"><b>Тестирование:</b> ${result.test_result.passed} из ${result.test_result.total} пройдено</div>`;
                text += `<div><b>Оценка:</b> ${result.grade}</div>`;
            }
        } catch {
            text += `<div class="error" style="margin-top:10px">Ошибка разбора результатов тестирования</div>`;
        }

        resultsBox.innerHTML = text;
        const moreButton = document.getElementById("more-btn");
        if (moreButton) moreButton.addEventListener("click", () => {
            window.location.href = `/tasks?taskId=${currentTaskId}`;
        });
        files = [];
        updateFileList();
        fileInput.value = '';
        labSelect.value = '';
        updateUploadButtonState();
        resultsContainer.scrollIntoView({behavior: 'smooth'});
    }

    ``

    async function parseTestSummary(testResultStr) {
        const response = await fetch(`${API_URL}/tasks/analyze_tests`, {
            method: 'POST',
            headers: {'Content-Type': 'text/plain'},
            body: Array.isArray(testResultStr) ? testResultStr.join('\n') : testResultStr,
        });
        if (!response.ok) throw new Error('Ошибка сервера при разборе тестов');
        return response.json();
    }

    function initResetButton() {
        resetButton = document.createElement('button');
        resetButton.textContent = 'Очистить все';
        resetButton.style.backgroundColor = '#95a5a6';
        resetButton.style.marginTop = '10px';
        resetButton.addEventListener('click', () => {
            files = [];
            labSelect.value = '';
            updateFileList();
            fileInput.value = '';
            updateUploadButtonState();
        });
        document.querySelector('.upload-container').appendChild(resetButton);
    }

    // Запускаем инициализацию
    init();
});
