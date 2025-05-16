export function showNotification(message, type = 'info') {
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