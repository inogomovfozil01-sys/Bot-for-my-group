const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const msgs = require('./messages');

const bot = new Telegraf(config.TOKEN);

const esc = (str) => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

let currentHomework = "Пока не задано";
let currentMaterials = "Пока не добавлено";
let currentVocabulary = "Пока не добавлено";
let allUsers = new Map(); 
let userStates = {}; 

const isOwner = (ctx) => ctx.from && ctx.from.id === config.OWNER_ID;
const isTeacher = (ctx) => ctx.from && (ctx.from.id === config.TEACHER_ID || ctx.from.id === config.OWNER_ID);

const checkPrivate = (ctx, next) => {
    if (ctx.chat.type !== 'private') return;
    if (ctx.from) allUsers.set(ctx.from.id.toString(), `${esc(ctx.from.first_name)}${ctx.from.username ? ` (@${ctx.from.username})` : ''}`);
    return next();
};

const checkMembership = async (ctx, next) => {
    if (isOwner(ctx) || isTeacher(ctx)) return next();
    try {
        const member = await ctx.telegram.getChatMember(config.GROUP_ID, ctx.from.id);
        if (['member', 'administrator', 'creator'].includes(member.status)) return next();
        return ctx.reply(msgs.accessDenied, { parse_mode: 'HTML' });
    } catch (e) { return ctx.reply(msgs.accessDenied, { parse_mode: 'HTML' }); }
};

const getMenu = (ctx) => {
    if (isOwner(ctx)) {
        return Markup.keyboard([
            [msgs.buttons.student.homework, msgs.buttons.student.vocabulary, msgs.buttons.student.materials],
            [msgs.buttons.teacher.setHomework, msgs.buttons.teacher.setVocabulary, msgs.buttons.teacher.setMaterials],
            [msgs.buttons.teacher.sendNews, msgs.buttons.owner.broadcastAll],
            [msgs.buttons.owner.adminPanel, msgs.buttons.owner.stats]
        ]).resize();
    }
    if (isTeacher(ctx)) {
        return Markup.keyboard([
            [msgs.buttons.teacher.setHomework, msgs.buttons.teacher.setVocabulary],
            [msgs.buttons.teacher.setMaterials, msgs.buttons.teacher.sendNews]
        ]).resize();
    }
    return Markup.keyboard([
        [msgs.buttons.student.homework, msgs.buttons.student.vocabulary],
        [msgs.buttons.student.materials, msgs.buttons.student.help],
        [msgs.buttons.student.feedback]
    ]).resize();
};

bot.start(checkPrivate, checkMembership, (ctx) => {
    const txt = isOwner(ctx) ? msgs.ownerMenu : (isTeacher(ctx) ? msgs.teacherMenu : msgs.studentMenu);
    ctx.reply(txt, { parse_mode: 'HTML', ...getMenu(ctx) });
});

// --- МОДЕРАЦИЯ ЧЕРЕЗ КНОПКИ ---

bot.hears(msgs.buttons.owner.adminPanel, checkPrivate, (ctx) => {
    if (!isOwner(ctx)) return;
    if (allUsers.size === 0) return ctx.reply("Список учеников пуст.");

    // Создаем кнопки с именами учеников
    const buttons = [];
    allUsers.forEach((name, id) => {
        if (id !== config.OWNER_ID.toString() && id !== config.TEACHER_ID.toString()) {
            buttons.push([Markup.button.callback(name, `manage_${id}`)]);
        }
    });

    ctx.reply(msgs.adminSelectUser, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
});

bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;

    // Шаг 1: Выбор действия для конкретного юзера
    if (data.startsWith('manage_')) {
        const userId = data.split('_')[1];
        const userName = allUsers.get(userId) || "Ученик";
        
        const actions = Markup.inlineKeyboard([
            [Markup.button.callback("🔇 Мут", `exec_mute_${userId}`), Markup.button.callback("🔊 Размут", `exec_unmute_${userId}`)],
            [Markup.button.callback("🚫 Бан", `exec_ban_${userId}`), Markup.button.callback("✅ Разбан", `exec_unban_${userId}`)]
        ]);

        await ctx.editMessageText(msgs.adminUserActions(userName), { parse_mode: 'HTML', ...actions });
    }

    // Шаг 2: Исполнение команды
    if (data.startsWith('exec_')) {
        const [, action, userId] = data.split('_');
        try {
            if (action === 'mute') await ctx.telegram.restrictChatMember(config.GROUP_ID, userId, { permissions: { can_send_messages: false } });
            if (action === 'unmute') await ctx.telegram.restrictChatMember(config.GROUP_ID, userId, { permissions: { can_send_messages: true, can_send_media_messages: true, can_send_other_messages: true, can_add_web_page_previews: true } });
            if (action === 'ban') await ctx.telegram.banChatMember(config.GROUP_ID, userId);
            if (action === 'unban') await ctx.telegram.unbanChatMember(config.GROUP_ID, userId);

            await ctx.answerCbQuery(`Действие ${action} выполнено`);
            await ctx.editMessageText(`✅ Пользователь (ID: ${userId}) — <b>${action.toUpperCase()}</b> выполнен успешно.`, { parse_mode: 'HTML' });
        } catch (e) {
            await ctx.answerCbQuery("Ошибка прав доступа");
            await ctx.editMessageText("❌ Не удалось выполнить действие. Убедитесь, что бот — админ в группе.");
        }
    }

    // Ответы учителю/директору
    if (data.startsWith('ans_')) {
        const p = data.split('_');
        userStates[ctx.from.id] = { step: 'REPLYING', target: p[1], h: false };
        await bot.telegram.sendMessage(p[1], msgs.studentWait, { parse_mode: 'HTML' });
        await ctx.reply(msgs.teacherReplyStart(p[2]), { parse_mode: 'HTML', ...Markup.keyboard([[msgs.buttons.common.finish]]).resize() });
    }
    await ctx.answerCbQuery();
});

