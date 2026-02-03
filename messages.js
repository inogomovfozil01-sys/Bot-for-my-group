module.exports = {
    accessDenied: "<b>Доступ ограничен.</b>\nВы не состоите в группе.",
    
    studentMenu: "<b>Меню ученика:</b>",
    teacherMenu: "<b>Меню учителя:</b>",
    ownerMenu: "<b>МЕНЮ ВЛАДЕЛЬЦА:</b>",

    /* ===== КНОПКИ ===== */
    buttons: {
        student: {
            homework: "Узнать ДЗ",
            vocabulary: "Новые слова",
            materials: "Материалы",
            help: "Помощь (Учителю)",
            feedback: "Директору (Лично)"
        },
        teacher: {
            setHomework: "Выдать ДЗ",
            setVocabulary: "Изм. слова",
            setMaterials: "Изм. материалы",
            sendNews: "В группу"
        },
        owner: {
            broadcastAll: "Рассылка (Медиа)",
            adminPanel: "Модерация",
            stats: "Статистика"
        },
        common: {
            confirm: "Подтвердить",
            cancel: "Отменить",
            finish: "Завершить и отправить"
        }
    },

    /* ===== ОТОБРАЖЕНИЕ ДАННЫХ ===== */
    homeworkDisplay: (text) =>
        `<b>ДОМАШНЕЕ ЗАДАНИЕ</b>\n\n${text}`,

    vocabDisplay: (text) =>
        `<b>НОВЫЕ СЛОВА</b>\n\n${text}`,

    materialsDisplay: (text) =>
        `<b>МАТЕРИАЛЫ</b>\n\n${text}`,

    /* ===== МОДЕРАЦИЯ ===== */
    adminSelectUser:
        "<b>МОДЕРАЦИЯ ГРУППЫ</b>\nВыберите ученика:",

    adminUserActions: (name) =>
        `<b>Управление пользователем</b>\n${name}\n\nВыберите действие:`,

    /* ===== ПОМОЩЬ / ОБРАТНАЯ СВЯЗЬ ===== */
    teacherNewHelpAlert: (name) =>
        `<b>Новый вопрос от ученика:</b>\n${name}`,

    ownerNewFeedbackAlert: (name) =>
        `<b>Новое личное сообщение:</b>\n${name}`,

    studentWait:
        "<b>Ожидайте ответа...</b>",

    teacherReplyStart: (name) =>
        `<b>Вы отвечаете пользователю:</b>\n${name}`,

    replyHeader:
        "<b>ВАМ ОТВЕТ:</b>",

    /* ===== СЛУЖЕБНОЕ ===== */
    confirmAction:
        "<b>Подтвердить действие?</b>",

    cancelOp:
        "Операция отменена.",

    unknown:
        "Используйте кнопки меню."
};
