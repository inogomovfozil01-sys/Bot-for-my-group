const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const msgs = require('./messages');

const bot = new Telegraf(config.TOKEN);

const esc = (str = '') =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let currentHomework = "Пока не задано";
let currentMaterials = "Пока не добавлено";
let currentVocabulary = "Пока не добавлено";

let allUsers = new Map();
let userStates = {};

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
    const txt = isOwner(ctx)
        ? msgs.ownerMenu
        : isTeacher(ctx)
        ? msgs.teacherMenu
        : msgs.studentMenu;

    ctx.reply(txt, { parse_mode: 'HTML', ...getMenu(ctx) });
});

/* ===== ADMIN PANEL ===== */

bot.hears(msgs.buttons.owner.adminPanel, checkPrivate, (ctx) => {
    if (!isOwner(ctx)) return;
    if (!allUsers.size) return ctx.reply("Список учеников пуст.");

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

    if (data.startsWith('manage_')) {
        const userId = data.split('_')[1];
        const userName = allUsers.get(userId) || "Ученик";

        return ctx.editMessageText(
            msgs.adminUserActions(userName),
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback("Мут", `exec_mute_${userId}`),
                        Markup.button.callback("Размут", `exec_unmute_${userId}`)
                    ],
                    [
                        Markup.button.callback("Бан", `exec_ban_${userId}`),
                        Markup.button.callback("Разбан", `exec_unban_${userId}`)
                    ]
                ])
            }
        );
    }

    if (data.startsWith('exec_')) {
        const [, action, userId] = data.split('_');
        try {
            if (action === 'mute')
                await ctx.telegram.restrictChatMember(config.GROUP_ID, userId, {
                    can_send_messages: false
                });

            if (action === 'unmute')
                await ctx.telegram.restrictChatMember(config.GROUP_ID, userId, {
                    can_send_messages: true,
                    can_send_media_messages: true,
                    can_send_other_messages: true,
                    can_add_web_page_previews: true
                });

            if (action === 'ban')
                await ctx.telegram.banChatMember(config.GROUP_ID, userId);

            if (action === 'unban')
                await ctx.telegram.unbanChatMember(config.GROUP_ID, userId);

            await ctx.answerCbQuery(action);
            return ctx.editMessageText(
                `Пользователь ID ${userId}: <b>${action.toUpperCase()}</b>`,
                { parse_mode: 'HTML' }
            );
        } catch {
            await ctx.answerCbQuery("Ошибка");
            return ctx.editMessageText("Бот не админ или нет прав.");
        }
    }

    if (data.startsWith('ans_')) {
        const [, target, name] = data.split('_');
        userStates[ctx.from.id] = { step: 'REPLYING', target, h: false };
        await bot.telegram.sendMessage(target, msgs.studentWait, { parse_mode: 'HTML' });
        await ctx.reply(
            msgs.teacherReplyStart(name),
            Markup.keyboard([[msgs.buttons.common.finish]]).resize()
        );
        return ctx.answerCbQuery();
    }

    ctx.answerCbQuery();
});

bot.hears(msgs.buttons.student.homework, checkPrivate, checkMembership,
    (ctx) => ctx.reply(msgs.homeworkDisplay(esc(currentHomework)), { parse_mode: 'HTML' })
);

bot.hears(msgs.buttons.student.vocabulary, checkPrivate, checkMembership,
    (ctx) => ctx.reply(msgs.vocabDisplay(esc(currentVocabulary)), { parse_mode: 'HTML' })
);

bot.hears(msgs.buttons.student.materials, checkPrivate, checkMembership,
    (ctx) => ctx.reply(msgs.materialsDisplay(esc(currentMaterials)), {
        parse_mode: 'HTML',
        disable_web_page_preview: true
    })
);

/* ===== MESSAGE HANDLER ===== */

bot.on('message', checkPrivate, async (ctx) => {
    const st = userStates[ctx.from.id];
    if (!st) return ctx.reply("Используй меню", getMenu(ctx));

    if (st.step === 'REPLYING') {
        if (ctx.message.text === msgs.buttons.common.finish) {
            delete userStates[ctx.from.id];
            return ctx.reply("Закрыто", getMenu(ctx));
        }
        if (!st.h) {
            await bot.telegram.sendMessage(st.target, msgs.replyHeader, { parse_mode: 'HTML' });
            st.h = true;
        }
        return ctx.copyMessage(st.target);
    }
});

bot.launch().then(() => console.log('Silent Admin Bot Started'));
