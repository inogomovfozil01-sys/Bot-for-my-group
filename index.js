const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const msgs = require('./messages');
const { Pool } = require('pg');

const bot = new Telegraf(config.TOKEN);

// === DATABASE SETUP ===
const pool = new Pool({
    connectionString: config.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

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
        console.log("Database synchronized");
    } catch (e) {
        console.error("DB Init Error:", e);
    }
};
initDB();

const isRegistered = async (userId) => {
    try {
        const res = await pool.query('SELECT 1 FROM users WHERE user_id = $1', [userId]);
        return res.rowCount > 0;
    } catch (e) { return false; }
};

// === UTILS ===
const esc = (str = '') => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let currentHomework = "Пока не задано";
let currentVocabulary = "Пока не добавлено";
let currentMaterials = "Пока не добавлено";

let userStates = {};
let lastGroupMessages = new Map();
let dialogs = new Map();

// ROLES
const isOwner = (ctx) => ctx.from?.id === config.OWNER_ID;
const isTeacher = (ctx) => ctx.from && (ctx.from.id === config.TEACHER_ID || ctx.from.id === config.OWNER_ID);

// MIDDLEWARE
const checkPrivate = async (ctx, next) => {
    if (ctx.chat?.type !== 'private') return;
    if (ctx.from) {
        try {
            await pool.query(
                `UPDATE users SET first_name = $1, username = $2 WHERE user_id = $3`,
                [ctx.from.first_name, ctx.from.username || '', ctx.from.id]
            );
        } catch (e) {}
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

// MENU
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
            [msgs.buttons.teacher.sendNews, msgs.buttons.owner.adminPanel, msgs.buttons.owner.phones]
        ]).resize();
    }
    return Markup.keyboard([
        [msgs.buttons.student.homework, msgs.buttons.student.vocabulary],
        [msgs.buttons.student.materials, msgs.buttons.student.help],
        [msgs.buttons.student.feedback]
    ]).resize();
};

// START
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

// CONTACT
bot.on('contact', async (ctx) => {
    if (ctx.message.contact.user_id !== ctx.from.id) return ctx.reply("Это не ваш контакт.");
    try {
        await pool.query(
            `INSERT INTO users (user_id, phone, username, first_name) VALUES ($1, $2, $3, $4) 
             ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone`,
            [ctx.from.id, ctx.message.contact.phone_number, ctx.from.username || '', ctx.from.first_name]
        );
        await ctx.reply("Регистрация завершена!", getMenu(ctx));
    } catch (e) { ctx.reply("Ошибка БД."); }
});

// TEACHer & OWNER BUTTONS
bot.hears(msgs.buttons.teacher.setHomework, (ctx) => { if (isTeacher(ctx)) { userStates[ctx.from.id] = { step: 'SET_HW' }; ctx.reply("Введите ДЗ:"); } });
bot.hears(msgs.buttons.teacher.setVocabulary, (ctx) => { if (isTeacher(ctx)) { userStates[ctx.from.id] = { step: 'SET_VOCAB' }; ctx.reply("Введите слова:"); } });
bot.hears(msgs.buttons.teacher.setMaterials, (ctx) => { if (isTeacher(ctx)) { userStates[ctx.from.id] = { step: 'SET_MAT' }; ctx.reply("Введите материалы:"); } });
bot.hears(msgs.buttons.teacher.sendNews, (ctx) => { if (isTeacher(ctx)) { userStates[ctx.from.id] = { step: 'NEWS' }; ctx.reply("Введите текст для группы:"); } });
bot.hears(msgs.buttons.owner.broadcastAll, (ctx) => { if (isOwner(ctx)) { userStates[ctx.from.id] = { step: 'BROAD' }; ctx.reply("Введите текст рассылки для ВСЕХ:"); } });

// PHONES LIST
bot.hears(msgs.buttons.owner.phones, async (ctx) => {
    if (!isTeacher(ctx)) return;
    const res = await pool.query('SELECT first_name, username, phone FROM users ORDER BY created_at DESC');
    let txt = "<b>📞 СПИСОК УЧЕНИКОВ:</b>\n\n";
    res.rows.forEach((u, i) => txt += `${i+1}. ${u.first_name} (@${u.username}) — <code>${u.phone}</code>\n`);
    ctx.reply(txt, { parse_mode: 'HTML' });
});

// ADMIN PANEL
bot.hears(msgs.buttons.owner.adminPanel, async (ctx) => {
    if (!isTeacher(ctx)) return;
    const res = await pool.query('SELECT user_id, first_name FROM users');
    const btns = res.rows
        .filter(u => ![config.OWNER_ID, config.TEACHER_ID].includes(Number(u.user_id)))
        .map(u => [Markup.button.callback(u.first_name, `manage_${u.user_id}`)]);
    ctx.reply(msgs.adminSelectUser, { parse_mode: 'HTML', ...Markup.inlineKeyboard(btns) });
});

