const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const msgs = require('./messages');

const bot = new Telegraf(config.TOKEN);

// Вспомогательная функция для защиты HTML
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
    if (ctx.from) allUsers.set(ctx.from.id, `${esc(ctx.from.first_name)}${ctx.from.username ? ` (@${ctx.from.username})` : ''}`);
    return next();
};

const checkMembership = async (ctx, next) => {
    if (isOwner(ctx) || isTeacher(ctx)) return next();
    try {
        const member = await ctx.telegram.getChatMember(config.GROUP_ID, ctx.from.id);
        if (['member', 'administrator', 'creator'].includes(member.status)) return next();
        return ctx.reply(msgs.accessDenied, { parse_mode: 'HTML' });
    } catch (e) { 
        return ctx.reply(msgs.accessDenied, { parse_mode: 'HTML' }); 
    }
};

const getMenu = (ctx) => {
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
    const txt = isOwner(ctx) ? msgs.ownerMenu : (isTeacher(ctx) ? msgs.teacherMenu : msgs.studentMenu);
    ctx.reply(txt, { parse_mode: 'HTML', ...getMenu(ctx) });
});

bot.hears(msgs.buttons.student.homework, checkPrivate, checkMembership, (ctx) => ctx.reply(msgs.homeworkDisplay(esc(currentHomework)), { parse_mode: 'HTML' }));
bot.hears(msgs.buttons.student.vocabulary, checkPrivate, checkMembership, (ctx) => ctx.reply(msgs.vocabDisplay(esc(currentVocabulary)), { parse_mode: 'HTML' }));
bot.hears(msgs.buttons.student.materials, checkPrivate, checkMembership, (ctx) => ctx.reply(msgs.materialsDisplay(esc(currentMaterials)), { parse_mode: 'HTML', disable_web_page_preview: true }));

bot.hears(msgs.buttons.student.help, checkPrivate, checkMembership, (ctx) => {
    userStates[ctx.from.id] = { step: 'ASKING_TEACHER' };
    ctx.reply(msgs.helpPrompt, { parse_mode: 'HTML', ...Markup.keyboard([[msgs.buttons.common.finish]]).resize() });
});

bot.hears(msgs.buttons.student.feedback, checkPrivate, checkMembership, (ctx) => {
    userStates[ctx.from.id] = { step: 'ASKING_OWNER' };
    ctx.reply(msgs.feedbackPrompt, { parse_mode: 'HTML', ...Markup.keyboard([[msgs.buttons.common.finish]]).resize() });
});

bot.hears(msgs.buttons.owner.stats, checkPrivate, (ctx) => isOwner(ctx) && ctx.reply(`📊 База: ${allUsers.size} чел.`, { parse_mode: 'HTML' }));
bot.hears(msgs.buttons.owner.exportUsers, checkPrivate, (ctx) => {
    if (!isOwner(ctx)) return;
    let s = "📥 <b>Список:</b>\n\n";
    allUsers.forEach((v, k) => s += `• ${v} (<code>${k}</code>)\n`);
    ctx.reply(s, { parse_mode: 'HTML' });
});

bot.hears(msgs.buttons.owner.broadcastAll, checkPrivate, (ctx) => {
    if (!isOwner(ctx)) return;
    userStates[ctx.from.id] = { step: 'WAIT_BROAD' };
    ctx.reply(msgs.broadcastPrompt, { parse_mode: 'HTML', ...Markup.removeKeyboard() });
});

bot.hears(msgs.buttons.teacher.setHomework, (ctx) => isTeacher(ctx) && (userStates[ctx.from.id] = { step: 'W_HW' }, ctx.reply("Введите текст ДЗ:", Markup.removeKeyboard())));
bot.hears(msgs.buttons.teacher.setVocabulary, (ctx) => isTeacher(ctx) && (userStates[ctx.from.id] = { step: 'W_VOC' }, ctx.reply("Введите слова:", Markup.removeKeyboard())));
bot.hears(msgs.buttons.teacher.setMaterials, (ctx) => isTeacher(ctx) && (userStates[ctx.from.id] = { step: 'W_MAT' }, ctx.reply("Введите материалы:", Markup.removeKeyboard())));
bot.hears(msgs.buttons.teacher.sendNews, (ctx) => isTeacher(ctx) && (userStates[ctx.from.id] = { step: 'W_NEWS' }, ctx.reply("Введите новость:", Markup.removeKeyboard())));

