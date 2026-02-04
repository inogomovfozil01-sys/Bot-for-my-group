const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const msgs = require('./messages');

const bot = new Telegraf(config.TOKEN);

const esc = (str = '') =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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

/* ===== HELP TO TEACHER ===== */

bot.hears(msgs.buttons.student.help, checkPrivate, checkMembership, (ctx) => {
    userStates[ctx.from.id] = { step: 'HELP' };
    ctx.reply("<b>Напишите сообщение учителю:</b>", { parse_mode: 'HTML' });
});

/* ===== FEEDBACK TO OWNER ===== */

bot.hears(msgs.buttons.student.feedback, checkPrivate, checkMembership, (ctx) => {
    userStates[ctx.from.id] = { step: 'FEEDBACK' };
    ctx.reply("<b>Напишите сообщение директору:</b>", { parse_mode: 'HTML' });
});

/* ===== CALLBACKS ===== */

bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data.startsWith('ans_')) {
        const [, target, name] = data.split('_');
        userStates[ctx.from.id] = { step: 'REPLYING', target, h: false };

        await bot.telegram.sendMessage(
            target,
            msgs.studentWait,
            { parse_mode: 'HTML' }
        );

        await ctx.reply(
            msgs.teacherReplyStart(name),
            {
                parse_mode: 'HTML',
                ...Markup.keyboard([[msgs.buttons.common.finish]]).resize()
            }
        );
        return ctx.answerCbQuery();
    }

    ctx.answerCbQuery();
});

/* ===== MESSAGE HANDLER ===== */

bot.on('message', checkPrivate, async (ctx) => {
    const st = userStates[ctx.from.id];
    if (!st) {
        return ctx.reply(
            msgs.unknown,
            { parse_mode: 'HTML', ...getMenu(ctx) }
        );
    }

    /* === УЧИТЕЛЮ === */
    if (st.step === 'HELP') {
        const name = allUsers.get(ctx.from.id.toString()) || "Ученик";

        await bot.telegram.sendMessage(
            config.TEACHER_ID,
            `${msgs.teacherNewHelpAlert(name)}\n\n${esc(ctx.message.text)}`,
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback("Ответить", `ans_${ctx.from.id}_${name}`)]
                ])
            }
        );

        delete userStates[ctx.from.id];
        return ctx.reply(
            msgs.studentWait,
            { parse_mode: 'HTML', ...getMenu(ctx) }
        );
    }

    /* === ДИРЕКТОРУ === */
    if (st.step === 'FEEDBACK') {
        const name = allUsers.get(ctx.from.id.toString()) || "Ученик";

        await bot.telegram.sendMessage(
            config.OWNER_ID,
            `${msgs.ownerNewFeedbackAlert(name)}\n\n${esc(ctx.message.text)}`,
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback("Ответить", `ans_${ctx.from.id}_${name}`)]
                ])
            }
        );

        delete userStates[ctx.from.id];
        return ctx.reply(
            msgs.studentWait,
            { parse_mode: 'HTML', ...getMenu(ctx) }
        );
    }

    /* === ОТВЕТ === */
    if (st.step === 'REPLYING') {
        if (ctx.message.text === msgs.buttons.common.finish) {
            delete userStates[ctx.from.id];
            return ctx.reply(
                msgs.cancelOp,
                { parse_mode: 'HTML', ...getMenu(ctx) }
            );
        }

        if (!st.h) {
            await bot.telegram.sendMessage(
                st.target,
                msgs.replyHeader,
                { parse_mode: 'HTML' }
            );
            st.h = true;
        }

        return ctx.copyMessage(st.target);
    }
});

bot.launch().then(() => console.log('Silent Admin Bot Started'));
