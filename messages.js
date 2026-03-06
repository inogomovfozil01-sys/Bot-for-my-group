const LANGUAGES = {
    ru: {
        menus: {
            student: '<b>18:00 ENGLISH</b>\n<b>ЛИЧНЫЙ КАБИНЕТ</b>\n\nЗдравствуйте, <b>{name}</b>.\nВыберите раздел в меню ниже.',
            teacher: '<b>18:00 ENGLISH</b>\n<b>ПАНЕЛЬ ПРЕПОДАВАТЕЛЯ</b>\n\nЗдравствуйте, <b>{name}</b>.\nРабочее пространство готово.',
            owner: '<b>18:00 ENGLISH</b>\n<b>ПАНЕЛЬ ВЛАДЕЛЬЦА</b>\n\nЗдравствуйте, <b>{name}</b>.\nИнструменты управления доступны.'
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
                blockBot: 'Блок бота',
                unblockBot: 'Разблок бота',
                blockUser: 'Блок пользователя',
                unblockUser: 'Разблок пользователя',
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
            accessDenied: '<b>Доступ ограничен.</b>\nВы не состоите в учебной группе.',
            startGreetingStudent: '<b>18:00 ENGLISH</b>\n<b>ДОБРО ПОЖАЛОВАТЬ, {name}!</b>\n\nЗдесь доступны домашние задания, словарь, материалы, результаты и личный чат с преподавателем.',
            startGreetingTeacher: '<b>18:00 ENGLISH</b>\n<b>ПАНЕЛЬ ПРЕПОДАВАТЕЛЯ</b>\n\nЗдравствуйте, <b>{name}</b>.\nВсе инструменты управления готовы к работе.',
            startGreetingOwner: '<b>18:00 ENGLISH</b>\n<b>ПАНЕЛЬ ВЛАДЕЛЬЦА</b>\n\nЗдравствуйте, <b>{name}</b>.\nСистема готова к администрированию.',
            askName: 'Введите имя для регистрации.',
            askNameInvalid: 'Имя должно содержать минимум 2 символа.',
            askContact: 'Подтвердите номер телефона кнопкой ниже.',
            registrationButton: 'Подтвердить контакт',
            notYourContact: 'Это не ваш контакт.',
            registrationSuccess: 'Регистрация завершена.',
            registrationError: 'Ошибка при регистрации. Данные сохранены не полностью.',
            registrationTopicCardSent: 'Тема ученика создана или обновлена, карточка отправлена преподавателю.',
            dbUnavailable: 'База данных недоступна. После перезапуска часть данных может потеряться.',

            setHomeworkPrompt: 'Отправьте актуальное домашнее задание: текст, фото, видео, файл или альбом.',
            setVocabularyPrompt: 'Отправьте актуальный словарь: текст, фото, видео, файл или альбом.',
            setMaterialsPrompt: 'Отправьте учебные материалы: текст, фото, видео, файл или альбом.',
            sendNewsPrompt: 'Отправьте сообщение для публикации в группу.',
            broadcastPrompt: 'Отправьте сообщение для общей рассылки ученикам.',
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
            giftFail: 'Не удалось создать счет. Попробуйте позже.',

            adminSelectUser: '<b>МОДЕРАЦИЯ ГРУППЫ</b>\nВыберите ученика:',
            adminUserActions: '<b>Управление пользователем</b>\n{name}\n\nВыберите действие:',
            noStudentsForModeration: 'Нет учеников для модерации.',
            noRights: 'Недостаточно прав.',
            actionDone: 'Действие выполнено.',
            actionError: 'Ошибка: {error}',
            renameRequestSent: 'Ученику отправлен запрос на обновление имени.',
            usersReadError: 'Не удалось загрузить список пользователей.',
            userBlocked: 'Вы заблокированы. Бот для вас недоступен.',
            blockUserPrompt: 'Отправьте @username, ссылку t.me или ID пользователя для блокировки.',
            unblockUserPrompt: 'Отправьте @username, ссылку t.me или ID пользователя для разблокировки.',
            blockUserDone: 'Пользователь заблокирован: {id}.',
            unblockUserDone: 'Пользователь разблокирован: {id}.',
            blockUserNotFound: 'Пользователь не найден. Укажите корректный ID.',
            blockUserInvalid: 'Укажите @username, ссылку t.me или числовой ID.',
            blockUserProtected: 'Нельзя блокировать владельца или преподавателя.',

            phonesTitle: '<b>КОНТАКТЫ УЧЕНИКОВ</b>',
            phonesEmpty: 'Список зарегистрированных учеников пуст.',
            phonesReadError: 'Ошибка чтения списка учеников.',

            helpCreated: 'Чат с преподавателем открыт. Сообщения будут идти в вашу тему и сохранятся после перезапуска бота.',
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
            languagePromptStart: '<b>18:00 ENGLISH</b>\nВыберите язык интерфейса / Choose interface language.',
            languageChanged: 'Язык интерфейса переключен на русский.',
            renamePrompt: 'Владелец попросил указать корректное имя.\nВведите имя заново.',
            renameSaved: 'Имя обновлено.',

            ownerFeedbackHeader: 'Обращение в техподдержку от {name} ({id})'
        }
    },
    en: {
        menus: {
            student: '<b>18:00 ENGLISH</b>\n<b>STUDENT DASHBOARD</b>\n\nHello, <b>{name}</b>.\nChoose a section below.',
            teacher: '<b>18:00 ENGLISH</b>\n<b>TEACHER PANEL</b>\n\nHello, <b>{name}</b>.\nWorkspace is ready.',
            owner: '<b>18:00 ENGLISH</b>\n<b>OWNER PANEL</b>\n\nHello, <b>{name}</b>.\nManagement tools are available.'
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
                blockBot: 'Bot Block',
                unblockBot: 'Bot Unblock',
                blockUser: 'Block User',
                unblockUser: 'Unblock User',
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
            accessDenied: '<b>Access denied.</b>\nYou are not in the study group.',
            startGreetingStudent: '<b>18:00 ENGLISH</b>\n<b>WELCOME, {name}!</b>\n\nHomework, vocabulary, materials, results, and a private teacher chat are ready for you.',
            startGreetingTeacher: '<b>18:00 ENGLISH</b>\n<b>TEACHER PANEL</b>\n\nHello, <b>{name}</b>.\nAll management tools are ready.',
            startGreetingOwner: '<b>18:00 ENGLISH</b>\n<b>OWNER PANEL</b>\n\nHello, <b>{name}</b>.\nThe system is ready for administration.',
            askName: 'Enter your name for registration.',
            askNameInvalid: 'Name must contain at least 2 characters.',
            askContact: 'Confirm your phone number with the button below.',
            registrationButton: 'Share Contact',
            notYourContact: 'This is not your contact.',
            registrationSuccess: 'Registration completed.',
            registrationError: 'Registration failed. Data was not saved completely.',
            registrationTopicCardSent: 'Student topic was created or updated and the card was sent to the teacher.',
            dbUnavailable: 'Database is unavailable. Some data may be lost after restart.',

            setHomeworkPrompt: 'Send current homework: text, photo, video, file, or album.',
            setVocabularyPrompt: 'Send current vocabulary: text, photo, video, file, or album.',
            setMaterialsPrompt: 'Send learning materials: text, photo, video, file, or album.',
            sendNewsPrompt: 'Send a message to post in the group.',
            broadcastPrompt: 'Send a message for a global student broadcast.',
            feedbackPrompt: 'Send a message to tech support.',

            contentUpdatedHomework: 'Homework saved.',
            contentUpdatedVocabulary: 'Vocabulary saved.',
            contentUpdatedMaterials: 'Materials saved.',
            sentToGroup: 'Post sent to the group.',
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
            giftDescription: 'The payment sends 30 Stars to the bot.',
            giftLabel: '30 Stars',
            giftSent: 'Invoice for 30 Stars has been sent.',
            giftPaid: 'Payment of 30 Stars received.',
            giftFail: 'Failed to create invoice. Please try later.',

            adminSelectUser: '<b>GROUP MODERATION</b>\nSelect a student:',
            adminUserActions: '<b>User management</b>\n{name}\n\nChoose an action:',
            noStudentsForModeration: 'No students available for moderation.',
            noRights: 'Not enough rights.',
            actionDone: 'Action completed.',
            actionError: 'Error: {error}',
            renameRequestSent: 'A name update request was sent to the student.',
            usersReadError: 'Failed to load user list.',
            userBlocked: 'You are blocked. The bot is unavailable for you.',
            blockUserPrompt: 'Send @username, a t.me link, or a user ID to block.',
            unblockUserPrompt: 'Send @username, a t.me link, or a user ID to unblock.',
            blockUserDone: 'User blocked: {id}.',
            unblockUserDone: 'User unblocked: {id}.',
            blockUserNotFound: 'User not found. Send a valid ID.',
            blockUserInvalid: 'Send @username, a t.me link, or a numeric ID.',
            blockUserProtected: 'You cannot block the owner or the teacher.',

            phonesTitle: '<b>STUDENT CONTACTS</b>',
            phonesEmpty: 'No registered students yet.',
            phonesReadError: 'Failed to read the student list.',

            helpCreated: 'Teacher chat is open. Messages will go to your topic and will remain available after bot restart.',
            helpTopicFail: 'Cannot create a topic in the teacher chat. Make sure it is a forum and the bot has the required rights.',
            dialogClosed: 'Dialog closed.',
            dialogWait: '<b>Please wait for the teacher response.</b>',
            teacherReplyOpened: 'Reply channel is open. Messages from the topic will be sent to the student.',

            teacherThreadStart: 'Help request from student: <b>{name}</b> (<code>{id}</code>)',
            teacherThreadFromStudent: 'Message from student <b>{name}</b> (<code>{id}</code>)',
            studentMessageSent: 'Message sent to the teacher.',
            teacherMessagePrefix: 'Message from the teacher:',
            studentCardTitle: '<b>Student card</b>',
            studentCardName: 'Name: <b>{name}</b>',
            studentCardUsername: 'Username: {username}',
            studentCardPhone: 'Phone: <code>{phone}</code>',

            languagePrompt: 'Choose interface language.',
            languagePromptStart: '<b>18:00 ENGLISH</b>\nChoose interface language / Выберите язык интерфейса.',
            languageChanged: 'Interface language switched to English.',
            renamePrompt: 'The owner asked you to provide the correct name.\nPlease enter it again.',
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