bot.on('message', checkPrivate, async (ctx) => {
    const uid = ctx.from.id;
    const st = userStates[uid];
    if (!st) return ctx.reply("⚠ Используйте меню:", getMenu(ctx));

    // Ученик -> Учителю
    if (st.step === 'ASKING_TEACHER') {
        if (ctx.message.text === msgs.buttons.common.finish) { delete userStates[uid]; return ctx.reply("✅ Отправлено учителю.", { parse_mode: 'HTML', ...getMenu(ctx) }); }
        await bot.telegram.sendMessage(config.TEACHER_ID, msgs.teacherNewHelpAlert(esc(ctx.from.first_name)), { parse_mode: 'HTML' });
        await ctx.copyMessage(config.TEACHER_ID, { reply_markup: { inline_keyboard: [[{ text: `✍ Ответить ${ctx.from.first_name}`, callback_data: `ans_${uid}_${ctx.from.first_name}` }]] } });
        return;
    }

    // Ученик -> Владельцу
    if (st.step === 'ASKING_OWNER') {
        if (ctx.message.text === msgs.buttons.common.finish) { delete userStates[uid]; return ctx.reply("✅ Отправлено директору.", { parse_mode: 'HTML', ...getMenu(ctx) }); }
        await bot.telegram.sendMessage(config.OWNER_ID, msgs.ownerNewFeedbackAlert(esc(ctx.from.first_name)), { parse_mode: 'HTML' });
        await ctx.copyMessage(config.OWNER_ID, { reply_markup: { inline_keyboard: [[{ text: `✍ Ответить ${ctx.from.first_name}`, callback_data: `ans_${uid}_${ctx.from.first_name}` }]] } });
        return;
    }

    // Режим ответа
    if (st.step === 'REPLYING') {
        if (ctx.message.text === msgs.buttons.common.finish) { delete userStates[uid]; return ctx.reply("✅ Диалог закрыт.", getMenu(ctx)); }
        if (!st.h) { await bot.telegram.sendMessage(st.target, msgs.replyHeader, { parse_mode: 'HTML' }); userStates[uid].h = true; }
        await ctx.copyMessage(st.target);
        return;
    }

    // Рассылка
    if (st.step === 'WAIT_BROAD') {
        userStates[uid].msg = ctx.message.message_id;
        userStates[uid].step = 'CONF_BROAD';
        return ctx.reply("Подтвердить рассылку?", Markup.keyboard([[msgs.buttons.common.confirm, msgs.buttons.common.cancel]]).resize());
    }

    // Подготовка контента (ДЗ и т.д.)
    const steps = { 'W_HW': 'C_HW', 'W_VOC': 'C_VOC', 'W_MAT': 'C_MAT', 'W_NEWS': 'C_NEWS' };
    if (steps[st.step]) {
        userStates[uid].data = ctx.message.text;
        userStates[uid].old = st.step;
        userStates[uid].step = steps[st.step];
        return ctx.reply("Подтвердить обновление?", Markup.keyboard([[msgs.buttons.common.confirm, msgs.buttons.common.cancel]]).resize());
    }

    // Логика кнопок Да/Нет
    if (ctx.message.text === msgs.buttons.common.confirm) {
        if (st.step === 'CONF_BROAD') {
            for (let [id] of allUsers) { try { await bot.telegram.copyMessage(id, uid, st.msg); } catch (e) {} }
            ctx.reply("✅ Рассылка выполнена", getMenu(ctx));
        } else {
            if (st.old === 'W_HW') currentHomework = st.data;
            if (st.old === 'W_VOC') currentVocabulary = st.data;
            if (st.old === 'W_MAT') currentMaterials = state.data;
            if (st.old === 'W_NEWS') await bot.telegram.sendMessage(config.GROUP_ID, `📢 <b>НОВОСТИ:</b>\n\n${esc(st.data)}`, { parse_mode: 'HTML' });
            ctx.reply("✅ Готово", getMenu(ctx));
        }
        delete userStates[uid];
    } else if (ctx.message.text === msgs.buttons.common.cancel) {
        delete userStates[uid];
        ctx.reply(msgs.cancelOp, getMenu(ctx));
    }
});

bot.on('callback_query', async (ctx) => {
    const d = ctx.callbackQuery.data;
    if (d.startsWith('ans_')) {
        const p = d.split('_');
        userStates[ctx.from.id] = { step: 'REPLYING', target: p[1], h: false };
        await bot.telegram.sendMessage(p[1], "⏳ <b>Учитель/Директор подключается к диалогу...</b>", { parse_mode: 'HTML' });
        await ctx.reply(`✍ Режим ответа для: <b>${p[2]}</b>. Отправьте сообщение, затем нажмите Завершить.`, { parse_mode: 'HTML', ...Markup.keyboard([[msgs.buttons.common.finish]]).resize() });
    }
    await ctx.answerCbQuery();
});

bot.launch().then(() => console.log('Bot is ready [Fixed HTML]'));