// STUDENT BUTTONS
bot.hears(msgs.buttons.student.homework, (ctx) => ctx.reply(msgs.homeworkDisplay(esc(currentHomework)), { parse_mode: 'HTML' }));
bot.hears(msgs.buttons.student.vocabulary, (ctx) => ctx.reply(msgs.vocabDisplay(esc(currentVocabulary)), { parse_mode: 'HTML' }));
bot.hears(msgs.buttons.student.materials, (ctx) => ctx.reply(msgs.materialsDisplay(esc(currentMaterials)), { parse_mode: 'HTML' }));
bot.hears(msgs.buttons.student.help, (ctx) => {
    dialogs.set(ctx.from.id, { with: config.TEACHER_ID });
    dialogs.set(config.TEACHER_ID, { with: ctx.from.id });
    bot.telegram.sendMessage(config.TEACHER_ID, `🆘 Ученик ${ctx.from.first_name} просит помощи.`, 
    Markup.inlineKeyboard([Markup.button.callback('Ответить', `reply_${ctx.from.id}`)]));
    ctx.reply("Учитель уведомлен. Пишите ваше сообщение сюда:", Markup.keyboard([[msgs.buttons.common.finish]]).resize());
});
bot.hears(msgs.buttons.student.feedback, (ctx) => {
    userStates[ctx.from.id] = { step: 'FEED' };
    ctx.reply("Напишите сообщение директору:");
});

// CALLBACKS
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (data.startsWith('manage_')) {
        const id = data.split('_')[1];
        const res = await pool.query('SELECT first_name FROM users WHERE user_id = $1', [id]);
        const name = res.rows[0]?.first_name || "Ученик";
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
        const res = await pool.query('SELECT user_id, first_name FROM users');
        const btns = res.rows.filter(u => ![config.OWNER_ID, config.TEACHER_ID].includes(Number(u.user_id))).map(u => [Markup.button.callback(u.first_name, `manage_${u.user_id}`)]);
        return ctx.editMessageText(msgs.adminSelectUser, { parse_mode: 'HTML', ...Markup.inlineKeyboard(btns) });
    }
    if (data.startsWith('reply_')) {
        const sid = data.split('_')[1];
        dialogs.set(ctx.from.id, { with: sid }); dialogs.set(sid, { with: ctx.from.id });
        ctx.reply("Чат открыт. Пишите ответ:"); ctx.answerCbQuery(); return;
    }
    const [action, target] = data.split('_');
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

// MESSAGE HANDLER
bot.on('message', async (ctx) => {
    if (ctx.chat.id.toString() === config.GROUP_ID.toString()) {
        if (ctx.from) lastGroupMessages.set(ctx.from.id.toString(), ctx.message.message_id);
        return;
    }
    if (dialogs.has(ctx.from.id)) {
        const d = dialogs.get(ctx.from.id);
        if (ctx.message.text === msgs.buttons.common.finish) {
            dialogs.delete(ctx.from.id); dialogs.delete(d.with);
            bot.telegram.sendMessage(d.with, "Диалог завершен", getMenu(ctx));
            return ctx.reply("Диалог завершен", getMenu(ctx));
        }
        return ctx.copyMessage(d.with);
    }
    const st = userStates[ctx.from.id];
    if (st) {
        if (st.step === 'SET_HW') { currentHomework = ctx.message.text; delete userStates[ctx.from.id]; return ctx.reply("ДЗ сохранено", getMenu(ctx)); }
        if (st.step === 'SET_VOCAB') { currentVocabulary = ctx.message.text; delete userStates[ctx.from.id]; return ctx.reply("Слова сохранены", getMenu(ctx)); }
        if (st.step === 'SET_MAT') { currentMaterials = ctx.message.text; delete userStates[ctx.from.id]; return ctx.reply("Материалы сохранены", getMenu(ctx)); }
        if (st.step === 'NEWS') { await bot.telegram.sendMessage(config.GROUP_ID, ctx.message.text); delete userStates[ctx.from.id]; return ctx.reply("Отправлено в группу", getMenu(ctx)); }
        if (st.step === 'FEED') { bot.telegram.sendMessage(config.OWNER_ID, `📩 Отзыв от ${ctx.from.first_name}: ${ctx.message.text}`); delete userStates[ctx.from.id]; return ctx.reply("Сообщение отправлено директору.", getMenu(ctx)); }
        if (st.step === 'BROAD') {
            const all = await pool.query('SELECT user_id FROM users');
            for (let u of all.rows) { try { await bot.telegram.sendMessage(u.user_id, ctx.message.text); } catch(e){} }
            delete userStates[ctx.from.id]; return ctx.reply("Рассылка окончена", getMenu(ctx));
        }
    }
});

bot.launch().then(() => console.log('BOT STARTED'));
