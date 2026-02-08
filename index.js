const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const msgs = require('./messages');
const { Pool } = require('pg');

const bot = new Telegraf(config.TOKEN);

// === DATABASE SETUP ===
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const initDB = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            user_id BIGINT PRIMARY KEY,
            phone TEXT,
            username TEXT,
            first_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
};
initDB().catch(console.error);

const isRegistered = async (userId) => {
    const res = await pool.query('SELECT 1 FROM users WHERE user_id = $1', [userId]);
    return res.rowCount > 0;
};

// === UTILS ===
const esc = (str = '') =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let currentHomework = "Пока не задано";
let currentVocabulary = "Пока не добавлено";
let currentMaterials = "Пока не добавлено";

let allUsers = new Map();
let userStates = {};
let lastGroupMessages = new Map();
let dialogs = new Map();

// === ROLES ===
const isOwner = (ctx) => ctx.from?.id === config.OWNER_ID;
const isTeacher = (ctx) =>
    ctx.from && (ctx.from.id === config.TEACHER_ID || ctx.from.id === config.OWNER_ID);

// === MIDDLEWARE ===
const checkPrivate = async (ctx, next) => {
    if (ctx.chat?.type !== 'private') return;
    if (ctx.from) {
        allUsers.set(
            ctx.from.id.toString(),
            `${esc(ctx.from.first_name)}${ctx.from.username ? ` (@${ctx.from.username})` : ''}`
        );
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

// === MENU ===
const getMenu = (ctx) => {
    if (isOwner(ctx)) {
        return Markup.keyboard([
            [msgs.buttons.student.homework, msgs.buttons.student.vocabulary, msgs.buttons.student.materials],
            [msgs.buttons.teacher.setHomework, msgs.buttons.teacher.setVocabulary, msgs.buttons.teacher.setMaterials],
            [msgs.buttons.teacher.sendNews, msgs.buttons.owner.broadcastAll],
            [msgs.buttons.owner.adminPanel, "📞 Номера учеников", msgs.buttons.owner.stats]
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

// === START (WITH REGISTRATION) ===
bot.start(checkPrivate, checkMembership, async (ctx) => {
    if (!isOwner(ctx) && !isTeacher(ctx)) {
        const registered = await isRegistered(ctx.from.id);
        if (!registered) {
            return ctx.reply(
                "Чтобы бот работал качественно, нам нужно добавить тебя в список учеников. Пожалуйста, нажми на кнопку ниже.",
                Markup.keyboard([
                    [Markup.button.contactRequest("Пройти регистрацию")]
                ]).resize()
            );
        }
    }

    const text = isOwner(ctx)
        ? msgs.ownerMenu
        : isTeacher(ctx)
        ? msgs.teacherMenu
        : msgs.studentMenu;

    ctx.reply(text, { parse_mode: 'HTML', ...getMenu(ctx) });
});

// === CONTACT HANDLER ===
bot.on('contact', async (ctx) => {
    if (ctx.message.contact.user_id !== ctx.from.id) {
        return ctx.reply("Пожалуйста, отправьте свой собственный контакт.");
    }

    try {
        const { phone_number, first_name } = ctx.message.contact;
        const username = ctx.from.username || '';

        await pool.query(
            `INSERT INTO users (user_id, phone, username, first_name) 
             VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO NOTHING`,
            [ctx.from.id, phone_number, username, first_name]
        );

        await ctx.reply("Регистрация успешно завершена!", getMenu(ctx));
    } catch (e) {
        console.error(e);
        ctx.reply("Ошибка регистрации.");
    }
});

// === PHONE LIST (OWNER ONLY) ===
bot.hears("📞 Номера учеников", async (ctx) => {
    if (!isOwner(ctx)) return;

    try {
        const res = await pool.query('SELECT first_name, username, phone FROM users ORDER BY created_at DESC');
        if (res.rowCount === 0) return ctx.reply("Список зарегистрированных учеников пуст.");

        let report = "<b>📞 СПИСОК НОМЕРОВ:</b>\n\n";
        res.rows.forEach((u, i) => {
            report += `${i + 1}. ${esc(u.first_name)}${u.username ? ` (@${u.username})` : ''}: <code>${u.phone}</code>\n`;
        });

        ctx.reply(report, { parse_mode: 'HTML' });
    } catch (e) {
        console.error(e);
        ctx.reply("Ошибка БД.");
    }
});

// === STUDENT VIEW ===
bot.hears(msgs.buttons.student.homework, checkPrivate, checkMembership, (ctx) =>
    ctx.reply(msgs.homeworkDisplay(esc(currentHomework)), { parse_mode: 'HTML' })
);

bot.hears(msgs.buttons.student.vocabulary, checkPrivate, checkMembership, (ctx) =>
    ctx.reply(msgs.vocabDisplay(esc(currentVocabulary)), { parse_mode: 'HTML' })
);

bot.hears(msgs.buttons.student.materials, checkPrivate, checkMembership, (ctx) =>
    ctx.reply(msgs.materialsDisplay(esc(currentMaterials)), {
        parse_mode: 'HTML',
        disable_web_page_preview: true
    })
);

// === TEACHER SET ===
bot.hears(msgs.buttons.teacher.setHomework, (ctx) => {
    if (!isTeacher(ctx)) return;
    userStates[ctx.from.id] = { step: 'SET_HW' };
    ctx.reply("<b>Введите ДЗ:</b>", { parse_mode: 'HTML' });
});

bot.hears(msgs.buttons.teacher.setVocabulary, (ctx) => {
    if (!isTeacher(ctx)) return;
    userStates[ctx.from.id] = { step: 'SET_VOCAB' };
    ctx.reply("<b>Введите новые слова:</b>", { parse_mode: 'HTML' });
});

bot.hears(msgs.buttons.teacher.setMaterials, (ctx) => {
    if (!isTeacher(ctx)) return;
    userStates[ctx.from.id] = { step: 'SET_MAT' };
    ctx.reply("<b>Введите материалы:</b>", { parse_mode: 'HTML' });
});

bot.hears(msgs.buttons.teacher.sendNews, (ctx) => {
    if (!isTeacher(ctx)) return;
    userStates[ctx.from.id] = { step: 'NEWS' };
    ctx.reply("<b>Введите сообщение для группы:</b>", { parse_mode: 'HTML' });
});

// === HELP / FEEDBACK ===
bot.hears(msgs.buttons.student.help, checkPrivate, checkMembership, async (ctx) => {
    dialogs.set(ctx.from.id, { with: config.TEACHER_ID });
    dialogs.set(config.TEACHER_ID, { with: ctx.from.id });

    await bot.telegram.sendMessage(
        config.TEACHER_ID,
        `<b>Сообщение от ученика:</b>\n\n${ctx.message.text || ''}`,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                Markup.button.callback('💬 Ответить', `reply_${ctx.from.id}`)
            ])
        }
    );

    return ctx.reply(
        "<b>Чат с учителем открыт. Пишите сообщение:</b>",
        {
            parse_mode: 'HTML',
            ...Markup.keyboard([[msgs.buttons.common.finish]]).resize()
        }
    );
});

bot.hears(msgs.buttons.student.feedback, checkPrivate, checkMembership, (ctx) => {
    userStates[ctx.from.id] = { step: 'FEEDBACK' };
    ctx.reply("<b>Напишите сообщение директору:</b>", { parse_mode: 'HTML' });
});

// === ADMIN PANEL ===
bot.hears(msgs.buttons.owner.adminPanel, (ctx) => {
    if (!isTeacher(ctx)) return;

    const buttons = [];
    for (const [id, name] of allUsers) {
        if (![config.OWNER_ID, config.TEACHER_ID].includes(Number(id))) {
            buttons.push([Markup.button.callback(name, `manage_${id}`)]);
        }
    }

    ctx.reply(msgs.adminSelectUser, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons)
    });
});

// === CALLBACKS ===
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data.startsWith('reply_')) {
        const studentId = data.split('_')[1];
        dialogs.set(ctx.from.id, { with: studentId });
        dialogs.set(studentId, { with: ctx.from.id });
        await bot.telegram.sendMessage(studentId, "<b>Учитель подключился к чату</b>", {
            parse_mode: 'HTML',
            ...Markup.keyboard([[msgs.buttons.common.finish]]).resize()
        });
        await ctx.reply("<b>Чат с учеником открыт</b>", {
            parse_mode: 'HTML',
            ...Markup.keyboard([[msgs.buttons.common.finish]]).resize()
        });
        return ctx.answerCbQuery();
    }

    if (data.startsWith('manage_')) {
        if (!isTeacher(ctx)) return ctx.answerCbQuery('Нет доступа');
        const userId = data.split('_')[1];
        const name = allUsers.get(userId) || "Ученик";
        return ctx.editMessageText(msgs.adminUserActions(name), {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('Мут', `mute_${userId}`), Markup.button.callback('Бан', `ban_${userId}`)],
                [Markup.button.callback('Размут', `unmute_${userId}`), Markup.button.callback('Разбан', `unban_${userId}`)],
                [Markup.button.callback('Удалить последнее сообщение', `delmsg_${userId}`)],
                [Markup.button.callback('Выгнать', `kick_${userId}`)],
                [Markup.button.callback('Назад', 'back_to_admin')]
            ])
        });
    }

    if (data === 'back_to_admin') {
        if (!isTeacher(ctx)) return ctx.answerCbQuery();
        const buttons = [];
        for (const [id, name] of allUsers) {
            if (![config.OWNER_ID, config.TEACHER_ID].includes(Number(id))) {
                buttons.push([Markup.button.callback(name, `manage_${id}`)]);
            }
        }
        return ctx.editMessageText(msgs.adminSelectUser, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons)
        });
    }

    const [action, targetId] = data.split('_');
    if (!['mute', 'unmute', 'ban', 'unban', 'kick', 'delmsg'].includes(action)) return;
    if (!isTeacher(ctx)) return ctx.answerCbQuery('Нет доступа');

    try {
        if (action === 'mute') {
            await ctx.telegram.restrictChatMember(config.GROUP_ID, targetId, { permissions: { can_send_messages: false } });
            await ctx.answerCbQuery('Мут установлен');
        } else if (action === 'unmute') {
            await ctx.telegram.restrictChatMember(config.GROUP_ID, targetId, { 
                permissions: { can_send_messages: true, can_send_media_messages: true, can_send_other_messages: true, can_add_web_page_previews: true } 
            });
            await ctx.answerCbQuery('Мут снят');
        } else if (action === 'ban') {
            await ctx.telegram.banChatMember(config.GROUP_ID, targetId);
            await ctx.answerCbQuery('Забанен');
        } else if (action === 'unban') {
            await ctx.telegram.unbanChatMember(config.GROUP_ID, targetId, { only_if_banned: true });
            await ctx.answerCbQuery('Разбанен');
        } else if (action === 'kick') {
            await ctx.telegram.banChatMember(config.GROUP_ID, targetId);
            await ctx.telegram.unbanChatMember(config.GROUP_ID, targetId);
            await ctx.answerCbQuery('Исключен');
        } else if (action === 'delmsg') {
            const lastId = lastGroupMessages.get(targetId);
            if (lastId) {
                await ctx.telegram.deleteMessage(config.GROUP_ID, lastId);
                await ctx.answerCbQuery('Сообщение удалено');
            } else {
                await ctx.answerCbQuery('Сообщение не найдено', { show_alert: true });
            }
        }
    } catch (e) {
        await ctx.answerCbQuery('Ошибка: ' + e.message, { show_alert: true });
    }
});

