import {showNotification} from "./notification.js";

document.addEventListener('DOMContentLoaded', () => {
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
            // Удаляем все interface.h из списка файлов при смене лабы
            files = files.filter(f => f.name !== 'interface.h');
            updateFileList();

            // Когда выбрали лабораторную работу — загружаем интерфейсный файл
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
            const response = await fetch(window.env.API_BASE_URL + "/api/labs");
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
            updateFileList();
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
            const res = await fetch(window.env.API_BASE_URL + `/api/labs/${labId}/interface`);
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
        statusText.scrollIntoView();

        const formData = new FormData();
        files.forEach(f => formData.append('files', f));

        try {
            statusText.textContent = 'Загрузка файлов на сервер...';

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const labResponse = await fetch(window.env.API_BASE_URL + `/api/labs/${labSelect.value}/interface_name`);
            console.log(labResponse)
            if (!labResponse.ok) throw new Error('Ошибка загрузки интерфейса');
            const interfaceName = await labResponse.json();

            const response = await fetch(window.env.API_BASE_URL + `/api/upload?interface_name=${interfaceName}&lab_num=${labSelect.value}`, {
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
        const maxRetries = 50;
        pollingInterval = setInterval(async () => {
            try {
                if (retries >= maxRetries) throw new Error('Превышено время ожидания результатов');
                retries++;
                const response = await fetch(window.env.API_BASE_URL + `/api/task/${taskId}`);
                if (!response.ok) {
                    console.log(`Еще не готово: попытка ${retries}`);
                    return;
                }
                const taskData = await response.json();
                if (taskData.status === 'completed') {
                    statusContainer.style.display = "none";
                    statusText.textContent = '';
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
    showNotification("Проверка завершена!", "success");

    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close">&times;</button>
            <div class="results-box">
                <div class="results-title">Результат проверки</div>
                <div class="warning-section ${result.lint_result.Diagnostics.length > 0 ? 'warning' : 'success'}">
                    <span class="test-icon ${result.lint_result.Diagnostics.length > 0 ? 'warning' : 'success'}">
                        ${result.lint_result.Diagnostics.length > 0 ? '!' : '✓'}
                    </span>
                    Предупреждения: ${result.lint_result.Diagnostics.length}
                </div>
                <div class="test-results">
                    <div class="test-item">
                        <b>Тестирование</b>
                        <div>${result.test_result.passed} из ${result.test_result.total} пройдено</div>
                    </div>
                    <div class="test-item">
                        <b>Оценка</b>
                        <div>${result.grade}</div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button id="more-details-btn" class="primary-btn">Подробнее</button>
                    <button id="close-modal-btn" class="secondary-btn">Закрыть</button>
                </div>
            </div>
        </div>
    `;

    // Добавляем модальное окно в документ
    document.body.appendChild(modal);

    // Запускаем анимацию появления
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);

    // Закрытие модального окна при клике на крестик
    const closeButton = modal.querySelector('.modal-close');
    closeButton.addEventListener('click', closeModal);

    // Закрытие модального окна при клике на кнопку "Закрыть"
    const closeModalBtn = modal.querySelector('#close-modal-btn');
    closeModalBtn.addEventListener('click', closeModal);

    // Закрытие при клике на фон
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Переход к подробностям
    const moreDetailsBtn = modal.querySelector('#more-details-btn');
    moreDetailsBtn.addEventListener("click", () => {
        window.location.href = `/tasks?taskId=${currentTaskId}`;
    });

    function closeModal() {
        modal.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        }, 300);
    }

    // Сбрасываем состояние формы
    files = [];
    updateFileList();
    fileInput.value = '';
    labSelect.value = '';
    updateUploadButtonState();
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