// --- ОСТАЛЬНАЯ ЛОГИКА (ДЗ, Помощь, Рассылка) ---

bot.hears(msgs.buttons.student.homework, checkPrivate, checkMembership, (ctx) => ctx.reply(msgs.homeworkDisplay(esc(currentHomework)), { parse_mode: 'HTML' }));
bot.hears(msgs.buttons.student.vocabulary, checkPrivate, checkMembership, (ctx) => ctx.reply(msgs.vocabDisplay(esc(currentVocabulary)), { parse_mode: 'HTML' }));
bot.hears(msgs.buttons.student.materials, checkPrivate, checkMembership, (ctx) => ctx.reply(msgs.materialsDisplay(esc(currentMaterials)), { parse_mode: 'HTML', disable_web_page_preview: true }));

bot.hears(msgs.buttons.student.help, checkPrivate, (ctx) => { userStates[ctx.from.id] = { step: 'ASK_T' }; ctx.reply("🆘 Пишите вопрос учителю:", Markup.keyboard([[msgs.buttons.common.finish]]).resize()); });
bot.hears(msgs.buttons.student.feedback, checkPrivate, (ctx) => { userStates[ctx.from.id] = { step: 'ASK_O' }; ctx.reply("✍ Пишите директору:", Markup.keyboard([[msgs.buttons.common.finish]]).resize()); });

bot.hears(msgs.buttons.teacher.setHomework, (ctx) => isTeacher(ctx) && (userStates[ctx.from.id] = { step: 'W_HW' }, ctx.reply("Текст ДЗ:", Markup.removeKeyboard())));
bot.hears(msgs.buttons.teacher.setVocabulary, (ctx) => isTeacher(ctx) && (userStates[ctx.from.id] = { step: 'W_VOC' }, ctx.reply("Слова:", Markup.removeKeyboard())));
bot.hears(msgs.buttons.teacher.setMaterials, (ctx) => isTeacher(ctx) && (userStates[ctx.from.id] = { step: 'W_MAT' }, ctx.reply("Материалы:", Markup.removeKeyboard())));
bot.hears(msgs.buttons.teacher.sendNews, (ctx) => isTeacher(ctx) && (userStates[ctx.from.id] = { step: 'W_NEWS' }, ctx.reply("Текст новости:", Markup.removeKeyboard())));

bot.on('message', checkPrivate, async (ctx) => {
    const uid = ctx.from.id;
    const st = userStates[uid];
    if (!st) return ctx.reply("⚠ Используйте меню:", getMenu(ctx));

    // Помощь / Обратная связь
    if (st.step === 'ASK_T' || st.step === 'ASK_O') {
        const target = st.step === 'ASK_T' ? config.TEACHER_ID : config.OWNER_ID;
        const alert = st.step === 'ASK_T' ? msgs.teacherNewHelpAlert(esc(ctx.from.first_name)) : msgs.ownerNewFeedbackAlert(esc(ctx.from.first_name));
        
        if (ctx.message.text === msgs.buttons.common.finish) { delete userStates[uid]; return ctx.reply("✅ Отправлено.", getMenu(ctx)); }
        
        await bot.telegram.sendMessage(target, alert, { parse_mode: 'HTML' });
        await ctx.copyMessage(target, { reply_markup: { inline_keyboard: [[{ text: `✍ Ответить ${ctx.from.first_name}`, callback_data: `ans_${uid}_${ctx.from.first_name}` }]] } });
        return;
    }

    // Ответ
    if (st.step === 'REPLYING') {
        if (ctx.message.text === msgs.buttons.common.finish) { delete userStates[uid]; return ctx.reply("✅ Диалог закрыт.", getMenu(ctx)); }
        if (!st.h) { await bot.telegram.sendMessage(st.target, msgs.replyHeader, { parse_mode: 'HTML' }); userStates[uid].h = true; }
        await ctx.copyMessage(st.target);
        return;
    }

    // Подтверждения и ввод
    const steps = { 'W_HW': 'C_HW', 'W_VOC': 'C_VOC', 'W_MAT': 'C_MAT', 'W_NEWS': 'C_NEWS' };
    if (steps[st.step]) {
        userStates[uid].data = ctx.message.text; userStates[uid].old = st.step; userStates[uid].step = steps[st.step];
        return ctx.reply("Подтвердить?", Markup.keyboard([[msgs.buttons.common.confirm, msgs.buttons.common.cancel]]).resize());
    }

    if (ctx.message.text === msgs.buttons.common.confirm) {
        if (st.old === 'W_HW') currentHomework = st.data;
        if (st.old === 'W_VOC') currentVocabulary = st.data;
        if (st.old === 'W_MAT') currentMaterials = st.data;
        if (st.old === 'W_NEWS') await bot.telegram.sendMessage(config.GROUP_ID, `📢 <b>НОВОСТИ:</b>\n\n${esc(st.data)}`, { parse_mode: 'HTML' });
        delete userStates[uid];
        ctx.reply("✅ Обновлено", getMenu(ctx));
    } else if (ctx.message.text === msgs.buttons.common.cancel) {
        delete userStates[uid];
        ctx.reply(msgs.cancelOp, getMenu(ctx));
    }
});

bot.launch().then(() => console.log('Silent Admin Bot Started'));
