const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const msgs = require('./messages');
const { Pool } = require('pg');

const bot = new Telegraf(config.TOKEN);

// === ПОДКЛЮЧЕНИЕ БАЗЫ ДАННЫХ ===
const pool = new Pool({
    connectionString: config.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Инициализация таблицы при запуске
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id BIGINT PRIMARY KEY,
                phone TEXT,
                username TEXT,
                first_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("DB Connected & Initialized");
    } catch (e) {
        console.error("DB Error:", e.message);
    }
};
initDB();

// Проверка регистрации
const isRegistered = async (userId) => {
    try {
        const res = await pool.query('SELECT 1 FROM users WHERE user_id = $1', [userId]);
        return res.rowCount > 0;
    } catch (e) { return false; }
};

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
const esc = (str = '') => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let currentHomework = "Пока не задано";
let currentVocabulary = "Пока не добавлено";
let currentMaterials = "Пока не добавлено";

let allUsers = new Map();
let userStates = {};
let lastGroupMessages = new Map();
let dialogs = new Map();

// Роли
const isOwner = (ctx) => ctx.from?.id === config.OWNER_ID;
const isTeacher = (ctx) => ctx.from && (ctx.from.id === config.TEACHER_ID || ctx.from.id === config.OWNER_ID);

// Middleware для записи имен и проверки входа
const checkPrivate = async (ctx, next) => {
    if (ctx.chat?.type !== 'private') return;
    if (ctx.from) {
        allUsers.set(ctx.from.id.toString(), `${esc(ctx.from.first_name)}${ctx.from.username ? ` (@${ctx.from.username})` : ''}`);
    }
    return next();
};

const checkMembership = async (ctx, next) => {
    if (isOwner(ctx) || isTeacher(ctx)) return next();
    try {
        const m = await ctx.telegram.getChatMember(config.GROUP_ID, ctx.from.id);
        if (['member', 'administrator', 'creator'].includes(m.status)) return next();
    } catch {}
    return ctx.reply(msgs.accessDenied, { parse_mode: 'HTML' });
};

// Меню
const getMenu = (ctx) => {
    if (isOwner(ctx)) {
        return Markup.keyboard([
            [msgs.buttons.student.homework, msgs.buttons.student.vocabulary, msgs.buttons.student.materials],
            [msgs.buttons.teacher.setHomework, msgs.buttons.teacher.setVocabulary, msgs.buttons.teacher.setMaterials],
            [msgs.buttons.teacher.sendNews, msgs.buttons.owner.broadcastAll],
            [msgs.buttons.owner.adminPanel, msgs.buttons.owner.phones, msgs.buttons.owner.stats]
        ]).resize();
    }
    if (isTeacher(ctx)) {
        return Markup.keyboard([
            [msgs.buttons.teacher.setHomework, msgs.buttons.teacher.setVocabulary, msgs.buttons.teacher.setMaterials],
            [msgs.buttons.teacher.sendNews, msgs.buttons.owner.adminPanel]
        ]).resize();
    }
    return Markup.keyboard([
        [msgs.buttons.student.homework, msgs.buttons.student.vocabulary],
        [msgs.buttons.student.materials, msgs.buttons.student.help],
        [msgs.buttons.student.feedback]
    ]).resize();
};

// === ОБРАБОТКА КОМАНД ===

bot.start(checkPrivate, checkMembership, async (ctx) => {
    if (!isOwner(ctx) && !isTeacher(ctx)) {
        const registered = await isRegistered(ctx.from.id);
        if (!registered) {
            return ctx.reply(
                "Чтобы бот работал качественно, нам нужно добавить тебя в список учеников. Пожалуйста, нажми на кнопку ниже.",
                Markup.keyboard([[Markup.button.contactRequest("Пройти регистрацию")]]).resize()
            );
        }
    }
    const text = isOwner(ctx) ? msgs.ownerMenu : isTeacher(ctx) ? msgs.teacherMenu : msgs.studentMenu;
    ctx.reply(text, { parse_mode: 'HTML', ...getMenu(ctx) });
});

