const LANGUAGES = {
    ru: {
        menus: {
            student: '<b>18:00-Inter |*| Fozil |  DevZone • УЧЕНИК</b>\nВыберите раздел в нижнем меню.',
            teacher: '<b>18:00-Inter |*| Fozil |  DevZone • ПРЕПОДАВАТЕЛЬ</b>\nРабочая панель готова.',
            owner: '<b>18:00-Inter |*| Fozil |  DevZone • ВЛАДЕЛЕЦ</b>\nДоступны инструменты управления.'
        },
        buttons: {
            student: {
                homework: 'Домашнее задание',
                vocabulary: 'Словарь недели',
                materials: 'Учебные материалы',
                results: 'Результаты',
                gift: 'Поддержка проекта',
                help: 'Чат с преподавателем',
                feedback: 'Техподдержка'
            },
            teacher: {
                setHomework: 'Обновить ДЗ',
                setVocabulary: 'Обновить словарь',
                setMaterials: 'Обновить материалы',
                sendNews: 'Пост в группу',
                resultsPanel: 'Панель результатов',
                createResult: 'Новый результат'
            },
            owner: {
                broadcastAll: 'Общая рассылка',
                adminPanel: 'Модерация',
                phones: 'Контакты учеников',
                stats: 'Статистика'
            },
            common: {
                confirm: 'Подтвердить',
                cancel: 'Отменить',
                finish: 'Закрыть диалог',
                back: 'Назад',
                changeLanguage: 'Сменить язык'
            },
            moderation: {
                mute: 'Ограничить чат',
                ban: 'Заблокировать',
                unmute: 'Снять ограничение',
                unban: 'Разблокировать',
                deleteLast: 'Удалить последнее сообщение',
                kick: 'Исключить из группы',
                requestName: 'Запросить имя',
                back: 'Назад'
            },
            language: {
                russian: 'Русский',
                english: 'English'
            }
        },
        text: {
            accessDenied: '<b>Доступ ограничен.</b>\nВы не состоите в группе.',
            startGreetingStudent: '<b>Добро пожаловать в 18:00-Inter |*| Fozil |  DevZone.</b>\nЛичный кабинет ученика готов к работе.',
            startGreetingTeacher: '<b>Панель преподавателя 18:00-Inter |*| Fozil |  DevZone.</b>\nИнструменты управления доступны.',
            startGreetingOwner: '<b>Панель владельца 18:00-Inter |*| Fozil |  DevZone.</b>\nСистема готова к администрированию.',
            askName: 'Введите имя для регистрации.',
            askNameInvalid: 'Имя должно содержать минимум 2 символа.',
            askContact: 'Подтвердите номер телефона кнопкой ниже.',
            registrationButton: 'Подтвердить контакт',
            notYourContact: 'Это не ваш контакт.',
            registrationSuccess: 'Регистрация завершена.',
            registrationError: 'Ошибка базы данных при регистрации. Данные сохранены локально во временном режиме.',
            registrationTopicCardSent: 'Тема в чате преподавателя создана, карточка ученика отправлена.',
            dbUnavailable: 'База данных недоступна. Бот работает во временном режиме, данные могут быть потеряны после перезапуска.',

            setHomeworkPrompt: 'Отправьте актуальное домашнее задание (текст или медиа).',
            setVocabularyPrompt: 'Отправьте актуальный словарь (текст или медиа).',
            setMaterialsPrompt: 'Отправьте учебные материалы (текст или медиа).',
            sendNewsPrompt: 'Отправьте сообщение для публикации в группе (текст или медиа).',
            broadcastPrompt: 'Отправьте сообщение для общей рассылки ученикам (текст или медиа).',
            feedbackPrompt: 'Отправьте сообщение в техподдержку.',

            contentUpdatedHomework: 'Домашнее задание сохранено.',
            contentUpdatedVocabulary: 'Словарь сохранен.',
            contentUpdatedMaterials: 'Материалы сохранены.',
            sentToGroup: 'Публикация отправлена в группу.',
            broadcastDone: 'Рассылка завершена.',
            feedbackSent: 'Сообщение отправлено.',

            homeworkTitle: '<b>ДОМАШНЕЕ ЗАДАНИЕ</b>',
            vocabularyTitle: '<b>СЛОВАРЬ НЕДЕЛИ</b>',
            materialsTitle: '<b>УЧЕБНЫЕ МАТЕРИАЛЫ</b>',
            noContent: 'Материал пока не добавлен.',
            noResults: 'Результаты пока не добавлены.',
            resultsMenuStudent: '<b>РЕЗУЛЬТАТЫ</b>\nВыберите ученика:',
            resultsMenuTeacher: '<b>ПАНЕЛЬ РЕЗУЛЬТАТОВ</b>\nВыберите действие:',
            resultViewTitle: '<b>Результат: {name}</b>',
            resultViewGrammar: 'Grammar: <b>{grammar}%</b>',
            resultViewWordList: 'WordList: <b>{wordlist}%</b>',
            resultAskName: 'Введите имя ученика.',
            resultAskGrammar: 'Введите процент по Grammar (0-100).',
            resultAskWordList: 'Введите процент по WordList (0-100).',
            resultInvalidPercent: 'Введите число от 0 до 100.',
            resultConfirmText: 'Проверьте данные:\n\nИмя: <b>{name}</b>\nGrammar: <b>{grammar}%</b>\nWordList: <b>{wordlist}%</b>',
            resultSaved: 'Результат сохранен.',
            resultCanceled: 'Создание результата отменено.',

            giftTitle: 'Поддержка проекта',
            giftDescription: 'Оплата отправит боту 30 Stars.',
            giftLabel: '30 Stars',
            giftSent: 'Счет на 30 Stars отправлен.',
            giftPaid: 'Платеж на 30 Stars получен.',
            giftFail: 'Не удалось создать счет. Повторите позже.',

            adminSelectUser: '<b>МОДЕРАЦИЯ ГРУППЫ</b>\nВыберите ученика:',
            adminUserActions: '<b>Управление пользователем</b>\n{name}\n\nВыберите действие:',
            noStudentsForModeration: 'Нет учеников для модерации.',
            noRights: 'Нет прав',
            actionDone: 'Действие выполнено.',
            actionError: 'Ошибка: {error}',
            renameRequestSent: 'Ученику отправлен запрос на имя.',
            usersReadError: 'Ошибка загрузки списка.',

            phonesTitle: '<b>КОНТАКТЫ УЧЕНИКОВ</b>',
            phonesEmpty: 'Список зарегистрированных учеников пуст.',
            phonesReadError: 'Ошибка при чтении списка.',

            helpCreated: 'Чат с преподавателем открыт. Сообщения из этого диалога будут передаваться в вашу тему.',
            helpTopicFail: 'Не удалось создать тему в чате преподавателя. Проверьте, что чат является форумом и у бота есть нужные права.',
            dialogClosed: 'Диалог закрыт.',
            dialogWait: '<b>Ожидайте ответ преподавателя.</b>',
            teacherReplyOpened: 'Канал ответа открыт. Сообщения из темы будут отправляться ученику.',

            teacherThreadStart: 'Запрос помощи от ученика: <b>{name}</b> (<code>{id}</code>)',
            teacherThreadFromStudent: 'Сообщение от ученика <b>{name}</b> (<code>{id}</code>)',
            studentMessageSent: 'Сообщение отправлено преподавателю.',
            teacherMessagePrefix: 'Сообщение от преподавателя:',
            studentCardTitle: '<b>Карточка ученика</b>',
            studentCardName: 'Имя: <b>{name}</b>',
            studentCardUsername: 'Username: {username}',
            studentCardPhone: 'Телефон: <code>{phone}</code>',

            languagePrompt: 'Выберите язык интерфейса.',
            languagePromptStart: '<b>18:00-Inter |*| Fozil |  DevZone</b>\nВыберите язык интерфейса / Choose interface language.',
            languageChanged: 'Язык интерфейса переключен на русский.',
            renamePrompt: 'Владелец попросил указать корректное имя.\nВведите имя заново.',
            renameSaved: 'Имя обновлено.',

            ownerFeedbackHeader: 'Обращение в техподдержку от {name} ({id})'
        }
    },
    en: {
        menus: {
            student: '<b>18:00-Inter |*| Fozil |  DevZone • STUDENT</b>\nChoose a section from the menu below.',
            teacher: '<b>18:00-Inter |*| Fozil |  DevZone • TEACHER</b>\nWorkspace is ready.',
            owner: '<b>18:00-Inter |*| Fozil |  DevZone • OWNER</b>\nManagement tools are available.'
        },
        buttons: {
            student: {
                homework: 'Homework',
                vocabulary: 'Weekly Vocabulary',
                materials: 'Learning Materials',
                results: 'Results',
                gift: 'Support Project',
                help: 'Teacher Chat',
                feedback: 'Tech Support'
            },
            teacher: {
                setHomework: 'Update Homework',
                setVocabulary: 'Update Vocabulary',
                setMaterials: 'Update Materials',
                sendNews: 'Post to Group',
                resultsPanel: 'Results Panel',
                createResult: 'New Result'
            },
            owner: {
                broadcastAll: 'Global Broadcast',
                adminPanel: 'Moderation',
                phones: 'Student Contacts',
                stats: 'Statistics'
            },
            common: {
                confirm: 'Confirm',
                cancel: 'Cancel',
                finish: 'Close Dialog',
                back: 'Back',
                changeLanguage: 'Switch Language'
            },
            moderation: {
                mute: 'Restrict Chat',
                ban: 'Ban',
                unmute: 'Remove Restriction',
                unban: 'Unban',
                deleteLast: 'Delete Last Message',
                kick: 'Remove from Group',
                requestName: 'Request Name',
                back: 'Back'
            },
            language: {
                russian: 'Русский',
                english: 'English'
            }
        },
        text: {
            accessDenied: '<b>Access denied.</b>\nYou are not in the group.',
            startGreetingStudent: '<b>Welcome to 18:00-Inter |*| Fozil |  DevZone.</b>\nStudent dashboard is ready.',
            startGreetingTeacher: '<b>18:00-Inter |*| Fozil |  DevZone teacher panel.</b>\nManagement tools are available.',
            startGreetingOwner: '<b>18:00-Inter |*| Fozil |  DevZone owner panel.</b>\nSystem is ready for administration.',
            askName: 'Enter your name for registration.',
            askNameInvalid: 'Name must contain at least 2 characters.',
            askContact: 'Confirm your phone number with the button below.',
            registrationButton: 'Share Contact',
            notYourContact: 'This is not your contact.',
            registrationSuccess: 'Registration completed.',
            registrationError: 'Database error during registration. Data was saved locally in temporary mode.',
            registrationTopicCardSent: 'A topic in teacher chat was created and student card was sent.',
            dbUnavailable: 'Database is unavailable. The bot runs in temporary mode and data may be lost after restart.',

            setHomeworkPrompt: 'Send current homework (text or media).',
            setVocabularyPrompt: 'Send current vocabulary (text or media).',
            setMaterialsPrompt: 'Send learning materials (text or media).',
            sendNewsPrompt: 'Send a message to post in the group (text or media).',
            broadcastPrompt: 'Send a message for global student broadcast (text or media).',
            feedbackPrompt: 'Send a message to tech support.',

            contentUpdatedHomework: 'Homework saved.',
            contentUpdatedVocabulary: 'Vocabulary saved.',
            contentUpdatedMaterials: 'Materials saved.',
            sentToGroup: 'Post sent to group.',
            broadcastDone: 'Broadcast completed.',
            feedbackSent: 'Message sent.',

            homeworkTitle: '<b>HOMEWORK</b>',
            vocabularyTitle: '<b>WEEKLY VOCABULARY</b>',
            materialsTitle: '<b>LEARNING MATERIALS</b>',
            noContent: 'No material has been added yet.',
            noResults: 'No results have been added yet.',
            resultsMenuStudent: '<b>RESULTS</b>\nSelect a student:',
            resultsMenuTeacher: '<b>RESULTS PANEL</b>\nChoose an action:',
            resultViewTitle: '<b>Result: {name}</b>',
            resultViewGrammar: 'Grammar: <b>{grammar}%</b>',
            resultViewWordList: 'WordList: <b>{wordlist}%</b>',
            resultAskName: 'Enter student name.',
            resultAskGrammar: 'Enter Grammar percent (0-100).',
            resultAskWordList: 'Enter WordList percent (0-100).',
            resultInvalidPercent: 'Enter a number from 0 to 100.',
            resultConfirmText: 'Review the data:\n\nName: <b>{name}</b>\nGrammar: <b>{grammar}%</b>\nWordList: <b>{wordlist}%</b>',
            resultSaved: 'Result saved.',
            resultCanceled: 'Result creation canceled.',

            giftTitle: 'Project Support',
            giftDescription: 'Payment sends 30 Stars to the bot.',
            giftLabel: '30 Stars',
            giftSent: 'Invoice for 30 Stars has been sent.',
            giftPaid: 'Payment of 30 Stars received.',
            giftFail: 'Failed to create invoice. Please try later.',

            adminSelectUser: '<b>GROUP MODERATION</b>\nSelect a student:',
            adminUserActions: '<b>User management</b>\n{name}\n\nChoose an action:',
            noStudentsForModeration: 'No students available for moderation.',
            noRights: 'No rights',
            actionDone: 'Action completed.',
            actionError: 'Error: {error}',
            renameRequestSent: 'Name request sent to the student.',
            usersReadError: 'Failed to load user list.',

            phonesTitle: '<b>STUDENT CONTACTS</b>',
            phonesEmpty: 'No registered students yet.',
            phonesReadError: 'Failed to read student list.',

            helpCreated: 'Teacher chat is open. Messages from this dialog will be forwarded to your topic.',
            helpTopicFail: 'Cannot create a topic in teacher chat. Ensure it is a forum and bot has required rights.',
            dialogClosed: 'Dialog closed.',
            dialogWait: '<b>Please wait for teacher response.</b>',
            teacherReplyOpened: 'Reply channel is open. Messages from the topic will be sent to the student.',

            teacherThreadStart: 'Help request from student: <b>{name}</b> (<code>{id}</code>)',
            teacherThreadFromStudent: 'Message from student <b>{name}</b> (<code>{id}</code>)',
            studentMessageSent: 'Message sent to teacher.',
            teacherMessagePrefix: 'Message from teacher:',
            studentCardTitle: '<b>Student card</b>',
            studentCardName: 'Name: <b>{name}</b>',
            studentCardUsername: 'Username: {username}',
            studentCardPhone: 'Phone: <code>{phone}</code>',

            languagePrompt: 'Choose interface language.',
            languagePromptStart: '<b>18:00-Inter |*| Fozil |  DevZone</b>\nChoose interface language / Выберите язык интерфейса.',
            languageChanged: 'Interface language switched to English.',
            renamePrompt: 'The owner asked you to provide a proper name.\nPlease enter it again.',
            renameSaved: 'Name updated.',

            ownerFeedbackHeader: 'Tech support request from {name} ({id})'
        }
    }
};

module.exports = {
    LANGUAGES,
    SUPPORTED_LANGS: ['ru', 'en'],
    DEFAULT_LANG: 'ru'
};
