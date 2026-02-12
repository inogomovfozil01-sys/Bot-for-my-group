const LANGUAGES = {
    ru: {
        menus: {
            student: '<b>Меню ученика:</b>',
            teacher: '<b>Меню учителя:</b>',
            owner: '<b>Меню владельца:</b>'
        },
        buttons: {
            student: {
                homework: 'Узнать ДЗ',
                vocabulary: 'Новые слова',
                materials: 'Материалы',
                help: 'Помощь (Учителю)',
                feedback: 'Директору (Лично)'
            },
            teacher: {
                setHomework: 'Выдать ДЗ',
                setVocabulary: 'Изм. слова',
                setMaterials: 'Изм. материалы',
                sendNews: 'В группу'
            },
            owner: {
                broadcastAll: 'Рассылка (Медиа)',
                adminPanel: 'Модерация',
                phones: 'Номера учеников',
                stats: 'Статистика'
            },
            common: {
                confirm: 'Подтвердить',
                cancel: 'Отменить',
                finish: 'Завершить диалог',
                changeLanguage: 'Язык / Language'
            },
            moderation: {
                mute: 'Мут',
                ban: 'Бан',
                unmute: 'Размут',
                unban: 'Разбан',
                deleteLast: 'Удалить последнее',
                kick: 'Выгнать',
                back: 'Назад'
            },
            language: {
                russian: 'Русский',
                english: 'English'
            }
        },
        text: {
            accessDenied: '<b>Доступ ограничен.</b>\nВы не состоите в группе.',
            askName: 'Введите ваше имя для регистрации.',
            askNameInvalid: 'Имя должно быть не короче 2 символов. Попробуйте снова.',
            askContact: 'Подтвердите номер телефона кнопкой ниже.',
            registrationButton: 'Пройти регистрацию',
            notYourContact: 'Это не ваш контакт.',
            registrationSuccess: 'Регистрация успешно завершена.',
            registrationError: 'Ошибка БД при регистрации. Временное сохранение выполнено локально.',
            registrationTopicCardSent: 'Тема в чате учителя создана и карточка ученика отправлена.',
            dbUnavailable: 'База недоступна. Бот работает в временном режиме, данные могут не сохраниться после перезапуска.',

            setHomeworkPrompt: 'Отправьте новое домашнее задание (текст/медиа).',
            setVocabularyPrompt: 'Отправьте новые слова (текст/медиа).',
            setMaterialsPrompt: 'Отправьте материалы (текст/медиа).',
            sendNewsPrompt: 'Отправьте сообщение для группы (текст/медиа).',
            broadcastPrompt: 'Отправьте сообщение для рассылки всем ученикам (текст/медиа).',
            feedbackPrompt: 'Напишите сообщение директору.',

            contentUpdatedHomework: 'Домашнее задание сохранено.',
            contentUpdatedVocabulary: 'Слова сохранены.',
            contentUpdatedMaterials: 'Материалы сохранены.',
            sentToGroup: 'Отправлено в группу.',
            broadcastDone: 'Рассылка завершена.',
            feedbackSent: 'Сообщение отправлено.',

            homeworkTitle: '<b>ДОМАШНЕЕ ЗАДАНИЕ</b>',
            vocabularyTitle: '<b>НОВЫЕ СЛОВА</b>',
            materialsTitle: '<b>МАТЕРИАЛЫ</b>',
            noContent: 'Пока не добавлено.',

            adminSelectUser: '<b>МОДЕРАЦИЯ ГРУППЫ</b>\nВыберите ученика:',
            adminUserActions: '<b>Управление пользователем</b>\n{name}\n\nВыберите действие:',
            noStudentsForModeration: 'Нет учеников для модерации.',
            noRights: 'Нет прав',
            actionDone: 'Выполнено',
            actionError: 'Ошибка: {error}',
            usersReadError: 'Ошибка загрузки списка.',

            phonesTitle: '<b>СПИСОК УЧЕНИКОВ:</b>',
            phonesEmpty: 'Список зарегистрированных учеников пуст.',
            phonesReadError: 'Ошибка при чтении списка.',

            helpCreated: 'Официальный чат с учителем открыт. Пишите сообщение сюда, оно уйдет в вашу тему.',
            helpTopicFail: 'Не удалось создать тему в чате учителя. Проверьте, что чат - форум и у бота есть права.',
            dialogClosed: 'Диалог завершен.',
            dialogWait: '<b>Ожидайте ответа...</b>',
            teacherReplyOpened: 'Канал ответа открыт. Отправьте сообщение в тему, оно придет ученику.',

            teacherThreadStart: 'Запрос помощи от ученика: <b>{name}</b> (<code>{id}</code>)',
            teacherThreadFromStudent: 'Сообщение от ученика <b>{name}</b> (<code>{id}</code>)',
            studentMessageSent: 'Сообщение отправлено учителю.',
            studentCardTitle: '<b>Карточка ученика</b>',
            studentCardName: 'Имя: <b>{name}</b>',
            studentCardUsername: 'Username: {username}',
            studentCardPhone: 'Телефон: <code>{phone}</code>',

            languagePrompt: 'Выберите язык интерфейса:',
            languageChanged: 'Язык изменен на русский.',

            ownerFeedbackHeader: 'Отзыв от {name} ({id})'
        }
    },
    en: {
        menus: {
            student: '<b>Student menu:</b>',
            teacher: '<b>Teacher menu:</b>',
            owner: '<b>Owner menu:</b>'
        },
        buttons: {
            student: {
                homework: 'Homework',
                vocabulary: 'Vocabulary',
                materials: 'Materials',
                help: 'Help (Teacher)',
                feedback: 'To Director (Private)'
            },
            teacher: {
                setHomework: 'Set Homework',
                setVocabulary: 'Set Vocabulary',
                setMaterials: 'Set Materials',
                sendNews: 'Post to Group'
            },
            owner: {
                broadcastAll: 'Broadcast (Media)',
                adminPanel: 'Moderation',
                phones: 'Student Phones',
                stats: 'Statistics'
            },
            common: {
                confirm: 'Confirm',
                cancel: 'Cancel',
                finish: 'Finish dialog',
                changeLanguage: 'Language / Язык'
            },
            moderation: {
                mute: 'Mute',
                ban: 'Ban',
                unmute: 'Unmute',
                unban: 'Unban',
                deleteLast: 'Delete last',
                kick: 'Kick',
                back: 'Back'
            },
            language: {
                russian: 'Русский',
                english: 'English'
            }
        },
        text: {
            accessDenied: '<b>Access denied.</b>\nYou are not in the group.',
            askName: 'Enter your name for registration.',
            askNameInvalid: 'Name must be at least 2 characters. Try again.',
            askContact: 'Confirm your phone number with the button below.',
            registrationButton: 'Register',
            notYourContact: 'This is not your contact.',
            registrationSuccess: 'Registration completed successfully.',
            registrationError: 'Database error during registration. Temporary local save has been used.',
            registrationTopicCardSent: 'A topic in teacher chat was created and student card was sent.',
            dbUnavailable: 'Database is unavailable. The bot is running in temporary mode and data can be lost after restart.',

            setHomeworkPrompt: 'Send new homework (text/media).',
            setVocabularyPrompt: 'Send new vocabulary (text/media).',
            setMaterialsPrompt: 'Send new materials (text/media).',
            sendNewsPrompt: 'Send a message to the group (text/media).',
            broadcastPrompt: 'Send a broadcast to all students (text/media).',
            feedbackPrompt: 'Write a message to the director.',

            contentUpdatedHomework: 'Homework saved.',
            contentUpdatedVocabulary: 'Vocabulary saved.',
            contentUpdatedMaterials: 'Materials saved.',
            sentToGroup: 'Sent to group.',
            broadcastDone: 'Broadcast completed.',
            feedbackSent: 'Message sent.',

            homeworkTitle: '<b>HOMEWORK</b>',
            vocabularyTitle: '<b>VOCABULARY</b>',
            materialsTitle: '<b>MATERIALS</b>',
            noContent: 'Nothing has been added yet.',

            adminSelectUser: '<b>GROUP MODERATION</b>\nSelect a student:',
            adminUserActions: '<b>User management</b>\n{name}\n\nChoose an action:',
            noStudentsForModeration: 'No students available for moderation.',
            noRights: 'No rights',
            actionDone: 'Done',
            actionError: 'Error: {error}',
            usersReadError: 'Failed to load user list.',

            phonesTitle: '<b>STUDENT LIST:</b>',
            phonesEmpty: 'No registered students yet.',
            phonesReadError: 'Failed to read student list.',

            helpCreated: 'Official chat with teacher is open. Send messages here and they will go to your topic.',
            helpTopicFail: 'Cannot create a topic in teacher chat. Ensure it is a forum and bot has rights.',
            dialogClosed: 'Dialog closed.',
            dialogWait: '<b>Please wait for a response...</b>',
            teacherReplyOpened: 'Reply channel opened. Send a message in the topic and it will be delivered to the student.',

            teacherThreadStart: 'Help request from student: <b>{name}</b> (<code>{id}</code>)',
            teacherThreadFromStudent: 'Message from student <b>{name}</b> (<code>{id}</code>)',
            studentMessageSent: 'Message sent to teacher.',
            studentCardTitle: '<b>Student card</b>',
            studentCardName: 'Name: <b>{name}</b>',
            studentCardUsername: 'Username: {username}',
            studentCardPhone: 'Phone: <code>{phone}</code>',

            languagePrompt: 'Choose interface language:',
            languageChanged: 'Language switched to English.',

            ownerFeedbackHeader: 'Feedback from {name} ({id})'
        }
    }
};

module.exports = {
    LANGUAGES,
    SUPPORTED_LANGS: ['ru', 'en'],
    DEFAULT_LANG: 'ru'
};

