const apiUrl = 'http://127.0.0.1:8000/admin/labs'; // URL списка лабораторных

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
    gtest: labNum => `http://127.0.0.1:8000/api/labs/${labNum}/tests`,
    clang_tidy: () => `http://127.0.0.1:8000/api/labs/clang-tidy`,
    interface: labNum => `http://127.0.0.1:8000/api/labs/LR${labNum}/interface`,
};

let labsData = [];
let currentLabNum = null;
let editor = null;
let prevContent = '';
let aiMessages = [];

// Инициализация
(async function init() {
    try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error();
        labsData = await res.json();
        renderLabsList();
    } catch {
        alert('Ошибка при загрузке списка лабораторных!');
    }
})();

async function getInterfaceContent(labNum) {
    try {
        const res = await fetch(filesForLab.interface(labNum));
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
        li.textContent = name;
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => openModal(idx, name));
        labsList.appendChild(li);
    });
}

const fileSelect = document.getElementById('file-select');
let currentFileKey = 'gtest'; // по умолчанию

// Открыть модальное окно и загрузить файл
async function openModal(idx, name) {
    const match = name.match(/\d+/);
    if (!match) return alert('Не удалось определить номер лабораторной!');
    currentLabNum = match[0];
    modal.style.display = 'block';

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
        const res = await fetch(url);
        if (!res.ok) throw new Error('Не удалось загрузить файл');
        const text = await res.text();
        if (editor) editor.setValue(text);
        else loadMonacoEditor(text);
        prevContent = text;
    } catch {
        const defaultText = '// Не удалось загрузить файл. Начните редактирование с пустого файла.';
        if (editor) editor.setValue(defaultText);
        else loadMonacoEditor(defaultText);
        alert('Не удалось загрузить файл ' + fileKey);
    }
}

// Инициализация Monaco Editor
function loadMonacoEditor(initialValue) {
    require.config({paths: {vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'}});
    require(['vs/editor/editor.main'], () => {
        editor = monaco.editor.create(document.getElementById(editorContainerId), {
            value: initialValue,
            language: 'cpp',
            theme: 'vs-dark',
            automaticLayout: true,
            fontSize: 11,
            minimap: {enabled: false},
            scrollBeyondLastLine: false,
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
    if (e.target === modal) modal.style.display = 'none';
});

// Кнопка “Принять изменения” из AI
acceptChangesBtn.addEventListener('click', () => {
    if (!editor) return alert('Редактор не инициализирован!');

    const lastAiMessage = [...chatHistory.querySelectorAll('.ai-message')].pop();
    if (!lastAiMessage) return alert('Нет сообщений от нейросети для принятия.');
    if (lastAiMessage.dataset.accepted === 'true') return alert('Изменения из этого сообщения уже были приняты.');

    const codeBlocks = lastAiMessage.querySelectorAll('pre code');
    if (!codeBlocks.length) return alert('В последнем ответе нейросети нет кода для добавления.');

    let currentValue = editor.getValue();
    codeBlocks.forEach(codeBlock => {
        const code = codeBlock.textContent.trim();
        if (code) {
            currentValue += (currentValue.endsWith('\n') ? '' : '\n') + '\n' + code;
        }
    });

    editor.setValue(currentValue);
    lastAiMessage.dataset.accepted = 'true';
    alert('Код из ответа нейросети добавлен в конец редактора.');
    saveEditorContent();
});


// Сохраняет содержимое редактора
function saveEditorContent() {
    if (!editor) return alert('Редактор не инициализирован!');

    const content = editor.getValue();

    let url;
    if (currentFileKey === 'clang_tidy') {
        url = filesForLab['clang_tidy']();
    } else {

        url = filesForLab[fileSelect.value](currentLabNum);
    }

    fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'text/plain'},
        body: content,
    }).then(async res => {
        if (res.ok) {
            alert('Файл успешно сохранён!');
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
            alert('Ошибка при сохранении файла: ' + errorMessage);
        }
    })
        .catch(() => {
            editor.setValue(prevContent);
            alert('Ошибка при отправке запроса на сохранение!');
        });
}

saveBtn.addEventListener('click', saveEditorContent);

function appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = role === 'user' ? 'user-message' : 'ai-message';
    div.textContent = text;
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

    async function sendRequest() {
        const aiDiv = appendMessage('ai', '');

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
            const response = await fetch('http://127.0.0.1:8000/admin/ai', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(aiMessages)
            });

            if (!response.body) {
                aiDiv.textContent = 'Ошибка: поток недоступен!';
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
                    aiDiv.textContent = 'Требуется повторная авторизация...';
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
            aiDiv.textContent = 'Ошибка связи с ИИ!';
        } finally {
            resetControls();
        }
    }

    function resetControls() {
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
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
                <div style="background:white; padding:20px; border-radius:8px; max-width:400px; width:90%;">
                    <p>Введите код подтверждения из почты:</p>
                    <input id="reauth-code-input" type="text" style="width:100%; padding:8px; margin-bottom:10px;" />
                    <button id="reauth-submit-btn" style="padding:8px 16px;">Отправить</button>
                </div>`;
            document.body.appendChild(authModal);
        }
        authModal.style.display = 'flex';

        const input = authModal.querySelector('#reauth-code-input');
        const btn = authModal.querySelector('#reauth-submit-btn');

        btn.onclick = async () => {
            const code = input.value.trim();
            if (!code) return alert('Пожалуйста, введите код');
            btn.disabled = true;

            try {
                const resp = await fetch('provide-code', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(code)
                });
                if (resp.ok) {
                    authModal.style.display = 'none';
                    resolve(true);
                } else {
                    alert('Ошибка отправки кода');
                    btn.disabled = false;
                }
            } catch {
                alert('Ошибка соединения с сервером');
                btn.disabled = false;
            }
        };
    });
}


// ===== Группы =====

const groupsListDiv = document.getElementById('groups-list');

// Получить и отобразить группы
async function fetchAndRenderGroups() {
    try {
        const res = await fetch('/api/groups');
        if (!res.ok) throw new Error();
        const groups = await res.json();
        renderGroups(groups);
    } catch {
        groupsListDiv.innerHTML = '<div style="color:#d9534f;text-align:center;">Ошибка при загрузке списка групп!</div>';
    }
}

function renderGroups(groups) {
    groupsListDiv.innerHTML = '';
    groups.forEach(group => {
        const div = document.createElement('div');
        div.className = 'groups-tile';
        div.textContent = group;
        div.addEventListener('click', () => {
            // Здесь переход на страницу группы. Можно window.location, либо SPA
            window.location.href = `/group/${encodeURIComponent(group)}`;
            // или сделайте SPA и откройте соответствующий div
        });
        groupsListDiv.appendChild(div);
    });
}

// Вызвать при старте
fetchAndRenderGroups();
