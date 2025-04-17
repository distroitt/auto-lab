document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const uploadBtn = document.getElementById('upload-btn');
    const statusContainer = document.getElementById('status-container');
    const progressBar = document.getElementById('progress');
    const statusText = document.getElementById('status-text');
    const resultsContainer = document.getElementById('results-container');
    const resultsBox = document.getElementById('results-box');
    
    // API URL - легко изменить, если сервер запущен на другом хосте/порту
    const API_URL = 'http://127.0.0.1:8000/api';
    
    let files = [];
    let currentTaskId = null;
    let pollingInterval = null;
    
    // Обработка выбора файлов
    fileInput.addEventListener('change', function(e) {
        const newFiles = Array.from(e.target.files);
        files = [...files, ...newFiles];
        updateFileList();
    });
    
    // Обработчик drag-and-drop для файлов
    const dropZone = document.querySelector('.custom-file-input');
    
    // Предотвращаем браузерные действия по умолчанию для drag & drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Визуальный отклик при перетаскивании
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropZone.classList.add('highlight');
    }
    
    function unhighlight() {
        dropZone.classList.remove('highlight');
    }
    
    // Обработка сброса файлов
    dropZone.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const droppedFiles = Array.from(dt.files);
        files = [...files, ...droppedFiles];
        updateFileList();
    }
    
    // Функция обновления списка файлов
    function updateFileList() {
        fileList.innerHTML = '';
        
        if (files.length > 0) {
            uploadBtn.disabled = false;
            
            files.forEach((file, index) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${file.name} <small>(${formatFileSize(file.size)})</small></span>
                    <span class="remove-file" data-index="${index}">✕</span>
                `;
                fileList.appendChild(li);
            });
            
            // Добавляем обработчики для удаления файлов
            document.querySelectorAll('.remove-file').forEach(btn => {
                btn.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    files.splice(index, 1);
                    updateFileList();
                });
            });
        } else {
            uploadBtn.disabled = true;
            const li = document.createElement('li');
            li.textContent = 'Файлы не выбраны';
            fileList.appendChild(li);
        }
    }
    
    // Форматирование размера файла для удобочитаемости
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Байт';
        const k = 1024;
        const sizes = ['Байт', 'КБ', 'МБ', 'ГБ'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Обработка нажатия кнопки загрузки
    uploadBtn.addEventListener('click', function() {
        uploadFiles();
    });
    
    // Функция загрузки файлов
    async function uploadFiles() {
        if (files.length === 0) return;
        
        // Сбрасываем предыдущее состояние
        stopPolling();
        resultsContainer.style.display = 'none';
        progressBar.style.backgroundColor = '#3498db';
        
        // Показываем статус загрузки
        statusContainer.style.display = 'block';
        uploadBtn.disabled = true;
        progressBar.style.width = '5%';
        statusText.textContent = 'Подготовка файлов...';
        
        // Создаем FormData и добавляем файлы
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        
        try {
            // Показываем прогресс
            progressBar.style.width = '15%';
            statusText.textContent = 'Загрузка файлов на сервер...';
            
            // Делаем запрос с таймаутом
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд таймаут
            
            // ШАГ 1: Отправляем файлы и получаем ID задачи
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            }).finally(() => {
                clearTimeout(timeoutId);
            });
            
            if (!response.ok) {
                let errorText = 'Ошибка сервера';
                try {
                    const errorData = await response.json();
                    errorText = errorData.detail || errorData.error || errorText;
                } catch (e) {
                    errorText = await response.text() || errorText;
                }
                throw new Error(`Ошибка загрузки: ${response.status} - ${errorText}`);
            }
            
            // Разбираем ответ
            let responseData;
            try {
                responseData = await response.json();
            } catch (e) {
                // Если сервер не вернул JSON, пробуем получить как текст
                const textData = await response.text();
                responseData = { task_id: textData };
            }
            
            // Проверяем, есть ли task_id в ответе
            if (!responseData.task_id) {
                // Если сервер вернул результат напрямую
                if (responseData.result) {
                    progressBar.style.width = '100%';
                    statusText.textContent = 'Проверка завершена!';
                    showResults(responseData);
                    uploadBtn.disabled = false;
                    return;
                } else {
                    throw new Error('Сервер не вернул ID задачи или результат');
                }
            }
            
            currentTaskId = responseData.task_id;
            
            // Обновляем прогресс
            progressBar.style.width = '50%';
            statusText.textContent = 'Выполняется проверка кода...';
            
            // ШАГ 2: Начинаем опрашивать сервер о результатах
            startPolling(currentTaskId);
            
        } catch (error) {
            console.error('Ошибка:', error);
            statusText.textContent = `Ошибка: ${error.message}`;
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = '#e74c3c';
            uploadBtn.disabled = false;
        }
    }
    
    // Функция для периодического опроса статуса задачи
    function startPolling(taskId) {
        // Останавливаем предыдущий опрос, если он был
        stopPolling();
        
        let retries = 0;
        const maxRetries = 30; // Максимальное количество попыток
        
        // Начинаем новый опрос
        pollingInterval = setInterval(async () => {
            try {
                if (retries >= maxRetries) {
                    throw new Error('Превышено время ожидания результатов');
                }
                
                retries++;
                
                const response = await fetch(`${API_URL}/task/${taskId}`);
                
                if (!response.ok) {
                    // Если ответ не 200, пробуем снова
                    console.log(`Попытка ${retries}/${maxRetries}: Статус ${response.status}`);
                    return;
                }
                
                const taskData = await response.json();
                
                // Проверяем статус задачи
                if (taskData.status === 'completed') {
                    // Задача завершена успешно
                    progressBar.style.width = '100%';
                    statusText.textContent = 'Проверка завершена!';
                    showResults(taskData);
                    stopPolling();
                    uploadBtn.disabled = false;
                } 
                else if (taskData.status === 'error') {
                    // Произошла ошибка при обработке
                    progressBar.style.width = '100%';
                    progressBar.style.backgroundColor = '#e74c3c';
                    statusText.textContent = `Ошибка: ${taskData.message || 'Неизвестная ошибка'}`;
                    stopPolling();
                    uploadBtn.disabled = false;
                }
                else {
                    // Задача еще выполняется
                    const progressPercent = 50 + Math.min(retries * 1.5, 40); // от 50% до 90%
                    progressBar.style.width = `${progressPercent}%`;
                    statusText.textContent = `Выполняется проверка... (${retries} сек)`;
                }
                
            } catch (error) {
                console.error('Ошибка при проверке статуса:', error);
                stopPolling();
                statusText.textContent = `Ошибка: ${error.message}`;
                progressBar.style.backgroundColor = '#e74c3c';
                uploadBtn.disabled = false;
            }
        }, 1000); // Опрашиваем сервер каждую секунду
    }
    
    // Функция остановки опроса
    function stopPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }
    
    // Функция отображения результатов
    function showResults(result) {
        resultsContainer.style.display = 'block';
        
        let resultText = '';
        
        if (result && result.result) {
            const resultStr = result.result;
            const warningsMatch = resultStr.match(/Warnings: (\d+)/);
            const errorsMatch = resultStr.match(/Errors: (\d+)/);
            
            const warnings = warningsMatch ? parseInt(warningsMatch[1]) : 0;
            const errors = errorsMatch ? parseInt(errorsMatch[1]) : 0;
            
            resultText = `<div>Результат проверки:</div>
                         <div class="${warnings > 0 ? 'warning' : 'success'}">Предупреждения: ${warnings}</div>
                         <div class="${errors > 0 ? 'error' : 'success'}">Ошибки: ${errors}</div>`;
            
            if (errors === 0 && warnings === 0) {
                resultText += `<div class="success" style="margin-top: 10px">Ваш код прошел проверку без замечаний!</div>`;
            } else {
                resultText += `<div style="margin-top: 10px">
                ${errors > 0 
                    ? `<div class="error">Обнаружены ошибки в коде. Рекомендуется их исправить.</div>` 
                    : ''}
                ${warnings > 0 
                    ? `<div class="warning">Обнаружены предупреждения. Рекомендуется улучшить код.</div>` 
                    : ''}
            </div>`;
        }
        
        // Если есть подробные сообщения
        if (result.details) {
            resultText += `<div style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;">
                <strong>Подробности:</strong>
                <pre>${result.details}</pre>
            </div>`;
        }
    } else if (result && result.message) {
        // Если вернулось только сообщение
        resultText = `<div>Сообщение: ${result.message}</div>`;
    } else {
        // Если формат результата неизвестен
        resultText = `<div>Результат проверки: ${JSON.stringify(result)}</div>`;
    }
    
    resultsBox.innerHTML = resultText;
    
    // Прокручиваем до результатов
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

// Кнопка сброса всех файлов
const resetButton = document.createElement('button');
resetButton.textContent = 'Очистить все файлы';
resetButton.style.backgroundColor = '#95a5a6';
resetButton.style.marginTop = '10px';

resetButton.addEventListener('click', function() {
    files = [];
    updateFileList();
    fileInput.value = '';
});

document.querySelector('.upload-container').appendChild(resetButton);

// Добавляем возможность перетаскивать файлы по всему окну
document.body.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('highlight');
});

document.body.addEventListener('dragleave', function(e) {
    e.preventDefault();
    e.stopPropagation();
    // Проверяем, что мышь действительно покинула окно
    const rect = document.body.getBoundingClientRect();
    if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
    ) {
        return;
    }
    dropZone.classList.remove('highlight');
});

document.body.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('highlight');
    
    // Обрабатываем только если файлы были сброшены на страницу
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const droppedFiles = Array.from(e.dataTransfer.files);
        files = [...files, ...droppedFiles];
        updateFileList();
    }
});

// Функция для проверки совместимости браузера
function checkBrowserCompatibility() {
    // Проверяем поддержку Fetch API
    if (!window.fetch) {
        alert('Ваш браузер не поддерживает современные веб-технологии. Пожалуйста, обновите браузер для использования этого приложения.');
        return false;
    }
    return true;
}

// Функция для обработки ошибок сети
function handleNetworkError() {
    window.addEventListener('offline', function() {
        alert('Отсутствует подключение к интернету. Пожалуйста, проверьте ваше соединение и попробуйте снова.');
        uploadBtn.disabled = true;
    });
    
    window.addEventListener('online', function() {
        uploadBtn.disabled = files.length === 0;
    });
}

// Добавляем пользовательские стили для перетаскивания
const style = document.createElement('style');
style.textContent = `
    .custom-file-input.highlight {
        background-color: #d6edf9;
        border-color: #3498db;
        box-shadow: 0 0 10px rgba(52, 152, 219, 0.3);
    }
    
    @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.4); }
        70% { box-shadow: 0 0 0 10px rgba(52, 152, 219, 0); }
        100% { box-shadow: 0 0 0 0 rgba(52, 152, 219, 0); }
    }
    
    .pulse {
        animation: pulse 1.5s infinite;
    }
`;
document.head.appendChild(style);

// Проверяем совместимость браузера при загрузке
if (checkBrowserCompatibility()) {
    handleNetworkError();
    updateFileList();
}
});
