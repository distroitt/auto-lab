const apiUrl = '/admin/labs'; // URL списка лабораторных

const labsList = document.getElementById('labs-list');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('close-modal');
const saveBtn = document.getElementById('save-btn');
const editorContainerId = 'editor';

const acceptChangesBtn = document.getElementById('accept-changes-btn');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatHistory = document.getElementById('chat-history');

const filesForLab = {
    gtest: labNum => `/api/labs/${labNum}/tests`,
    clang_tidy: () => `/api/labs/clang-tidy`,
    interface: labNum => `/api/labs/LR${labNum}/interface`,
};

let labsData = [];
let currentLabNum = null;
let editor = null;
let prevContent = '';
let aiMessages = [];

// Инициализация
(async function init() {
    try {
        const res = await fetch(window.env.API_BASE_URL + "/admin/labs");
        if (!res.ok) throw new Error();
        labsData = await res.json();
        renderLabsList();
    } catch {
        showNotification('Ошибка при загрузке списка лабораторных!', 'error');
    }
})();

async function getInterfaceContent(labNum) {
    try {
        const res = await fetch(window.env.API_BASE_URL + filesForLab.interface(labNum));
        if (!res.ok) throw new Error();
        return await res.text();
    } catch {
        return '// Не удалось загрузить интерфейс.';
    }
}

// Рендерит список лабораторных
function renderLabsList() {
    labsList.innerHTML = '';
    labsData.forEach((name, idx) => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.innerHTML = `<i class="fas fa-vial"></i>${name}`;
        li.addEventListener('click', () => openModal(idx, name));
        labsList.appendChild(li);
    });
}

const fileSelect = document.getElementById('file-select');
let currentFileKey = 'gtest'; // по умолчанию

// Открыть модальное окно и загрузить файл
async function openModal(idx, name) {
    const match = name.match(/\d+/);
    if (!match) return showNotification('Не удалось определить номер лабораторной!', 'error');
    currentLabNum = match[0];
    modal.style.display = 'block';
    document.querySelector('.modal-title').textContent = `Редактирование: ${name}`;

    currentFileKey = fileSelect.value || 'gtest';
    await loadFileContent(currentLabNum, currentFileKey);
}

fileSelect.addEventListener('change', async () => {
    if (!currentLabNum) return;
    currentFileKey = fileSelect.value;
    aiMessages = [];
    chatHistory.innerHTML = '';
    await loadFileContent(currentLabNum, currentFileKey);
});

async function loadFileContent(labNum, fileKey) {
    try {
        const url = fileKey === 'clang_tidy'
            ? filesForLab[fileKey]()
            : filesForLab[fileKey](labNum);
        const res = await fetch(window.env.API_BASE_URL + url);
        if (!res.ok) throw new Error('Не удалось загрузить файл');
        const text = await res.text();
        if (editor) editor.setValue(text);
        else loadMonacoEditor(text);
        prevContent = text;
    } catch {
        const defaultText = '// Не удалось загрузить файл. Начните редактирование с пустого файла.';
        if (editor) editor.setValue(defaultText);
        else loadMonacoEditor(defaultText);
        showNotification('Не удалось загрузить файл ' + fileKey, 'error');
    }
}

