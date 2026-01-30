const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const msgs = require('./messages');

const bot = new Telegraf(config.TOKEN);

// Имитация БД (в памяти)
let currentHomework = "Пока не задано";
let currentMaterials = "Пока не добавлено";
let currentVocabulary = "Пока не добавлено";
let allUsers = new Map(); 
let userStates = {}; 

const isOwner = (ctx) => ctx.from && ctx.from.id === config.OWNER_ID;
const isTeacher = (ctx) => ctx.from && (ctx.from.id === config.TEACHER_ID || ctx.from.id === config.OWNER_ID);

// Проверка на ЛС и сохранение пользователя
const checkPrivate = (ctx, next) => {
    if (ctx.chat.type !== 'private') return;
    if (ctx.from) allUsers.set(ctx.from.id, `${ctx.from.first_name}${ctx.from.username ? ` (@${ctx.from.username})` : ''}`);
    return next();
};

// Проверка членства в группе
const checkMembership = async (ctx, next) => {
    if (isOwner(ctx) || isTeacher(ctx)) return next();
    try {
        const member = await ctx.telegram.getChatMember(config.GROUP_ID, ctx.from.id);
        if (['member', 'administrator', 'creator'].includes(member.status)) return next();
        return ctx.reply(msgs.accessDenied);
    } catch (e) { return ctx.reply(msgs.accessDenied); }
};

