import { showNotification } from "./notification.js";

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("file-input");
  const fileList = document.getElementById("file-list");
  const uploadBtn = document.getElementById("upload-btn");
  const labSelect = document.getElementById("lab-select");
  const statusContainer = document.getElementById("status-container");
  const progressBar = document.getElementById("progress");
  const statusText = document.getElementById("status-text");
  const resultsContainer = document.getElementById("results-container");
  const resetBtn = document.getElementById("reset-btn");

  let files = [];
  let currentTaskId = null;
  let pollingInterval = null;

  async function init() {
    bindEvents();
    updateFileList();
    await loadLabs();
    updateUploadButtonState();
  }

  function bindEvents() {
    fileInput.addEventListener("change", onFileInputChange);
    uploadBtn.addEventListener("click", uploadFiles);
    labSelect.addEventListener("change", onLabSelectChange);
    fileList.addEventListener("click", onFileListClick);
    resetBtn.addEventListener("click", clearAll);
  }

  async function loadLabs() {
    try {
      const response = await fetch(`${window.env.API_BASE_URL}/api/labs`);
      if (response.status === 401) {
        showNotification("Для загрузки задач необходимо войти в систему", "error");
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
        return;
      }
      const labs = await response.json();
      labSelect.innerHTML =
        '<option value="" disabled selected>Выберите лабораторную работу</option>';
      labs.forEach((lab) => {
        const opt = document.createElement("option");
        opt.value = lab;
        opt.textContent = lab;
        labSelect.appendChild(opt);
      });
      labSelect.disabled = false;
    } catch (err) {
      console.error(err);
      showNotification("Не удалось загрузить лабораторные", "error");
      labSelect.innerHTML = '<option disabled>Не удалось загрузить лабораторные</option>';
      labSelect.disabled = true;
    }
  }

  async function onLabSelectChange() {
    removeInterfaceFile();
    updateFileList();

    if (labSelect.value) {
      await fetchAndAddInterfaceFile(labSelect.value);
    }
    updateUploadButtonState();
  }

  function onFileInputChange(e) {
    const newFiles = Array.from(e.target.files).filter(
      (file) => file.name !== "interface.h"
    );
    files = [...files, ...newFiles];
    updateFileList();
  }

  function onFileListClick(e) {
    if (e.target.classList.contains("remove-file")) {
      const index = +e.target.dataset.index;
      const removedFile = files[index];
      if (removedFile?.name === "interface.h") {
        showNotification(
          "Удаление файла интерфейса невозможно, он добавляется автоматически",
          "warning"
        );
        return;
      }
      files.splice(index, 1);
      updateFileList();
    }
  }

  function removeInterfaceFile() {
    files = files.filter((f) => f.name !== "interface.h");
  }

  async function fetchAndAddInterfaceFile(labId) {
    try {
      const res = await fetch(`${window.env.API_BASE_URL}/api/labs/${labId}/interface`);
      if (!res.ok) {
        showNotification("Не удалось получить файл интерфейса", "error");
        return;
      }
      const text = await res.text();
      const interfaceFile = new File([text], "interface.h", { type: "text/plain" });

      if (!files.some((f) => f.name === interfaceFile.name && f.size === interfaceFile.size)) {
        files = [interfaceFile, ...files];
        updateFileList();
      }
    } catch (err) {
      console.error(err);
      showNotification("Ошибка при получении файла интерфейса", "error");
    }
  }

  function updateFileList() {
    fileList.innerHTML = "";
    if (!files.length) {
      const li = document.createElement("li");
      li.textContent = "Файлы не выбраны";
      fileList.appendChild(li);
    } else {
      files.forEach((file, index) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <span title="${file.name}">
            <i class="fas fa-file-code" aria-hidden="true"></i> 
            ${file.name} <small>(${formatFileSize(file.size)})</small>
          </span>
          <button class="remove-file" data-index="${index}" aria-label="Удалить файл ${file.name}">✕</button>
        `;
        fileList.appendChild(li);
      });
    }
    updateUploadButtonState();
  }

  function updateUploadButtonState() {
    // Должна быть выбрана лабораторная и хотя бы один файл, помимо interface.h
    const hasUserFiles = files.some((f) => f.name !== "interface.h");
    const enabled = labSelect.value && hasUserFiles;
    uploadBtn.disabled = !enabled;
    uploadBtn.setAttribute("aria-disabled", !enabled);
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return "0 Байт";
    const k = 1024;
    const sizes = ["Байт", "КБ", "МБ", "ГБ"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  async function uploadFiles() {
    if (uploadBtn.disabled) return;

    stopPolling();
    resultsContainer.hidden = true;
    statusContainer.hidden = false;
    progressBar.style.backgroundColor = "#3498db";
    setProgress(0);
    statusText.textContent = "Подготовка файлов...";
    uploadBtn.disabled = true;

    // Проверка файлов на размер (например до 20 МБ общий)
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    const maxSize = 20 * 1024 * 1024;
    if (totalSize > maxSize) {
      showNotification("Размер файлов не должен превышать 20 МБ", "error");
      uploadBtn.disabled = false;
      statusContainer.hidden = true;
      return;
    }

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      // Получаем имя интерфейса
      const interfaceResp = await fetch(
        `${window.env.API_BASE_URL}/api/labs/${labSelect.value}/interface_name`
      );
      if (!interfaceResp.ok) {
        throw new Error("Ошибка загрузки интерфейса");
      }
      const interfaceName = await interfaceResp.json();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(
        `${window.env.API_BASE_URL}/api/upload?interface_name=${encodeURIComponent(
          interfaceName
        )}&lab_num=${encodeURIComponent(labSelect.value)}`,
        {
          method: "POST",
          body: formData,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorMsg = await extractErrorMessage(response);
        throw new Error(errorMsg);
      }

      const respData = await response.json();
      statusContainer.scrollIntoView({ behavior: "smooth", block: "center" });

      if (!respData.task_id) {
        if (respData.short_result) {
          setProgress(100);
          showNotification("Проверка завершена!", "success");
          await showResults(respData);
          uploadBtn.disabled = false;
          return;
        }
        throw new Error("Сервер не вернул ID задачи или результат");
      }

      currentTaskId = respData.task_id;
      setProgress(50);
      statusText.textContent = "Выполняется проверка кода...";
      startPolling(currentTaskId);
    } catch (error) {
      console.error(error);
      showNotification(
        error.message ? error.message.split(":")[1]?.trim() || error.message : "Неизвестная ошибка",
        "error"
      );
      setProgress(100, "#e74c3c");
      statusContainer.hidden = true;
      uploadBtn.disabled = false;
    }
  }

  async function extractErrorMessage(response) {
    try {
      const data = await response.json();
      return data.detail || data.error || JSON.stringify(data) || "Ошибка сервера";
    } catch {
      try {
        return await response.text();
      } catch {
        return "Ошибка сервера";
      }
    }
  }

  function setProgress(percent, color) {
    progressBar.style.width = `${percent}%`;
    if (color) progressBar.style.backgroundColor = color;
  }

  function startPolling(taskId) {
    stopPolling();
    let retries = 0;
    const maxRetries = 50;

    pollingInterval = setInterval(async () => {
      retries++;
      if (retries > maxRetries) {
        showNotification("Превышено время ожидания результатов", "error");
        stopPolling();
        uploadBtn.disabled = false;
        statusContainer.hidden = true;
        setProgress(100, "#e74c3c");
        return;
      }

      try {
        const response = await fetch(`${window.env.API_BASE_URL}/api/task/${taskId}`);
        if (!response.ok) {
          // Не готово пока
          console.log(`Еще не готово: попытка ${retries}`);
          return;
        }
        const taskData = await response.json();
        if (taskData.status === "completed") {
          statusContainer.hidden = true;
          await showResults(taskData);
          stopPolling();
          uploadBtn.disabled = false;
        } else if (taskData.status === "error") {
          showNotification(
            taskData.message || "Неизвестная ошибка при проверке",
            "error"
          );
          setProgress(100, "#e74c3c");
          stopPolling();
          uploadBtn.disabled = false;
          statusContainer.hidden = true;
        } else {
          const progressPercent = Math.min(50 + retries * 1.5, 90);
          setProgress(progressPercent);
          statusText.textContent = `Выполняется проверка... (${retries} сек)`;
        }
      } catch (error) {
        console.error("Ошибка в опросе:", error);
        showNotification(error.message || "Ошибка при получении результатов", "error");
        stopPolling();
        setProgress(100, "#e74c3c");
        uploadBtn.disabled = false;
        statusContainer.hidden = true;
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
  const warnCount = result.lint_result.Diagnostics.length;
  const testPassed = result.test_result.passed;
  const testTotal = result.test_result.total;
  const grade = result.grade;

  // Стили классов по состоянию
  let alertClass = warnCount > 0 ? "check-results-alert--warning" : "check-results-alert--ok";
  let alertIcon = warnCount > 0
    ? '<i class="fas fa-exclamation-triangle check-results-alert__icon"></i>'
    : '<i class="fas fa-check-circle check-results-alert__icon"></i>';
  let alertText = warnCount > 0
    ? `Предупреждений: <b>${warnCount}</b>`
    : "Нет предупреждений";

  const modal = document.createElement("div");
  modal.classList.add("modal");
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "results-title");
  modal.innerHTML = `
    <div class="modal-content" tabindex="0">
      <button class="modal-close" aria-label="Закрыть">&times;</button>
      <div class="results-box">
        <h2 class="results-title" id="results-title" style="margin-bottom: 18px;">Результат проверки</h2>
        <div class="check-results-alert ${alertClass}">
          ${alertIcon} <span>${alertText}</span>
        </div>
        <div class="check-results-cards">
          <div class="check-results-card">
            <div class="check-results-card__label">Тестирование</div>
            <div class="check-results-card__value">${testPassed} <span style="color:#999;font-size: 15px;">/ ${testTotal}</span></div>
            <div class="check-results-card__caption">пройдено</div>
          </div>
          <div class="check-results-card grade">
            <div class="check-results-card__label">Оценка</div>
            <div class="check-results-card__value">${grade}</div>
          </div>
        </div>
        <div class="modal-actions" style="display:flex; gap:15px;margin-top:10px;">
          <button id="more-details-btn" class="primary-btn" style="flex:1;">Подробнее</button>
          <button id="close-modal-btn" class="secondary-btn" style="flex:1;">Закрыть</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add("show"), 10);
  setTimeout(() => modal.querySelector(".modal-content").focus(), 300);

  modal.querySelector(".modal-close").onclick = closeModal;
  modal.querySelector("#close-modal-btn").onclick = closeModal;
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };
  modal.querySelector("#more-details-btn").onclick = () => {
    window.location.href = `/tasks?taskId=${currentTaskId}`;
  };

  function closeModal() {
    modal.classList.remove("show");
    setTimeout(() => document.body.contains(modal) && document.body.removeChild(modal), 300);
  }

  files = [];
  updateFileList();
  fileInput.value = "";
  labSelect.value = "";
  updateUploadButtonState();
}


  function clearAll() {
    files = [];
    labSelect.value = "";
    updateFileList();
    fileInput.value = "";
    updateUploadButtonState();
  }

  init();
});