// Регистрация контакта
bot.on('contact', async (ctx) => {
    if (ctx.message.contact.user_id !== ctx.from.id) return ctx.reply("Ошибка: отправьте свой контакт.");
    try {
        const { phone_number, first_name } = ctx.message.contact;
        await pool.query(
            `INSERT INTO users (user_id, phone, username, first_name) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO NOTHING`,
            [ctx.from.id, phone_number, ctx.from.username || '', first_name]
        );
        await ctx.reply("Регистрация успешно завершена!", getMenu(ctx));
    } catch (e) { ctx.reply("Ошибка при регистрации."); }
});

// Кнопки учителя (Установка данных)
bot.hears(msgs.buttons.teacher.setHomework, (ctx) => { if (isTeacher(ctx)) { userStates[ctx.from.id] = { step: 'SET_HW' }; ctx.reply("Введите ДЗ:"); } });
bot.hears(msgs.buttons.teacher.setVocabulary, (ctx) => { if (isTeacher(ctx)) { userStates[ctx.from.id] = { step: 'SET_VOCAB' }; ctx.reply("Введите новые слова:"); } });
bot.hears(msgs.buttons.teacher.setMaterials, (ctx) => { if (isTeacher(ctx)) { userStates[ctx.from.id] = { step: 'SET_MAT' }; ctx.reply("Введите материалы:"); } });
bot.hears(msgs.buttons.teacher.sendNews, (ctx) => { if (isTeacher(ctx)) { userStates[ctx.from.id] = { step: 'NEWS' }; ctx.reply("Введите сообщение для группы:"); } });

// Рассылка владельца
bot.hears(msgs.buttons.owner.broadcastAll, (ctx) => { if (isOwner(ctx)) { userStates[ctx.from.id] = { step: 'BROAD' }; ctx.reply("Введите текст рассылки для всех:"); } });

// Список номеров (Только владелец)
bot.hears(msgs.buttons.owner.phones, async (ctx) => {
    if (!isOwner(ctx)) return;
    try {
        const res = await pool.query('SELECT first_name, username, phone FROM users ORDER BY created_at DESC');
        if (res.rowCount === 0) return ctx.reply("Список пуст.");
        let txt = "<b>📞 СПИСОК УЧЕНИКОВ:</b>\n\n";
        res.rows.forEach((u, i) => txt += `${i+1}. ${esc(u.first_name)} ${u.username ? `(@${u.username})` : ''} — <code>${u.phone}</code>\n`);
        ctx.reply(txt, { parse_mode: 'HTML' });
    } catch (e) { ctx.reply("Ошибка БД."); }
});

// Модерация
bot.hears(msgs.buttons.owner.adminPanel, (ctx) => {
    if (!isTeacher(ctx)) return;
    const btns = [];
    for (const [id, name] of allUsers) {
        if (![config.OWNER_ID, config.TEACHER_ID].includes(Number(id))) btns.push([Markup.button.callback(name, `manage_${id}`)]);
    }
    ctx.reply(msgs.adminSelectUser, { parse_mode: 'HTML', ...Markup.inlineKeyboard(btns) });
});

// Кнопки ученика
bot.hears(msgs.buttons.student.homework, (ctx) => ctx.reply(msgs.homeworkDisplay(esc(currentHomework)), { parse_mode: 'HTML' }));
bot.hears(msgs.buttons.student.vocabulary, (ctx) => ctx.reply(msgs.vocabDisplay(esc(currentVocabulary)), { parse_mode: 'HTML' }));
bot.hears(msgs.buttons.student.materials, (ctx) => ctx.reply(msgs.materialsDisplay(esc(currentMaterials)), { parse_mode: 'HTML', disable_web_page_preview: true }));