// Инициализация Monaco Editor
// Инициализация Monaco Editor
function loadMonacoEditor(initialValue) {
    console.log(currentLabNum);
    //document.getElementById("lab_name").innerHTML += `${currentLabNum}`;
    require.config({paths: {vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'}});
    require(['vs/editor/editor.main'], () => {
        editor = monaco.editor.create(document.getElementById(editorContainerId), {
            value: initialValue,
            language: 'cpp',
            theme: 'vs-dark',
            automaticLayout: true,
            fontSize: 11, // Уменьшаем размер шрифта
            lineHeight: 16, // Уменьшаем высоту строки
            minimap: {enabled: false}, // Отключаем мини-карту для экономии места
            scrollBeyondLastLine: false,
            folding: true, // Включаем сворачивание блоков кода
            lineNumbers: 'on',
            glyphMargin: false, // Отключаем отступ для значков
            contextmenu: true
        });
    });
}

// Закрытие модального окна
closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
    aiMessages = [];
    chatHistory.innerHTML = '';
});

window.addEventListener('click', e => {
    if (e.target === modal) {
        modal.style.animation = 'fadeOut 0.3s';
        setTimeout(() => {
            modal.style.display = 'none';
            modal.style.animation = '';
        }, 300);
    }
});

// Кнопка "Принять изменения" из AI
acceptChangesBtn.addEventListener('click', () => {
    if (!editor) return showNotification('Редактор не инициализирован!', 'error');

    const lastAiMessage = [...chatHistory.querySelectorAll('.ai-message')].pop();
    if (!lastAiMessage) return showNotification('Нет сообщений от нейросети для принятия', 'error');
    if (lastAiMessage.dataset.accepted === 'true') return showNotification('Изменения из этого сообщения уже были приняты', 'info');

    const codeBlocks = lastAiMessage.querySelectorAll('pre code');
    if (!codeBlocks.length) return showNotification('В последнем ответе нейросети нет кода для добавления', 'info');

    let currentValue = editor.getValue();
    codeBlocks.forEach(codeBlock => {
        const code = codeBlock.textContent.trim();
        if (code) {
            currentValue += (currentValue.endsWith('\n') ? '' : '\n') + '\n' + code;
        }
    });

    editor.setValue(currentValue);
    lastAiMessage.dataset.accepted = 'true';
    showNotification('Код из ответа нейросети добавлен в конец редактора', 'success');
});

// Сохраняет содержимое редактора
function saveEditorContent() {
    if (!editor) return showNotification('Редактор не инициализирован!', 'error');

    const content = editor.getValue();

    let url;
    if (currentFileKey === 'clang_tidy') {
        url = filesForLab['clang_tidy']();
    } else {
        url = filesForLab[fileSelect.value](currentLabNum);
    }

    fetch(window.env.API_BASE_URL + url, {
        method: 'POST',
        headers: {'Content-Type': 'text/plain'},
        body: content,
    }).then(async res => {
        if (res.ok) {
            showNotification('Файл успешно сохранён!', 'success');
            prevContent = content;
        } else {
            let errorMessage = 'Неизвестная ошибка';
            try {
                const data = await res.json();
                if (data.detail) errorMessage = data.detail;
            } catch {
                try {
                    errorMessage = await res.text();
                } catch {
                }
            }
            editor.setValue(prevContent);
            showNotification('Ошибка при сохранении файла: ' + errorMessage, 'error');
        }
    })
        .catch(() => {
            editor.setValue(prevContent);
            showNotification('Ошибка при отправке запроса на сохранение!', 'error');
        });
}

saveBtn.addEventListener('click', saveEditorContent);

function appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = role === 'user' ? 'user-message' : 'ai-message';

    if (role === 'user') {
        div.textContent = text;
    } else {
        div.innerHTML = marked.parse(text);
    }

    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return div;
}

chatSendBtn.addEventListener('click', async () => {
    const msg = chatInput.value.trim();
    if (!msg) return;

    appendMessage('user', msg);
    chatInput.value = '';
    chatInput.disabled = true;
    chatSendBtn.disabled = true;
    chatSendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';

    async function sendRequest() {
        const aiDiv = appendMessage('ai', '<i class="fas fa-spinner fa-spin"></i> Генерация ответа...');

        // Для первой отправки контекста истории, если пусто — заполняем служебными сообщениями
        if (aiMessages.length === 0) {
            aiMessages.push({
                role: 'user',
                content: [{
                    type: 'text',
                    text: 'Мы будем анализировать этот файл' + (editor ? editor.getValue() : '')
                }]
            });
            if (currentFileKey != 'interface') {
                interfaceText = await getInterfaceContent(currentLabNum);
                aiMessages.push({
                    role: 'user',
                    content: [{
                        type: 'text',
                        text: 'Оригинальный интерфейс лабораторной работы:\n' + interfaceText
                    }]
                });
            }
            // Пример для gtest
            if (currentFileKey === 'gtest') {
                aiMessages.push({
                    role: 'user',
                    content: [{
                        type: 'text',
                        text:
                            `Если я попрошу тебя добавить еще тесты, добавляй их только в таком формате TYPED_TEST(MyInterfaceTest, ComputeIsConsistent) {
  this->impl.pushBack(5);
  EXPECT_EQ((int)this->impl.size(), 1);
  this->impl.pushBack(156);
  EXPECT_EQ((int)this->impl.size(), 2);
  EXPECT_EQ(this->impl.get(0), 5);
  При этом обязательно нужно добавлять тесты только для тех методов, которые присутствуют в интерфейсе
}`
                    }]
                });
            }
        }

        // Добавляем сообщение пользователя в историю
        aiMessages.push({
            role: 'user',
            content: [{type: 'text', text: msg}]
        });

        try {
            const response = await fetch(window.env.API_BASE_URL + '/admin/ai', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(aiMessages)
            });

            if (!response.body) {
                aiDiv.innerHTML = 'Ошибка: поток недоступен!';
                return resetControls();
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let aiText = '';

            while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                aiText += decoder.decode(value, {stream: true});

                // Проверка на повторную авторизацию
                if (aiText.includes('[REAUTH_REQUIRED]')) {
                    aiDiv.innerHTML = '<i class="fas fa-key"></i> Требуется повторная авторизация...';
                    reader.cancel();

                    await showReauthModal();

                    chatHistory.removeChild(aiDiv);
                    resetControls();

                    await sendRequest();
                    return;
                }

                aiDiv.innerHTML = marked.parse(aiText);
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }

            // После получения полного ответа добавляем его в историю
            aiMessages.push({
                role: 'assistant',
                content: [{type: 'text', text: aiText}]
            });

        } catch {
            aiDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Ошибка связи с ИИ!';
        } finally {
            resetControls();
        }
    }

    function resetControls() {
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        chatSendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Отправить';
    }

    await sendRequest();
});

