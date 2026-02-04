const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const msgs = require('./messages');

const bot = new Telegraf(config.TOKEN);

/* ===== UTILS ===== */
const esc = (str = '') =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ===== DATA ===== */
let currentHomework = "Пока не задано";
let currentVocabulary = "Пока не добавлено";
let currentMaterials = "Пока не добавлено";

let allUsers = new Map();
let userStates = {};

// 🔥 ЧАТЫ
let dialogs = new Map(); // userId -> { with }

/* ===== ROLES ===== */
const isOwner = (ctx) => ctx.from?.id === config.OWNER_ID;
const isTeacher = (ctx) =>
    ctx.from && (ctx.from.id === config.TEACHER_ID || ctx.from.id === config.OWNER_ID);

/* ===== MIDDLEWARE ===== */
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

/* ===== MENU ===== */
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

/* ===== START ===== */
bot.start(checkPrivate, checkMembership, (ctx) => {
    const text = isOwner(ctx)
        ? msgs.ownerMenu
        : isTeacher(ctx)
        ? msgs.teacherMenu
        : msgs.studentMenu;

    ctx.reply(text, { parse_mode: 'HTML', ...getMenu(ctx) });
});

/* ===== STUDENT VIEW ===== */
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

/* ===== TEACHER SET ===== */
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

/* ===== SEND NEWS ===== */
bot.hears(msgs.buttons.teacher.sendNews, (ctx) => {
    if (!isTeacher(ctx)) return;
    userStates[ctx.from.id] = { step: 'NEWS' };
    ctx.reply("<b>Введите сообщение для группы:</b>", { parse_mode: 'HTML' });
});

/* ===== HELP / FEEDBACK ===== */
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

/* ===== ADMIN PANEL ===== */
bot.hears(msgs.buttons.owner.adminPanel, (ctx) => {
    if (!isOwner(ctx)) return;

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

/* ===== CALLBACKS ===== */
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data.startsWith('reply_')) {
        const studentId = data.split('_')[1];

        dialogs.set(ctx.from.id, { with: studentId });
        dialogs.set(studentId, { with: ctx.from.id });

        await bot.telegram.sendMessage(
            studentId,
            "<b>Учитель подключился к чату</b>",
            {
                parse_mode: 'HTML',
                ...Markup.keyboard([[msgs.buttons.common.finish]]).resize()
            }
        );

        await ctx.reply(
            "<b>Чат с учеником открыт</b>",
            {
                parse_mode: 'HTML',
                ...Markup.keyboard([[msgs.buttons.common.finish]]).resize()
            }
        );

        return ctx.answerCbQuery();
    }
});

/* ===== MESSAGE HANDLER ===== */
bot.on('message', async (ctx) => {

    // 🔥 ЧАТ
    if (dialogs.has(ctx.from.id)) {
        const dialog = dialogs.get(ctx.from.id);

        if (ctx.message.text === msgs.buttons.common.finish) {
            dialogs.delete(ctx.from.id);
            dialogs.delete(dialog.with);

            await bot.telegram.sendMessage(
                dialog.with,
                "<b>Диалог завершён</b>",
                { parse_mode: 'HTML', ...getMenu(ctx) }
            );

            return ctx.reply(
                "<b>Диалог завершён</b>",
                { parse_mode: 'HTML', ...getMenu(ctx) }
            );
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