// === MESSAGE HANDLER ===
bot.on('message', async (ctx) => {
    if (ctx.chat.id.toString() === config.GROUP_ID.toString()) {
        if (ctx.from) lastGroupMessages.set(ctx.from.id.toString(), ctx.message.message_id);
        return;
    }

    if (dialogs.has(ctx.from.id)) {
        const dialog = dialogs.get(ctx.from.id);
        if (ctx.message.text === msgs.buttons.common.finish) {
            dialogs.delete(ctx.from.id);
            dialogs.delete(dialog.with);
            await bot.telegram.sendMessage(dialog.with, "<b>Диалог завершён</b>", { parse_mode: 'HTML', ...getMenu(ctx) });
            return ctx.reply("<b>Диалог завершён</b>", { parse_mode: 'HTML', ...getMenu(ctx) });
        }
        await ctx.telegram.sendChatAction(dialog.with, 'typing');
        return ctx.copyMessage(dialog.with);
    }

    const st = userStates[ctx.from.id];
    if (!st) return;

    if (st.step === 'SET_HW') currentHomework = ctx.message.text;
    if (st.step === 'SET_VOCAB') currentVocabulary = ctx.message.text;
    if (st.step === 'SET_MAT') currentMaterials = ctx.message.text;

    if (['SET_HW', 'SET_VOCAB', 'SET_MAT'].includes(st.step)) {
        delete userStates[ctx.from.id];
        return ctx.reply("Сохранено", { ...getMenu(ctx) });
    }

    if (st.step === 'NEWS') {
        await bot.telegram.sendMessage(config.GROUP_ID, ctx.message.text);
        delete userStates[ctx.from.id];
        return ctx.reply("Отправлено", { ...getMenu(ctx) });
    }

    if (st.step === 'FEEDBACK') {
        await bot.telegram.sendMessage(config.OWNER_ID, ctx.message.text);
        delete userStates[ctx.from.id];
        return ctx.reply(msgs.studentWait, { parse_mode: 'HTML', ...getMenu(ctx) });
    }
});

bot.launch().then(() => console.log('BOT STARTED'));