// ENTER для отправки (с Shift+Enter — новая строка)
chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatSendBtn.click();
    }
});

// Модальное окно для повторной авторизации
async function showReauthModal() {
    return new Promise(resolve => {
        let authModal = document.getElementById('reauth-modal');
        if (!authModal) {
            authModal = document.createElement('div');
            authModal.id = 'reauth-modal';
            Object.assign(authModal.style, {
                display: 'flex',
                position: 'fixed',
                zIndex: 9999,
                left: 0,
                top: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
            });
            authModal.innerHTML = `
                        <div style="background:white; padding:25px; border-radius:8px; max-width:400px; width:90%; box-shadow: 0 5px 25px rgba(0,0,0,0.2);">
                            <h3 style="margin-top:0; color:var(--primary-color); margin-bottom:15px;">Авторизация</h3>
                            <p style="margin-bottom:15px;">Введите код подтверждения из почты:</p>
                            <input id="reauth-code-input" type="text" style="width:100%; padding:10px; margin-bottom:15px; border-radius:5px; border:1px solid #ddd;" />
                            <button id="reauth-submit-btn" style="padding:10px 16px; background:var(--primary-color); color:white; border:none; border-radius:5px; cursor:pointer; width:100%;">
                                <i class="fas fa-key"></i> Отправить
                            </button>
                        </div>`;
            document.body.appendChild(authModal);
        }
        authModal.style.display = 'flex';

        const input = authModal.querySelector('#reauth-code-input');
        const btn = authModal.querySelector('#reauth-submit-btn');

        btn.onclick = async () => {
            const code = input.value.trim();
            if (!code) return showNotification('Пожалуйста, введите код', 'error');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обработка...';

            try {
                const resp = await fetch(window.env.API_BASE_URL + '/provide-code', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(code)
                });
                if (resp.ok) {
                    authModal.style.display = 'none';
                    showNotification('Авторизация успешна', 'success');
                    resolve(true);
                } else {
                    showNotification('Ошибка отправки кода', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-key"></i> Отправить';
                }
            } catch {
                showNotification('Ошибка соединения с сервером', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-key"></i> Отправить';
            }
        };
    });
}

// ===== Группы =====
const groupsListDiv = document.getElementById('groups-list');

// Получить и отобразить группы
async function fetchAndRenderGroups() {
    try {
        const res = await fetch(window.env.API_BASE_URL + '/api/groups');
        if (!res.ok) throw new Error();
        const groups = await res.json();
        renderGroups(groups);
    } catch {
        groupsListDiv.innerHTML = '<div style="color:#d9534f;text-align:center;padding:15px;"><i class="fas fa-exclamation-circle"></i> Ошибка при загрузке списка групп!</div>';
    }
}

function renderGroups(groups) {
    groupsListDiv.innerHTML = '';
    groups.forEach(group => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `<i class="fas fa-users"></i>${group}`;
        div.addEventListener('click', () => {
            window.location.href = `/group/${encodeURIComponent(group)}`;
        });
        groupsListDiv.appendChild(div);
    });
}

// Функция для показа уведомлений, обновленная версия
function showNotification(message, type = 'info') {
    // Сначала удаляем все существующие уведомления
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    });

    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.classList.add('notification', `notification-${type}`);

    // Добавляем иконку в зависимости от типа
    let icon = '';
    if (type === 'success') {
        icon = '<i class="fas fa-check-circle"></i>';
    } else if (type === 'error') {
        icon = '<i class="fas fa-exclamation-circle"></i>';
    } else {
        icon = '<i class="fas fa-info-circle"></i>';
    }

    // Добавляем кнопку закрытия
    notification.innerHTML = `
                ${icon}
                <span>${message}</span>
                <span class="notification-close">&times;</span>
            `;

    document.body.appendChild(notification);

    // Находим кнопку закрытия и добавляем событие
    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    });

    // Показываем уведомление после небольшой задержки
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Автоматически скрываем уведомление через 5 секунд
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}

// Добавляем анимацию для модального окна
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.style.display === 'block') {
        modal.style.animation = 'fadeOut 0.3s';
        setTimeout(() => {
            modal.style.display = 'none';
            modal.style.animation = '';
        }, 300);
    }
});
// Добавьте эти строки в основной JavaScript код

// Обработка нажатий на кнопки в шапке
document.getElementById('home-btn').addEventListener('click', function() {
    window.location.href = '/'; // Перенаправление на главную страницу
});

// Вызвать инициализацию при загрузке
fetchAndRenderGroups();
