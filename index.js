const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const msgs = require('./messages');

const bot = new Telegraf(config.TOKEN);
let currentHomework = "Пока не задано";
let currentMaterials = "Пока не добавлено";
let currentVocabulary = "Пока не добавлено";
let userStates = {}; 

const isTeacher = (ctx) => ctx.from && ctx.from.id === config.TEACHER_ID;

const checkPrivate = (ctx, next) => {
    if (ctx.chat.type !== 'private') return;
    return next();
};

const checkMembership = async (ctx, next) => {
    try {
        const member = await ctx.telegram.getChatMember(config.GROUP_ID, ctx.from.id);
        if (['member', 'administrator', 'creator'].includes(member.status) || isTeacher(ctx)) {
            return next();
        }
        return ctx.reply(msgs.accessDenied);
    } catch (e) {
        return ctx.reply(msgs.accessDenied);
    }
};

const mainMenu = (ctx) => {
    if (isTeacher(ctx)) {
        return Markup.keyboard([
            [msgs.buttons.teacher.setHomework, msgs.buttons.teacher.setVocabulary],
            [msgs.buttons.teacher.setMaterials, msgs.buttons.teacher.sendNews]
        ]).resize();
    }
    return Markup.keyboard([
        [msgs.buttons.student.homework, msgs.buttons.student.vocabulary],
        [msgs.buttons.student.materials, msgs.buttons.student.help]
    ]).resize();
};

bot.start(checkPrivate, checkMembership, (ctx) => {
    ctx.reply(isTeacher(ctx) ? msgs.teacherMenu : msgs.studentMenu, mainMenu(ctx));
});

// --- КНОПКИ ИНФОРМАЦИИ ---
bot.hears(msgs.buttons.student.homework, checkPrivate, checkMembership, (ctx) => ctx.reply(currentHomework === "Пока не задано" ? "Заданий нет" : msgs.homeworkDisplay(currentHomework), { parse_mode: 'Markdown' }));
bot.hears(msgs.buttons.student.vocabulary, checkPrivate, checkMembership, (ctx) => ctx.reply(currentVocabulary === "Пока не добавлено" ? "Списка нет" : msgs.vocabDisplay(currentVocabulary), { parse_mode: 'Markdown' }));
bot.hears(msgs.buttons.student.materials, checkPrivate, checkMembership, (ctx) => ctx.reply(currentMaterials === "Пока не добавлено" ? "Материалов нет" : msgs.materialsDisplay(currentMaterials), { parse_mode: 'Markdown', disable_web_page_preview: true }));

// --- РЕЖИМ ПОМОЩИ (УЧЕНИК) ---
bot.hears(msgs.buttons.student.help, checkPrivate, checkMembership, (ctx) => {
    userStates[ctx.from.id] = { step: 'STUDENT_SENDING_HELP' };
    ctx.reply(msgs.helpPrompt, Markup.keyboard([[msgs.buttons.common.finish]]).resize(), { parse_mode: 'Markdown' });
});

// --- КНОПКИ УЧИТЕЛЯ ---
bot.hears(msgs.buttons.teacher.setHomework, checkPrivate, (ctx) => { if (isTeacher(ctx)) { userStates[ctx.from.id] = { step: 'WAITING_HW' }; ctx.reply(msgs.setHwPrompt, Markup.removeKeyboard()); } });
bot.hears(msgs.buttons.teacher.setVocabulary, checkPrivate, (ctx) => { if (isTeacher(ctx)) { userStates[ctx.from.id] = { step: 'WAITING_VOCAB' }; ctx.reply(msgs.setVocabPrompt, Markup.removeKeyboard()); } });
bot.hears(msgs.buttons.teacher.setMaterials, checkPrivate, (ctx) => { if (isTeacher(ctx)) { userStates[ctx.from.id] = { step: 'WAITING_MAT' }; ctx.reply(msgs.setMatPrompt, Markup.removeKeyboard()); } });
bot.hears(msgs.buttons.teacher.sendNews, checkPrivate, (ctx) => { if (isTeacher(ctx)) { userStates[ctx.from.id] = { step: 'WAITING_NEWS' }; ctx.reply(msgs.newsPrompt, Markup.removeKeyboard()); } });

