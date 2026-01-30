module.exports = {
    accessDenied: "<b>⛔ Доступ ограничен.</b>\nБот доступен только для участников учебной группы.",
    studentMenu: "<b>🎒 Меню ученика:</b>",
    teacherMenu: "<b>👩‍🏫 Меню учителя:</b>",
    ownerMenu: "<b>👑 МЕНЮ ВЛАДЕЛЬЦА:</b>",

    buttons: {
        student: {
            homework: "📚 Узнать ДЗ",
            vocabulary: "📖 Новые слова",
            materials: "📂 Материалы",
            help: "🆘 Помощь (Учителю)",
            feedback: "✍ Директору (Лично)"
        },
        teacher: {
            setHomework: "📝 Выдать ДЗ",
            setVocabulary: "📖 Изм. слова",
            setMaterials: "📂 Изм. материалы",
            sendNews: "📢 В группу"
        },
        owner: {
            broadcastAll: "📢 Рассылка (Медиа)",
            exportUsers: "📥 Список учеников",
            stats: "📊 Статистика"
        },
        common: {
            confirm: "✅ Подтвердить",
            cancel: "❌ Отменить",
            finish: "🏁 Завершить и отправить"
        }
    },

    homeworkDisplay: (t) => `<b>📚 Домашнее задание:</b>\n\n${t}`,
    vocabDisplay: (t) => `<b>📖 Новые слова и тема:</b>\n\n${t}`,
    materialsDisplay: (t) => `<b>📂 Полезные материалы:</b>\n\n${t}`,
    helpPrompt: "<b>🆘 СВЯЗЬ С УЧИТЕЛЕМ</b>\n\nНапишите ваш вопрос (текст, фото или видео).\n\nНажмите кнопку <b>«🏁 Завершить»</b>, когда закончите.",
    feedbackPrompt: "<b>✍ ПРЯМАЯ СВЯЗЬ С ДИРЕКТОРОМ</b>\n\nНапишите ваше сообщение.\n\nНажмите кнопку <b>«🏁 Завершить»</b>, когда закончите.",
    teacherNewHelpAlert: (name) => `<b>🆘 ВОПРОС УЧИТЕЛЮ от ${name}:</b>`,
    ownerNewFeedbackAlert: (name) => `<b>🔔 ЛИЧНОЕ ОБРАЩЕНИЕ от ${name}:</b>`,
    replyHeader: "<b>📩 ПОСТУПИЛ ОТВЕТ:</b>",
    broadcastPrompt: "<b>📢 РАССЫЛКА</b>\nОтправьте сообщение (текст/фото/видео) для всех:",
    cancelOp: "❌ Операция отменена."
};
