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
                results: 'Результаты',
                gift: 'Подарить',
                help: 'Помощь (Учителю)',
                feedback: 'Директору (Лично)'
            },
            teacher: {
                setHomework: 'Выдать ДЗ',
                setVocabulary: 'Изм. слова',
                setMaterials: 'Изм. материалы',
                sendNews: 'В группу',
                resultsPanel: 'Выдать результаты',
                createResult: 'Создать результат'
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
                back: 'Назад',
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
            noResults: 'Результатов пока нет.',
            resultsMenuStudent: '<b>Результаты</b>\nВыберите ученика:',
            resultsMenuTeacher: '<b>Выдача результатов</b>\nВыберите действие:',
            resultViewTitle: '<b>Результат ученика: {name}</b>',
            resultViewGrammar: 'Grammar: <b>{grammar}%</b>',
            resultViewWordList: 'WordList: <b>{wordlist}%</b>',
            resultAskName: 'Введите имя ученика.',
            resultAskGrammar: 'Напишите проценты по grammar (0-100).',
            resultAskWordList: 'Напишите проценты по WordList (0-100).',
            resultInvalidPercent: 'Введите число от 0 до 100.',
            resultConfirmText: 'Проверьте результат:\n\nИмя: <b>{name}</b>\nGrammar: <b>{grammar}%</b>\nWordList: <b>{wordlist}%</b>',
            resultSaved: 'Результат сохранен.',
            resultCanceled: 'Создание результата отменено.',

            giftTitle: 'Подарок для бота',
            giftDescription: 'Нажимая оплату, вы отправляете боту 30 Stars.',
            giftLabel: '30 Stars',
            giftSent: 'Счет на 30 Stars отправлен.',
            giftPaid: 'Спасибо за подарок. Платеж на 30 Stars получен.',
            giftFail: 'Не удалось создать платеж. Попробуйте позже.',

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
            teacherMessagePrefix: 'Сообщение от учительницы:',
            studentCardTitle: '<b>Карточка ученика</b>',
            studentCardName: 'Имя: <b>{name}</b>',
            studentCardUsername: 'Username: {username}',
            studentCardPhone: 'Телефон: <code>{phone}</code>',

            languagePrompt: 'Выберите язык интерфейса:',
            languagePromptStart: 'Выбери язык / Choose language:',
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
                results: 'Results',
                gift: 'Gift',
                help: 'Help (Teacher)',
                feedback: 'To Director (Private)'
            },
            teacher: {
                setHomework: 'Set Homework',
                setVocabulary: 'Set Vocabulary',
                setMaterials: 'Set Materials',
                sendNews: 'Post to Group',
                resultsPanel: 'Issue Results',
                createResult: 'Create Result'
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
                back: 'Back',
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
            noResults: 'No results yet.',
            resultsMenuStudent: '<b>Results</b>\nSelect a student:',
            resultsMenuTeacher: '<b>Results panel</b>\nChoose an action:',
            resultViewTitle: '<b>Student result: {name}</b>',
            resultViewGrammar: 'Grammar: <b>{grammar}%</b>',
            resultViewWordList: 'WordList: <b>{wordlist}%</b>',
            resultAskName: 'Enter student name.',
            resultAskGrammar: 'Enter Grammar percent (0-100).',
            resultAskWordList: 'Enter WordList percent (0-100).',
            resultInvalidPercent: 'Enter a number from 0 to 100.',
            resultConfirmText: 'Please confirm:\n\nName: <b>{name}</b>\nGrammar: <b>{grammar}%</b>\nWordList: <b>{wordlist}%</b>',
            resultSaved: 'Result saved.',
            resultCanceled: 'Result creation canceled.',

            giftTitle: 'Gift for the bot',
            giftDescription: 'By paying, you send 30 Stars to the bot.',
            giftLabel: '30 Stars',
            giftSent: 'Invoice for 30 Stars has been sent.',
            giftPaid: 'Thank you. Payment of 30 Stars received.',
            giftFail: 'Failed to create invoice. Please try later.',

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
            teacherMessagePrefix: 'Message from teacher:',
            studentCardTitle: '<b>Student card</b>',
            studentCardName: 'Name: <b>{name}</b>',
            studentCardUsername: 'Username: {username}',
            studentCardPhone: 'Phone: <code>{phone}</code>',

            languagePrompt: 'Choose interface language:',
            languagePromptStart: 'Выбери язык / Choose language:',
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