// Главное меню
const mainMenu = (ctx) => {
    if (isOwner(ctx)) {
        return Markup.keyboard([
            [msgs.buttons.student.homework, msgs.buttons.student.vocabulary, msgs.buttons.student.materials],
            [msgs.buttons.teacher.setHomework, msgs.buttons.teacher.setVocabulary, msgs.buttons.teacher.setMaterials],
            [msgs.buttons.teacher.sendNews, msgs.buttons.owner.broadcastAll],
            [msgs.buttons.owner.stats, msgs.buttons.owner.exportUsers]
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
    ctx.reply(isOwner(ctx) ? msgs.ownerMenu : (isTeacher(ctx) ? msgs.teacherMenu : msgs.studentMenu), mainMenu(ctx));
});

// --- ОБРАБОТКА КНОПОК ПРОСМОТРА ---
bot.hears(msgs.buttons.student.homework, checkPrivate, checkMembership, (ctx) => ctx.reply(msgs.homeworkDisplay(currentHomework), { parse_mode: 'Markdown' }));
bot.hears(msgs.buttons.student.vocabulary, checkPrivate, checkMembership, (ctx) => ctx.reply(msgs.vocabDisplay(currentVocabulary), { parse_mode: 'Markdown' }));
bot.hears(msgs.buttons.student.materials, checkPrivate, checkMembership, (ctx) => ctx.reply(msgs.materialsDisplay(currentMaterials), { parse_mode: 'Markdown', disable_web_page_preview: true }));

// --- ФУНКЦИИ ВЛАДЕЛЬЦА ---
bot.hears(msgs.buttons.owner.stats, checkPrivate, (ctx) => {
    if (isOwner(ctx)) ctx.reply(`📊 Пользователей в базе: ${allUsers.size}`);
});

bot.hears(msgs.buttons.owner.exportUsers, checkPrivate, (ctx) => {
    if (!isOwner(ctx)) return;
    let list = "📥 **Список учеников:**\n\n";
    allUsers.forEach((name, id) => { list += `• ${name} [ID: \`${id}\`]\n`; });
    ctx.reply(list, { parse_mode: 'Markdown' });
});

bot.hears(msgs.buttons.owner.broadcastAll, checkPrivate, (ctx) => {
    if (!isOwner(ctx)) return;
    userStates[ctx.from.id] = { step: 'WAITING_BROADCAST' };
    ctx.reply(msgs.broadcastPrompt, Markup.removeKeyboard());
});

// --- РЕЖИМЫ ОТПРАВКИ (УЧЕНИК) ---
bot.hears(msgs.buttons.student.help, checkPrivate, checkMembership, (ctx) => {
    userStates[ctx.from.id] = { step: 'SENDING_HELP' };
    ctx.reply(msgs.helpPrompt, Markup.keyboard([[msgs.buttons.common.finish]]).resize(), { parse_mode: 'Markdown' });
});

bot.hears(msgs.buttons.student.feedback, checkPrivate, checkMembership, (ctx) => {
    userStates[ctx.from.id] = { step: 'SENDING_FEEDBACK' };
    ctx.reply(msgs.studentFeedbackPrompt, Markup.keyboard([[msgs.buttons.common.finish]]).resize(), { parse_mode: 'Markdown' });
});

// --- КНОПКИ УЧИТЕЛЯ ---
bot.hears(msgs.buttons.teacher.setHomework, checkPrivate, (ctx) => { if (isTeacher(ctx)) { userStates[ctx.from.id] = { step: 'W_HW' }; ctx.reply(msgs.setHwPrompt, Markup.removeKeyboard()); } });
bot.hears(msgs.buttons.teacher.setVocabulary, checkPrivate, (ctx) => { if (isTeacher(ctx)) { userStates[ctx.from.id] = { step: 'W_VOC' }; ctx.reply(msgs.setVocabPrompt, Markup.removeKeyboard()); } });
bot.hears(msgs.buttons.teacher.setMaterials, checkPrivate, (ctx) => { if (isTeacher(ctx)) { userStates[ctx.from.id] = { step: 'W_MAT' }; ctx.reply(msgs.setMatPrompt, Markup.removeKeyboard()); } });
bot.hears(msgs.buttons.teacher.sendNews, checkPrivate, (ctx) => { if (isTeacher(ctx)) { userStates[ctx.from.id] = { step: 'W_NEWS' }; ctx.reply(msgs.newsPrompt, Markup.removeKeyboard()); } });

// --- ГЛАВНЫЙ ОБРАБОТЧИК СООБЩЕНИЙ ---
bot.on('message', checkPrivate, async (ctx) => {
    const userId = ctx.from.id;
    const state = userStates[userId];
    if (!state) return ctx.reply(msgs.unknown, mainMenu(ctx));

    // Рассылка медиа (Владелец)
    if (state.step === 'WAITING_BROADCAST') {
        userStates[userId].msgId = ctx.message.message_id;
        userStates[userId].step = 'CONF_BROAD';
        return ctx.reply(msgs.confirmAction, Markup.keyboard([[msgs.buttons.common.confirm, msgs.buttons.common.cancel]]).resize());
    }

    // Помощь (Учителю)
    if (state.step === 'SENDING_HELP') {
        if (ctx.message.text === msgs.buttons.common.finish) { delete userStates[userId]; return ctx.reply(msgs.helpFinished, mainMenu(ctx)); }
        await bot.telegram.sendMessage(config.TEACHER_ID, msgs.teacherNewHelpAlert(ctx.from.first_name));
        await ctx.copyMessage(config.TEACHER_ID, { reply_markup: { inline_keyboard: [[{ text: `✍ Ответить ${ctx.from.first_name}`, callback_data: `ans_${userId}_${ctx.from.first_name}` }]] } });
        return;
    }

    // Обратная связь (Владельцу)
    if (state.step === 'SENDING_FEEDBACK') {
        if (ctx.message.text === msgs.buttons.common.finish) { delete userStates[userId]; return ctx.reply("✅ Отправлено.", mainMenu(ctx)); }
        await bot.telegram.sendMessage(config.OWNER_ID, msgs.ownerNewFeedback(ctx.from.first_name));
        await ctx.copyMessage(config.OWNER_ID);
        return;
    }

    // Ответ учителя ученику
    if (state.step === 'REPLYING') {
        if (ctx.message.text === msgs.buttons.common.finish) { delete userStates[userId]; return ctx.reply("✅ Диалог закрыт.", mainMenu(ctx)); }
        if (!state.hSent) { await bot.telegram.sendMessage(state.target, msgs.studentReceivedReplyHeader); userStates[userId].hSent = true; }
        await ctx.copyMessage(state.target);
        return;
    }

    // Ввод текстов учителем
    const inp = { 'W_HW': 'C_HW', 'W_VOC': 'C_VOC', 'W_MAT': 'C_MAT', 'W_NEWS': 'C_NEWS' };
    if (inp[state.step]) {
        userStates[userId].data = ctx.message.text;
        userStates[userId].old = state.step;
        userStates[userId].step = inp[state.step];
        return ctx.reply(msgs.confirmAction, Markup.keyboard([[msgs.buttons.common.confirm, msgs.buttons.common.cancel]]).resize());
    }

    // Кнопки подтверждения
    if (ctx.message.text === msgs.buttons.common.confirm) {
        if (state.step === 'CONF_BROAD') {
            for (let [uId] of allUsers) { try { await bot.telegram.copyMessage(uId, userId, state.msgId); } catch (e) {} }
            ctx.reply("✅ Рассылка завершена", mainMenu(ctx));
        } else {
            if (state.old === 'W_HW') currentHomework = state.data;
            if (state.old === 'W_VOC') currentVocabulary = state.data;
            if (state.old === 'W_MAT') currentMaterials = state.data;
            if (state.old === 'W_NEWS') await bot.telegram.sendMessage(config.GROUP_ID, `📢 **НОВОСТИ:**\n\n${state.data}`, { parse_mode: 'Markdown' });
            ctx.reply("✅ Обновлено", mainMenu(ctx));
        }
        delete userStates[userId];
    } else if (ctx.message.text === msgs.buttons.common.cancel) {
        delete userStates[userId];
        ctx.reply(msgs.cancelOp, mainMenu(ctx));
    }
});

// Кнопка "Ответить"
bot.on('callback_query', async (ctx) => {
    const d = ctx.callbackQuery.data;
    if (d.startsWith('ans_')) {
        const p = d.split('_');
        userStates[ctx.from.id] = { step: 'REPLYING', target: p[1], hSent: false };
        await bot.telegram.sendMessage(p[1], msgs.studentWait);
        await ctx.reply(msgs.teacherReplyStart(p[2]), Markup.keyboard([[msgs.buttons.common.finish]]).resize());
    }
    await ctx.answerCbQuery();
});

bot.launch().then(() => console.log('Bot is running!'));
