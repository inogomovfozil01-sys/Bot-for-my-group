const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const msgs = require('./messages');

const bot = new Telegraf(config.TOKEN);
let currentHomework = "Пока не задано";
let userStates = {};

const isTeacher = (ctx) => ctx.from.id === config.TEACHER_ID;

const checkMembership = async (ctx, next) => {
    if (ctx.chat.type !== 'private') return next();
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
        return Markup.keyboard([[msgs.buttons.teacher.setHomework, msgs.buttons.teacher.sendNews]]).resize();
    }
    return Markup.keyboard([[msgs.buttons.student.homework]]).resize();
};

bot.start(checkMembership, (ctx) => {
    ctx.reply(isTeacher(ctx) ? msgs.teacherMenu : msgs.studentMenu, mainMenu(ctx));
});

bot.hears(msgs.buttons.student.homework, checkMembership, (ctx) => {
    ctx.reply(currentHomework === "Пока не задано" ? msgs.homeworkEmpty : msgs.homeworkDisplay(currentHomework), { parse_mode: 'Markdown' });
});

bot.hears(msgs.buttons.teacher.setHomework, checkMembership, (ctx) => {
    if (!isTeacher(ctx)) return;
    userStates[ctx.from.id] = { step: 'WAITING_HW' };
    ctx.reply(msgs.setHwPrompt, Markup.removeKeyboard());
});

bot.hears(msgs.buttons.teacher.sendNews, checkMembership, (ctx) => {
    if (!isTeacher(ctx)) return;
    userStates[ctx.from.id] = { step: 'WAITING_NEWS' };
    ctx.reply(msgs.newsPrompt, Markup.removeKeyboard());
});

bot.on('message', checkMembership, async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    const userId = ctx.from.id;
    const state = userStates[userId];

    if (!state && !isTeacher(ctx)) {
        userStates[userId] = { step: 'STUDENT_SENDING_HELP' };
        await ctx.reply(msgs.helpAutoInfo, Markup.keyboard([[msgs.buttons.common.finish]]).resize());
        await bot.telegram.sendMessage(config.TEACHER_ID, msgs.teacherNewHelpAlert(ctx.from.username || userId));
        await ctx.copyMessage(config.TEACHER_ID, {
            reply_markup: { inline_keyboard: [[{ text: "✍ Ответить", callback_data: `ans_${userId}` }]] }
        });
        return;
    }

    if (state) {
        if (state.step === 'STUDENT_SENDING_HELP') {
            if (ctx.message.text === msgs.buttons.common.finish) {
                delete userStates[userId];
                return ctx.reply("✅ Отправка завершена.", mainMenu(ctx));
            }
            return ctx.copyMessage(config.TEACHER_ID, {
                reply_markup: { inline_keyboard: [[{ text: "✍ Ответить", callback_data: `ans_${userId}` }]] }
            });
        }

        if (state.step === 'WAITING_HW') {
            userStates[userId].data = ctx.message.text;
            userStates[userId].step = 'CONFIRM_HW';
            return ctx.reply(msgs.setHwConfirm, Markup.keyboard([[msgs.buttons.common.confirm, msgs.buttons.common.cancel]]).resize());
        }

        if (state.step === 'WAITING_NEWS') {
            userStates[userId].data = ctx.message.text;
            userStates[userId].step = 'CONFIRM_NEWS';
            return ctx.reply(msgs.newsConfirm, Markup.keyboard([[msgs.buttons.common.confirm, msgs.buttons.common.cancel]]).resize());
        }

        if (state.step === 'TEACHER_REPLYING') {
            if (ctx.message.text === msgs.buttons.common.finish) {
                delete userStates[userId];
                return ctx.reply("✅ Ответ отправлен.", mainMenu(ctx));
            }
            return ctx.copyMessage(state.targetId);
        }

        if (ctx.message.text === msgs.buttons.common.confirm) {
            if (state.step === 'CONFIRM_HW') {
                currentHomework = state.data;
                ctx.reply(msgs.setHwSuccess, mainMenu(ctx));
            } else if (state.step === 'CONFIRM_NEWS') {
                await bot.telegram.sendMessage(config.GROUP_ID, `📢 **НОВОСТИ:**\n\n${state.data}`, { parse_mode: 'Markdown' });
                ctx.reply(msgs.newsSuccess, mainMenu(ctx));
            }
            delete userStates[userId];
            return;
        }

        if (ctx.message.text === msgs.buttons.common.cancel) {
            delete userStates[userId];
            return ctx.reply(msgs.cancelOp, mainMenu(ctx));
        }
    }
});

bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (data.startsWith('ans_')) {
        const studentId = data.replace('ans_', '');
        userStates[ctx.from.id] = { step: 'TEACHER_REPLYING', targetId: studentId };
        await bot.telegram.sendMessage(studentId, msgs.studentReceivedReply);
        await ctx.reply(msgs.teacherReplyStart, Markup.keyboard([[msgs.buttons.common.finish]]).resize());
    }
    await ctx.answerCbQuery();
});

bot.launch().then(() => console.log('Started'));