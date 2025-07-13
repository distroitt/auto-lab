import {showNotification} from "./notification.js";

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
  gtest: labNum => `/api/labs/LR${labNum}/tests`,
  clang_tidy: () => `/api/labs/clang-tidy`,
  interface: labNum => `/api/labs/LR${labNum}/interface`,
};

let labsData = [];
let currentLabNum = null;
let editor = null;
let prevContent = '';
let aiMessages = [];
let monacoLoaded = false;

function initializeMonacoEditor() {
  return new Promise((resolve) => {
    if (monacoLoaded) {
      resolve();
      return;
    }
    require.config({paths: {vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'}});
    require(['vs/editor/editor.main'], () => {
      monacoLoaded = true;
      resolve();
    });
  });
}

async function loadMonacoEditor(initialValue) {
  await initializeMonacoEditor();
  if (editor) {
    editor.setValue(initialValue);
    return;
  }
  editor = monaco.editor.create(document.getElementById(editorContainerId), {
    value: initialValue,
    language: 'cpp',
    theme: 'vs-dark',
    automaticLayout: true,
    fontSize: 11,
    lineHeight: 16,
    minimap: {enabled: false},
    scrollBeyondLastLine: false,
    folding: true,
    lineNumbers: 'on',
    glyphMargin: false,
    contextmenu: true
  });
}

(async function init() {
  try {
    const res = await fetch(window.env.API_BASE_URL + "/api/labs");
    if (!res.ok) throw new Error();
    labsData = await res.json();
    renderLabsList();
  } catch {
    showNotification('Ошибка при загрузке списка лабораторных!', 'error');
  }
})();

function renderLabsList() {
  labsList.innerHTML = '';
  labsData.forEach((name, idx) => {
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `<i class="fas fa-vial" aria-hidden="true"></i>${name}`;
    li.addEventListener('click', () => openModal(idx, name));
    labsList.appendChild(li);
  });
}

const fileSelect = document.getElementById('file-select');
let currentFileKey = 'gtest'; // по умолчанию
let fileSelectTimeout = null;

fileSelect.addEventListener('change', () => {
  if (!currentLabNum) return;
  if (fileSelectTimeout) clearTimeout(fileSelectTimeout);
  fileSelectTimeout = setTimeout(async () => {
    currentFileKey = fileSelect.value;
    aiMessages = [];
    chatHistory.innerHTML = '';
    await loadFileContent(currentLabNum, currentFileKey);
  }, 300);
});

async function openModal(idx, name) {
  const match = name.match(/\d+/);
  if (!match) return showNotification('Не удалось определить номер лабораторной!', 'error');
  currentLabNum = match[0];
  modal.style.display = 'block';
  modal.focus();
  document.querySelector('.modal-title').textContent = `Редактирование: ${name}`;

  currentFileKey = fileSelect.value || 'gtest';
  aiMessages = [];
  chatHistory.innerHTML = '';
  await loadFileContent(currentLabNum, currentFileKey);
}

async function loadFileContent(labNum, fileKey) {
  try {
    const url = fileKey === 'clang_tidy'
      ? filesForLab[fileKey]()
      : filesForLab[fileKey](labNum);
    const res = await fetch(window.env.API_BASE_URL + url);
    if (!res.ok) throw new Error('Не удалось загрузить файл');
    const text = await res.text();
    await loadMonacoEditor(text);
    prevContent = text;
  } catch {
    const defaultText = '// Не удалось загрузить файл. Начните редактирование с пустого файла.';
    await loadMonacoEditor(defaultText);
    showNotification('Не удалось загрузить файл ' + fileKey, 'error');
  }
}

closeModal.addEventListener('click', closeModalFunc);

window.addEventListener('click', e => {
  if (e.target === modal) closeModalFunc();
});

window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modal.style.display === 'block') closeModalFunc();
});

function closeModalFunc() {
  modal.style.animation = 'fadeOut 0.3s';
  setTimeout(() => {
    modal.style.display = 'none';
    modal.style.animation = '';
    aiMessages = [];
    chatHistory.innerHTML = '';
  }, 300);
}

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

saveBtn.addEventListener('click', saveEditorContent);

function saveEditorContent() {
  if (!editor) return showNotification('Редактор не инициализирован!', 'error');

  const content = editor.getValue();

  let url = currentFileKey === 'clang_tidy'
    ? filesForLab['clang_tidy']()
    : filesForLab[currentFileKey](currentLabNum);

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
        } catch {}
      }
      editor.setValue(prevContent);
      showNotification(errorMessage, 'error');
    }
  })
  .catch(() => {
    editor.setValue(prevContent);
    showNotification('Ошибка при отправке запроса на сохранение!', 'error');
  });
}

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

    if (aiMessages.length === 0) {
      aiMessages.push({
        role: 'user',
        content: [{
          type: 'text',
          text: 'Мы будем анализировать этот файл' + (editor ? editor.getValue() : '')
        }]
      });
      if (currentFileKey !== 'interface') {
        const interfaceText = await getInterfaceContent(currentLabNum);
        aiMessages.push({
          role: 'user',
          content: [{
            type: 'text',
            text: 'Оригинальный интерфейс лабораторной работы:\n' + interfaceText
          }]
        });
      }
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

chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatSendBtn.click();
  }
});

async function getInterfaceContent(labNum) {
  try {
    const res = await fetch(window.env.API_BASE_URL + filesForLab.interface(labNum));
    if (!res.ok) throw new Error();
    return await res.text();
  } catch {
    return '// Не удалось загрузить интерфейс.';
  }
}

let authModal = null;
async function showReauthModal() {
  return new Promise(resolve => {
    if (!authModal) {
      authModal = document.createElement('div');
      authModal.id = 'reauth-modal';
      Object.assign(authModal.style, {
        display: 'flex',
        position: 'fixed',
        zIndex: 9999,
        inset: '0',
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

      const input = authModal.querySelector('#reauth-code-input');
      const btn = authModal.querySelector('#reauth-submit-btn');

      btn.onclick = async () => {
        const code = input.value.trim();
        if (!code) {
          showNotification('Пожалуйста, введите код', 'error');
          return;
        }
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
            input.value = '';
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-key"></i> Отправить';
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
    }
    authModal.style.display = 'flex';
  });
}

// ===== Группы =====
const groupsListDiv = document.getElementById('groups-list');

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

fetchAndRenderGroups();
