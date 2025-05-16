function getGroupIdFromUrl() {
    // Например, для /group/453503
    const match = window.location.pathname.match(/\/group\/(\d+)/);
    return match ? match[1] : null;
}

document.addEventListener('DOMContentLoaded', async () => {
    const groupId = getGroupIdFromUrl();
    if (!groupId) {
        document.getElementById('students-list').textContent = 'Группа не найдена!';
        return;
    }
    try {
        const res = await fetch(`/api/group/${groupId}`);
        if (!res.ok) throw new Error();
        const students = await res.json();
        console.log(students);
        renderStudents(students);
    } catch {
        document.getElementById('students-list').textContent = 'Ошибка загрузки участников группы!';
    }
});


function renderStudentsSummary(students) {
    const studentsListDiv = document.getElementById('students-list');
    studentsListDiv.innerHTML = '';
    students.forEach(student => {
        const studentDiv = document.createElement('div');
        studentDiv.className = 'student-summary';

        // Краткие посылки с оценками
        let sumHtml = '';
        if (student.submits && Object.keys(student.submits).length) {
            sumHtml = Object.entries(student.submits).map(([submitId, submit]) => `
                <div style="margin-bottom:4px;">
                    Посылка <b>${submitId}</b>: 
                    <span style="color:${submit.status === 'completed' ? 'green' : 'red'}">${submit.status}</span>, 
                    Оценка: <b>${submit.grade ?? '-'}</b>
                </div>
            `).join('');
        } else {
            sumHtml = '<em>Посылок нет</em>';
        }

        studentDiv.innerHTML = `
            <div style="display:flex; align-items:center; justify-content: space-between;">
                <span>${student.surname} ${student.name} (${student.username})</span>
                <a href="/tasks/${encodeURIComponent(student.username)}" class="btn-details">
                    Подробнее →
                </a>
            </div>
            <div class="submits-summary" style="margin-top:8px;">${sumHtml}</div>
        `;

        studentsListDiv.appendChild(studentDiv);
    });
}

async function renderStudents(students) {
    const studentsListDiv = document.getElementById('students-list');
    studentsListDiv.innerHTML = '';

    for (const student of students) {
        const studentDiv = document.createElement('div');
        studentDiv.className = 'student-container';

        // Создаём div для кратких посылок (потом заполним)
        const submitsSummaryDiv = document.createElement('div');
        submitsSummaryDiv.className = 'submits-summary';
        submitsSummaryDiv.textContent = 'Загрузка посылок...';

        studentDiv.innerHTML = `
            <div class="student-header" style="display:flex;align-items:center;justify-content:space-between;">
                <span>${student.surname} ${student.name} (${student.username})</span>
                <a href="/tasks/${encodeURIComponent(student.username)}" class="btn-details">Подробнее →</a>
            </div>
        `;

        studentDiv.appendChild(submitsSummaryDiv);
        studentsListDiv.appendChild(studentDiv);

        // Подгружаем краткие посылки
        try {
            const res = await fetch(`/api/tasks?uid=${student.username}`);
            const submits = await res.json();

            if (!Object.keys(submits).length) {
                submitsSummaryDiv.textContent = 'Посылок нет.';
            } else {
                // Краткий список посылок с оценкой и статусом
                submitsSummaryDiv.innerHTML = Object.entries(submits).map(([submitId, submit]) => `
                    <div style="margin-bottom:4px;">
                        Посылка <b>${submitId}</b>: 
                        <span style="color:${submit.status === 'completed' ? 'green' : 'red'}">${submit.status}</span>, 
                        Оценка: <b>${submit.grade ?? '-'}</b>
                    </div>
                `).join('');
            }
        } catch (e) {
            submitsSummaryDiv.textContent = 'Ошибка загрузки посылок.';
        }
    }
}