// --- ГЛАВНЫЙ ОБРАБОТЧИК СООБЩЕНИЙ ---
bot.on('message', checkPrivate, checkMembership, async (ctx) => {
    const userId = ctx.from.id;
    const state = userStates[userId];

    if (!state) return ctx.reply(msgs.unknown, mainMenu(ctx));

    // 1. Ученик отправляет вопрос
    if (state.step === 'STUDENT_SENDING_HELP') {
        if (ctx.message.text === msgs.buttons.common.finish) {
            delete userStates[userId];
            return ctx.reply(msgs.helpFinished, mainMenu(ctx));
        }
        // Пересылка учителю
        await bot.telegram.sendMessage(config.TEACHER_ID, msgs.teacherNewHelpAlert(ctx.from.username || '?', ctx.from.first_name));
        await ctx.copyMessage(config.TEACHER_ID, {
            reply_markup: { inline_keyboard: [[{ text: `✍ Ответить ${ctx.from.first_name}`, callback_data: `ans_${userId}_${ctx.from.first_name}` }]] }
        });
        return;
    }

    // 2. Учитель отвечает (Копирование сообщений)
    if (state.step === 'TEACHER_REPLYING') {
        if (ctx.message.text === msgs.buttons.common.finish) {
            delete userStates[userId];
            return ctx.reply(msgs.teacherReplyEnd, mainMenu(ctx));
        }
        if (!state.headerSent) {
            await bot.telegram.sendMessage(state.targetId, msgs.studentReceivedReplyHeader, { parse_mode: 'Markdown' });
            userStates[userId].headerSent = true;
        }
        await ctx.copyMessage(state.targetId);
        return;
    }

    // 3. Ввод данных учителем (ДЗ, Слова и т.д.)
    const inputSteps = ['WAITING_HW', 'WAITING_VOCAB', 'WAITING_MAT', 'WAITING_NEWS'];
    if (inputSteps.includes(state.step)) {
        userStates[userId].data = ctx.message.text;
        userStates[userId].oldStep = state.step;
        userStates[userId].step = 'CONFIRM_ANY';
        return ctx.reply("Подтверждаете действие?", Markup.keyboard([[msgs.buttons.common.confirm, msgs.buttons.common.cancel]]).resize());
    }

    // 4. Подтверждение
    if (ctx.message.text === msgs.buttons.common.confirm && state.step === 'CONFIRM_ANY') {
        if (state.oldStep === 'WAITING_HW') currentHomework = state.data, ctx.reply("✅ ДЗ обновлено", mainMenu(ctx));
        if (state.oldStep === 'WAITING_VOCAB') currentVocabulary = state.data, ctx.reply("✅ Слова обновлены", mainMenu(ctx));
        if (state.oldStep === 'WAITING_MAT') currentMaterials = state.data, ctx.reply("✅ Материалы обновлены", mainMenu(ctx));
        if (state.oldStep === 'WAITING_NEWS') {
            await bot.telegram.sendMessage(config.GROUP_ID, `📢 **НОВОСТИ:**\n\n${state.data}`, { parse_mode: 'Markdown' });
            ctx.reply("✅ Отправлено в группу", mainMenu(ctx));
        }
        delete userStates[userId];
        return;
    }

    if (ctx.message.text === msgs.buttons.common.cancel) {
        delete userStates[userId];
        return ctx.reply(msgs.cancelOp, mainMenu(ctx));
    }
});

// --- CALLBACK: НАЖАТИЕ "ОТВЕТИТЬ" ПОД ВОПРОСОМ ---
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (data.startsWith('ans_')) {
        const parts = data.split('_');
        const studentId = parts[1];
        const studentName = parts[2];

        userStates[ctx.from.id] = { 
            step: 'TEACHER_REPLYING', 
            targetId: studentId, 
            headerSent: false 
        };

        await bot.telegram.sendMessage(studentId, msgs.studentWait, { parse_mode: 'Markdown' });
        
        // Учителю показываем инструкцию
        await ctx.reply(msgs.teacherReplyStart(studentName), Markup.keyboard([[msgs.buttons.common.finish]]).resize());
    }
    await ctx.answerCbQuery();
});

bot.launch().then(() => console.log('Communication system updated!'));