// Обработка Inline-кнопок
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data.startsWith('manage_')) {
        const id = data.split('_')[1];
        const name = allUsers.get(id) || "Ученик";
        return ctx.editMessageText(msgs.adminUserActions(name), {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('Мут', `mute_${id}`), Markup.button.callback('Бан', `ban_${id}`)],
                [Markup.button.callback('Размут', `unmute_${id}`), Markup.button.callback('Разбан', `unban_${id}`)],
                [Markup.button.callback('Удалить последнее', `delmsg_${id}`)],
                [Markup.button.callback('Выгнать', `kick_${id}`)],
                [Markup.button.callback('Назад', 'back_to_admin')]
            ])
        });
    }

    if (data === 'back_to_admin') {
        const btns = [];
        for (const [id, name] of allUsers) {
            if (![config.OWNER_ID, config.TEACHER_ID].includes(Number(id))) btns.push([Markup.button.callback(name, `manage_${id}`)]);
        }
        return ctx.editMessageText(msgs.adminSelectUser, { parse_mode: 'HTML', ...Markup.inlineKeyboard(btns) });
    }

    const [action, target] = data.split('_');
    if (!isTeacher(ctx)) return ctx.answerCbQuery("Нет прав");

    try {
        if (action === 'mute') await ctx.telegram.restrictChatMember(config.GROUP_ID, target, { permissions: { can_send_messages: false } });
        if (action === 'unmute') await ctx.telegram.restrictChatMember(config.GROUP_ID, target, { permissions: { can_send_messages: true, can_send_media_messages: true, can_send_other_messages: true, can_add_web_page_previews: true } });
        if (action === 'ban') await ctx.telegram.banChatMember(config.GROUP_ID, target);
        if (action === 'unban') await ctx.telegram.unbanChatMember(config.GROUP_ID, target, { only_if_banned: true });
        if (action === 'kick') { await ctx.telegram.banChatMember(config.GROUP_ID, target); await ctx.telegram.unbanChatMember(config.GROUP_ID, target); }
        if (action === 'delmsg') {
            const lastId = lastGroupMessages.get(target);
            if (lastId) await ctx.telegram.deleteMessage(config.GROUP_ID, lastId);
        }
        await ctx.answerCbQuery("Выполнено");
    } catch (e) { await ctx.answerCbQuery("Ошибка: " + e.message, { show_alert: true }); }
});

// Основной обработчик сообщений
bot.on('message', async (ctx) => {
    // Трекинг сообщений в группе
    if (ctx.chat.id.toString() === config.GROUP_ID.toString()) {
        if (ctx.from) lastGroupMessages.set(ctx.from.id.toString(), ctx.message.message_id);
        return;
    }

    // Чат (Диалоги)
    if (dialogs.has(ctx.from.id)) {
        const dialog = dialogs.get(ctx.from.id);
        if (ctx.message.text === msgs.buttons.common.finish) {
            dialogs.delete(ctx.from.id); dialogs.delete(dialog.with);
            await bot.telegram.sendMessage(dialog.with, "Диалог завершен", getMenu(ctx));
            return ctx.reply("Диалог завершен", getMenu(ctx));
        }
        return ctx.copyMessage(dialog.with);
    }

    // Ввод данных (Стейты)
    const st = userStates[ctx.from.id];
    if (st) {
        if (st.step === 'SET_HW') { currentHomework = ctx.message.text; delete userStates[ctx.from.id]; return ctx.reply("Сохранено", getMenu(ctx)); }
        if (st.step === 'SET_VOCAB') { currentVocabulary = ctx.message.text; delete userStates[ctx.from.id]; return ctx.reply("Сохранено", getMenu(ctx)); }
        if (st.step === 'SET_MAT') { currentMaterials = ctx.message.text; delete userStates[ctx.from.id]; return ctx.reply("Сохранено", getMenu(ctx)); }
        if (st.step === 'NEWS') { await bot.telegram.sendMessage(config.GROUP_ID, ctx.message.text); delete userStates[ctx.from.id]; return ctx.reply("Отправлено в группу", getMenu(ctx)); }
        if (st.step === 'BROAD') {
            const users = await pool.query('SELECT user_id FROM users');
            for (let row of users.rows) { try { await bot.telegram.sendMessage(row.user_id, ctx.message.text); } catch(e){} }
            delete userStates[ctx.from.id]; return ctx.reply("Рассылка завершена", getMenu(ctx));
        }
    }
});

bot.launch().then(() => console.log('BOT STARTED'));
