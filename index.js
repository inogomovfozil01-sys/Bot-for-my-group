const { Telegraf, Markup } = require('telegraf');
const { Pool } = require('pg');
const config = require('./config');
const msgs = require('./messages');

const bot = new Telegraf(config.TOKEN);

const ROLE_IDS = {
    owner: String(config.OWNER_ID),
    teacher: String(config.TEACHER_ID)
};

const CHAT_IDS = {
    group: String(config.GROUP_ID),
    teacherChat: String(config.TEACHER_CHAT_ID)
};

const CONTENT_KEYS = {
    homework: 'homework',
    vocabulary: 'vocabulary',
    materials: 'materials'
};

const STATES = {
    REGISTER_NAME: 'REGISTER_NAME',
    REGISTER_PHONE: 'REGISTER_PHONE',
    SET_HOMEWORK: 'SET_HOMEWORK',
    SET_VOCABULARY: 'SET_VOCABULARY',
    SET_MATERIALS: 'SET_MATERIALS',
    NEWS: 'NEWS',
    BROADCAST: 'BROADCAST',
    FEEDBACK: 'FEEDBACK'
};

const HTML_ESCAPE = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
};

const userStates = new Map();
const dialogs = new Map();
const lastGroupMessages = new Map();
const memoryUsers = new Map();
const studentTopicCache = new Map();
const topicStudentCache = new Map();

const contentStore = {
    [CONTENT_KEYS.homework]: null,
    [CONTENT_KEYS.vocabulary]: null,
    [CONTENT_KEYS.materials]: null
};

let pool = null;
let dbReady = false;

if (config.DATABASE_URL) {
    const useSsl = /railway|render|supabase|amazonaws/i.test(config.DATABASE_URL) || process.env.DATABASE_SSL === 'true';
    pool = new Pool({
        connectionString: config.DATABASE_URL,
        ssl: useSsl ? { rejectUnauthorized: false } : false
    });
}

function esc(str = '') {
    return String(str).replace(/[&<>]/g, (ch) => HTML_ESCAPE[ch]);
}

function toId(value) {
    return String(value);
}

function isOwner(ctx) {
    return toId(ctx.from?.id) === ROLE_IDS.owner;
}

function isTeacher(ctx) {
    const id = toId(ctx.from?.id);
    return id === ROLE_IDS.teacher || id === ROLE_IDS.owner;
}

function getPath(obj, path) {
    return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function template(str, vars = {}) {
    return String(str).replace(/\{(\w+)\}/g, (_, key) => (vars[key] === undefined ? '' : String(vars[key])));
}

function getDefaultLangFromTelegram(languageCode) {
    return String(languageCode || '').toLowerCase().startsWith('en') ? 'en' : msgs.DEFAULT_LANG;
}

function normalizeLang(lang) {
    return msgs.SUPPORTED_LANGS.includes(lang) ? lang : msgs.DEFAULT_LANG;
}

function textByLang(lang, path, vars) {
    const value = getPath(msgs.LANGUAGES[normalizeLang(lang)], path);
    if (typeof value !== 'string') return '';
    return template(value, vars);
}

function buttonByLang(lang, path) {
    return textByLang(lang, `buttons.${path}`);
}

async function initDB() {
    if (!pool) {
        console.warn('DATABASE_URL is not configured. Using in-memory fallback.');
        return;
    }

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                phone TEXT,
                username TEXT,
                first_name TEXT,
                language TEXT DEFAULT 'ru',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS student_topics (
                user_id TEXT PRIMARY KEY,
                topic_id BIGINT NOT NULL,
                topic_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        dbReady = true;
        console.log('Database synchronized');
    } catch (e) {
        dbReady = false;
        console.error('DB Init Error:', e.message);
    }
}

async function getUserRecord(userId) {
    const id = toId(userId);
    if (dbReady) {
        try {
            const res = await pool.query('SELECT user_id, phone, username, first_name, language FROM users WHERE user_id = $1', [id]);
            if (res.rowCount > 0) return res.rows[0];
        } catch (e) {
            console.error('DB read user error:', e.message);
        }
    }
    return memoryUsers.get(id) || null;
}

async function upsertUserRecord(userId, payload = {}) {
    const id = toId(userId);
    const prev = memoryUsers.get(id) || {};

    const next = {
        user_id: id,
        phone: payload.phone ?? prev.phone ?? null,
        username: payload.username ?? prev.username ?? '',
        first_name: payload.first_name ?? prev.first_name ?? '',
        language: normalizeLang(payload.language ?? prev.language ?? msgs.DEFAULT_LANG)
    };

    memoryUsers.set(id, next);

    if (!dbReady) return;

    try {
        await pool.query(
            `INSERT INTO users (user_id, phone, username, first_name, language)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id)
             DO UPDATE SET
                phone = COALESCE(EXCLUDED.phone, users.phone),
                username = EXCLUDED.username,
                first_name = EXCLUDED.first_name,
                language = EXCLUDED.language`,
            [next.user_id, next.phone, next.username, next.first_name, next.language]
        );
    } catch (e) {
        console.error('DB upsert user error:', e.message);
    }
}

async function getUserLang(userId, telegramLangCode) {
    const user = await getUserRecord(userId);
    if (user?.language && msgs.SUPPORTED_LANGS.includes(user.language)) {
        return user.language;
    }
    return getDefaultLangFromTelegram(telegramLangCode);
}

async function setUserLang(userId, language, profile = {}) {
    const lang = normalizeLang(language);
    await upsertUserRecord(userId, {
        ...profile,
        language: lang
    });
}

async function isRegistered(userId) {
    const user = await getUserRecord(userId);
    return Boolean(user?.phone);
}

async function getStudents() {
    if (dbReady) {
        try {
            const res = await pool.query('SELECT user_id, first_name, username, phone FROM users WHERE phone IS NOT NULL ORDER BY created_at DESC');
            return res.rows;
        } catch (e) {
            console.error('DB students read error:', e.message);
        }
    }

    return Array.from(memoryUsers.values())
        .filter((u) => u.phone)
        .sort((a, b) => String(b.user_id).localeCompare(String(a.user_id)));
}

async function getStudentsForModeration() {
    const all = await getStudents();
    return all.filter((u) => ![ROLE_IDS.owner, ROLE_IDS.teacher].includes(toId(u.user_id)));
}

async function saveStudentTopic(userId, topicId, topicName) {
    const id = toId(userId);
    const thread = Number(topicId);

    studentTopicCache.set(id, thread);
    topicStudentCache.set(thread, id);

    if (!dbReady) return;

    try {
        await pool.query(
            `INSERT INTO student_topics (user_id, topic_id, topic_name)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id)
             DO UPDATE SET topic_id = EXCLUDED.topic_id, topic_name = EXCLUDED.topic_name`,
            [id, thread, topicName]
        );
    } catch (e) {
        console.error('DB save topic error:', e.message);
    }
}

async function getTopicByStudent(userId) {
    const id = toId(userId);
    if (studentTopicCache.has(id)) return studentTopicCache.get(id);

    if (dbReady) {
        try {
            const res = await pool.query('SELECT topic_id FROM student_topics WHERE user_id = $1', [id]);
            if (res.rowCount > 0) {
                const topicId = Number(res.rows[0].topic_id);
                studentTopicCache.set(id, topicId);
                topicStudentCache.set(topicId, id);
                return topicId;
            }
        } catch (e) {
            console.error('DB read topic error:', e.message);
        }
    }

    return null;
}

async function getStudentByTopic(topicId) {
    const thread = Number(topicId);
    if (topicStudentCache.has(thread)) return topicStudentCache.get(thread);

    if (dbReady) {
        try {
            const res = await pool.query('SELECT user_id FROM student_topics WHERE topic_id = $1', [thread]);
            if (res.rowCount > 0) {
                const studentId = toId(res.rows[0].user_id);
                topicStudentCache.set(thread, studentId);
                studentTopicCache.set(studentId, thread);
                return studentId;
            }
        } catch (e) {
            console.error('DB read student by topic error:', e.message);
        }
    }

    return null;
}

async function ensureStudentTopic(from, preferredName) {
    const userId = toId(from.id);
    const existing = await getTopicByStudent(userId);
    if (existing) return existing;

    const baseName = preferredName || from.first_name || 'Student';
    const safeName = String(baseName).slice(0, 120);
    const topic = await bot.telegram.createForumTopic(CHAT_IDS.teacherChat, safeName);
    await saveStudentTopic(userId, topic.message_thread_id, safeName);
    return topic.message_thread_id;
}

async function sendStudentCardToTopic(from, studentName, phone, username) {
    const teacherLang = await getUserLang(ROLE_IDS.teacher);
    const topicId = await ensureStudentTopic(from, studentName);
    const usernameText = username ? `@${username}` : '-';

    const card = [
        textByLang(teacherLang, 'text.studentCardTitle'),
        textByLang(teacherLang, 'text.studentCardName', { name: esc(studentName) }),
        textByLang(teacherLang, 'text.studentCardUsername', { username: esc(usernameText) }),
        textByLang(teacherLang, 'text.studentCardPhone', { phone: esc(phone) })
    ].join('\n');

    await bot.telegram.sendMessage(CHAT_IDS.teacherChat, card, {
        parse_mode: 'HTML',
        message_thread_id: topicId
    });
}

async function hasMembership(userId) {
    try {
        const member = await bot.telegram.getChatMember(CHAT_IDS.group, userId);
        return ['member', 'administrator', 'creator'].includes(member.status);
    } catch {
        return false;
    }
}

async function ensureStudentAccess(ctx) {
    if (isTeacher(ctx)) return true;
    const ok = await hasMembership(ctx.from.id);
    if (!ok) {
        const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
        await ctx.reply(textByLang(lang, 'text.accessDenied'), { parse_mode: 'HTML' });
    }
    return ok;
}

function buildMenu(lang, ctx) {
    if (isOwner(ctx)) {
        return Markup.keyboard([
            [buttonByLang(lang, 'student.homework'), buttonByLang(lang, 'student.vocabulary'), buttonByLang(lang, 'student.materials')],
            [buttonByLang(lang, 'teacher.setHomework'), buttonByLang(lang, 'teacher.setVocabulary'), buttonByLang(lang, 'teacher.setMaterials')],
            [buttonByLang(lang, 'teacher.sendNews'), buttonByLang(lang, 'owner.broadcastAll')],
            [buttonByLang(lang, 'owner.adminPanel'), buttonByLang(lang, 'owner.phones'), buttonByLang(lang, 'owner.stats')],
            [buttonByLang(lang, 'common.changeLanguage')]
        ]).resize();
    }

    if (isTeacher(ctx)) {
        return Markup.keyboard([
            [buttonByLang(lang, 'teacher.setHomework'), buttonByLang(lang, 'teacher.setVocabulary'), buttonByLang(lang, 'teacher.setMaterials')],
            [buttonByLang(lang, 'teacher.sendNews'), buttonByLang(lang, 'owner.adminPanel'), buttonByLang(lang, 'owner.phones')],
            [buttonByLang(lang, 'common.changeLanguage')]
        ]).resize();
    }

    return Markup.keyboard([
        [buttonByLang(lang, 'student.homework'), buttonByLang(lang, 'student.vocabulary')],
        [buttonByLang(lang, 'student.materials'), buttonByLang(lang, 'student.help')],
        [buttonByLang(lang, 'student.feedback')],
        [buttonByLang(lang, 'common.changeLanguage')]
    ]).resize();
}

async function sendMainMenu(ctx) {
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    const title = isOwner(ctx)
        ? textByLang(lang, 'menus.owner')
        : isTeacher(ctx)
            ? textByLang(lang, 'menus.teacher')
            : textByLang(lang, 'menus.student');

    await ctx.reply(title, { parse_mode: 'HTML', ...buildMenu(lang, ctx) });
}

async function sendLanguageSelector(ctx) {
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    await ctx.reply(textByLang(lang, 'text.languagePrompt'), {
        ...Markup.inlineKeyboard([
            [Markup.button.callback(buttonByLang('ru', 'language.russian'), 'lang_ru')],
            [Markup.button.callback(buttonByLang('en', 'language.english'), 'lang_en')]
        ])
    });
}

function isFinishText(text) {
    return msgs.SUPPORTED_LANGS.some((lang) => text === buttonByLang(lang, 'common.finish'));
}

function registerLocalizedHears(path, handler) {
    for (const lang of msgs.SUPPORTED_LANGS) {
        bot.hears(getPath(msgs.LANGUAGES[lang], `buttons.${path}`), handler);
    }
}

async function showContent(ctx, contentKey, titleKey) {
    if (!(await ensureStudentAccess(ctx))) return;

    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    const data = contentStore[contentKey];

    if (!data) {
        await ctx.reply(textByLang(lang, 'text.noContent'));
        return;
    }

    await ctx.reply(textByLang(lang, titleKey), { parse_mode: 'HTML' });
    try {
        await bot.telegram.copyMessage(ctx.chat.id, data.chatId, data.messageId);
    } catch {
        await ctx.reply(textByLang(lang, 'text.noContent'));
    }
}

async function showAdminPanel(ctx) {
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);

    try {
        const students = await getStudentsForModeration();
        if (!students.length) {
            await ctx.reply(textByLang(lang, 'text.noStudentsForModeration'));
            return;
        }

        const buttons = students.map((u) => [Markup.button.callback(u.first_name || u.user_id, `manage_${u.user_id}`)]);
        await ctx.reply(textByLang(lang, 'text.adminSelectUser'), {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons)
        });
    } catch {
        await ctx.reply(textByLang(lang, 'text.usersReadError'));
    }
}

function moderationInlineKeyboard(lang, targetId) {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback(buttonByLang(lang, 'moderation.mute'), `mute_${targetId}`),
            Markup.button.callback(buttonByLang(lang, 'moderation.ban'), `ban_${targetId}`)
        ],
        [
            Markup.button.callback(buttonByLang(lang, 'moderation.unmute'), `unmute_${targetId}`),
            Markup.button.callback(buttonByLang(lang, 'moderation.unban'), `unban_${targetId}`)
        ],
        [Markup.button.callback(buttonByLang(lang, 'moderation.deleteLast'), `delmsg_${targetId}`)],
        [Markup.button.callback(buttonByLang(lang, 'moderation.kick'), `kick_${targetId}`)],
        [Markup.button.callback(buttonByLang(lang, 'moderation.back'), 'back_to_admin')]
    ]);
}

bot.start(async (ctx) => {
    if (ctx.chat?.type !== 'private') return;

    await upsertUserRecord(ctx.from.id, {
        first_name: ctx.from.first_name,
        username: ctx.from.username || '',
        language: getDefaultLangFromTelegram(ctx.from.language_code)
    });

    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);

    if (!dbReady && !isTeacher(ctx)) {
        await ctx.reply(textByLang(lang, 'text.dbUnavailable'));
    }

    if (!isTeacher(ctx)) {
        const allowed = await ensureStudentAccess(ctx);
        if (!allowed) return;

        if (!(await isRegistered(ctx.from.id))) {
            userStates.set(toId(ctx.from.id), { step: STATES.REGISTER_NAME });
            await ctx.reply(textByLang(lang, 'text.askName'), Markup.removeKeyboard());
            return;
        }
    }

    await sendMainMenu(ctx);
});

bot.command('lang', sendLanguageSelector);

bot.on('contact', async (ctx) => {
    if (ctx.chat?.type !== 'private') return;
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    const state = userStates.get(toId(ctx.from.id));
    const registered = await isRegistered(ctx.from.id);

    if (toId(ctx.message.contact.user_id) !== toId(ctx.from.id)) {
        await ctx.reply(textByLang(lang, 'text.notYourContact'));
        return;
    }

    if (!registered && state?.step !== STATES.REGISTER_PHONE) {
        userStates.set(toId(ctx.from.id), { step: STATES.REGISTER_NAME });
        await ctx.reply(textByLang(lang, 'text.askName'), Markup.removeKeyboard());
        return;
    }

    try {
        const studentName = (state?.name || ctx.from.first_name || '').trim() || ctx.from.first_name || 'Student';
        await upsertUserRecord(ctx.from.id, {
            phone: ctx.message.contact.phone_number,
            first_name: studentName,
            username: ctx.from.username || '',
            language: lang
        });

        await sendStudentCardToTopic(ctx.from, studentName, ctx.message.contact.phone_number, ctx.from.username || '');
        userStates.delete(toId(ctx.from.id));
        await ctx.reply(textByLang(lang, 'text.registrationSuccess'), buildMenu(lang, ctx));
        await ctx.reply(textByLang(lang, 'text.registrationTopicCardSent'));
    } catch {
        await ctx.reply(textByLang(lang, 'text.registrationError'));
    }
});

registerLocalizedHears('student.homework', (ctx) => showContent(ctx, CONTENT_KEYS.homework, 'text.homeworkTitle'));
registerLocalizedHears('student.vocabulary', (ctx) => showContent(ctx, CONTENT_KEYS.vocabulary, 'text.vocabularyTitle'));
registerLocalizedHears('student.materials', (ctx) => showContent(ctx, CONTENT_KEYS.materials, 'text.materialsTitle'));

registerLocalizedHears('student.help', async (ctx) => {
    if (!(await ensureStudentAccess(ctx))) return;
    const studentLang = await getUserLang(ctx.from.id, ctx.from.language_code);

    try {
        const user = await getUserRecord(ctx.from.id);
        const topicId = await ensureStudentTopic(ctx.from, user?.first_name || ctx.from.first_name);
        dialogs.set(toId(ctx.from.id), { threadId: topicId });

        await ctx.reply(
            textByLang(studentLang, 'text.helpCreated'),
            Markup.keyboard([[buttonByLang(studentLang, 'common.finish')]]).resize()
        );
    } catch {
        await ctx.reply(textByLang(studentLang, 'text.helpTopicFail'));
    }
});

registerLocalizedHears('student.feedback', async (ctx) => {
    if (!(await ensureStudentAccess(ctx))) return;
    userStates.set(toId(ctx.from.id), { step: STATES.FEEDBACK });
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    await ctx.reply(textByLang(lang, 'text.feedbackPrompt'));
});

registerLocalizedHears('teacher.setHomework', async (ctx) => {
    if (!isTeacher(ctx)) return;
    userStates.set(toId(ctx.from.id), { step: STATES.SET_HOMEWORK });
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    await ctx.reply(textByLang(lang, 'text.setHomeworkPrompt'));
});

registerLocalizedHears('teacher.setVocabulary', async (ctx) => {
    if (!isTeacher(ctx)) return;
    userStates.set(toId(ctx.from.id), { step: STATES.SET_VOCABULARY });
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    await ctx.reply(textByLang(lang, 'text.setVocabularyPrompt'));
});

registerLocalizedHears('teacher.setMaterials', async (ctx) => {
    if (!isTeacher(ctx)) return;
    userStates.set(toId(ctx.from.id), { step: STATES.SET_MATERIALS });
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    await ctx.reply(textByLang(lang, 'text.setMaterialsPrompt'));
});

registerLocalizedHears('teacher.sendNews', async (ctx) => {
    if (!isTeacher(ctx)) return;
    userStates.set(toId(ctx.from.id), { step: STATES.NEWS });
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    await ctx.reply(textByLang(lang, 'text.sendNewsPrompt'));
});

registerLocalizedHears('owner.broadcastAll', async (ctx) => {
    if (!isOwner(ctx)) return;
    userStates.set(toId(ctx.from.id), { step: STATES.BROADCAST });
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    await ctx.reply(textByLang(lang, 'text.broadcastPrompt'));
});

registerLocalizedHears('owner.phones', async (ctx) => {
    if (!isTeacher(ctx)) return;
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);

    try {
        const students = await getStudents();
        if (!students.length) {
            await ctx.reply(textByLang(lang, 'text.phonesEmpty'));
            return;
        }

        const body = students
            .map((u, i) => `${i + 1}. ${esc(u.first_name || 'Student')} ${u.username ? `(@${esc(u.username)})` : ''} - <code>${esc(u.phone)}</code>`)
            .join('\n');

        await ctx.reply(`${textByLang(lang, 'text.phonesTitle')}\n\n${body}`, { parse_mode: 'HTML' });
    } catch {
        await ctx.reply(textByLang(lang, 'text.phonesReadError'));
    }
});

registerLocalizedHears('owner.adminPanel', async (ctx) => {
    if (!isTeacher(ctx)) return;
    await showAdminPanel(ctx);
});

registerLocalizedHears('owner.stats', async (ctx) => {
    if (!isTeacher(ctx)) return;
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    const students = await getStudents();
    await ctx.reply(
        lang === 'ru'
            ? `Учеников в базе: <b>${students.length}</b>`
            : `Students in database: <b>${students.length}</b>`,
        { parse_mode: 'HTML' }
    );
});

registerLocalizedHears('common.changeLanguage', sendLanguageSelector);

bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery?.data || '';
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);

    if (data === 'lang_ru' || data === 'lang_en') {
        const selected = data.replace('lang_', '');
        await setUserLang(ctx.from.id, selected, {
            first_name: ctx.from.first_name,
            username: ctx.from.username || ''
        });

        const msg = selected === 'ru' ? textByLang('ru', 'text.languageChanged') : textByLang('en', 'text.languageChanged');
        await ctx.answerCbQuery(msg);

        try {
            await ctx.editMessageText(msg);
        } catch {
            await ctx.reply(msg);
        }

        await sendMainMenu(ctx);
        return;
    }

    if (data.startsWith('manage_')) {
        if (!isTeacher(ctx)) {
            await ctx.answerCbQuery(textByLang(lang, 'text.noRights'));
            return;
        }

        const targetId = data.split('_')[1];
        const students = await getStudentsForModeration();
        const target = students.find((u) => toId(u.user_id) === toId(targetId));
        const name = esc(target?.first_name || 'Student');

        await ctx.editMessageText(textByLang(lang, 'text.adminUserActions', { name }), {
            parse_mode: 'HTML',
            ...moderationInlineKeyboard(lang, targetId)
        });
        return;
    }

    if (data === 'back_to_admin') {
        if (!isTeacher(ctx)) {
            await ctx.answerCbQuery(textByLang(lang, 'text.noRights'));
            return;
        }

        const students = await getStudentsForModeration();
        const buttons = students.map((u) => [Markup.button.callback(u.first_name || u.user_id, `manage_${u.user_id}`)]);
        await ctx.editMessageText(textByLang(lang, 'text.adminSelectUser'), {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons)
        });
        return;
    }

    const [action, target] = data.split('_');
    if (!['mute', 'unmute', 'ban', 'unban', 'kick', 'delmsg'].includes(action)) return;

    if (!isTeacher(ctx)) {
        await ctx.answerCbQuery(textByLang(lang, 'text.noRights'));
        return;
    }

    try {
        if (action === 'mute') {
            await ctx.telegram.restrictChatMember(CHAT_IDS.group, target, {
                permissions: { can_send_messages: false }
            });
        }

        if (action === 'unmute') {
            await ctx.telegram.restrictChatMember(CHAT_IDS.group, target, {
                permissions: {
                    can_send_messages: true,
                    can_send_audios: true,
                    can_send_documents: true,
                    can_send_photos: true,
                    can_send_videos: true,
                    can_send_video_notes: true,
                    can_send_voice_notes: true,
                    can_send_polls: true,
                    can_send_other_messages: true,
                    can_add_web_page_previews: true,
                    can_change_info: false,
                    can_invite_users: false,
                    can_pin_messages: false,
                    can_manage_topics: false
                }
            });
        }

        if (action === 'ban') {
            await ctx.telegram.banChatMember(CHAT_IDS.group, target);
        }

        if (action === 'unban') {
            await ctx.telegram.unbanChatMember(CHAT_IDS.group, target, { only_if_banned: true });
        }

        if (action === 'kick') {
            await ctx.telegram.banChatMember(CHAT_IDS.group, target);
            await ctx.telegram.unbanChatMember(CHAT_IDS.group, target);
        }

        if (action === 'delmsg') {
            const lastId = lastGroupMessages.get(toId(target));
            if (lastId) await ctx.telegram.deleteMessage(CHAT_IDS.group, lastId);
        }

        await ctx.answerCbQuery(textByLang(lang, 'text.actionDone'));
    } catch (e) {
        await ctx.answerCbQuery(textByLang(lang, 'text.actionError', { error: e.message }), { show_alert: true });
    }
});

bot.on('message', async (ctx) => {
    const fromId = toId(ctx.from?.id);
    const chatId = toId(ctx.chat?.id);

    await upsertUserRecord(fromId, {
        first_name: ctx.from?.first_name || '',
        username: ctx.from?.username || '',
        language: getDefaultLangFromTelegram(ctx.from?.language_code)
    });

    if (chatId === CHAT_IDS.group) {
        lastGroupMessages.set(fromId, ctx.message.message_id);
        return;
    }

    if (chatId === CHAT_IDS.teacherChat) {
        if (!isTeacher(ctx)) return;

        const threadId = ctx.message.message_thread_id;
        if (!threadId) return;

        const studentId = await getStudentByTopic(threadId);
        if (!studentId) return;

        if (ctx.message.text && isFinishText(ctx.message.text)) {
            dialogs.delete(studentId);
            const teacherLang = await getUserLang(ctx.from.id, ctx.from.language_code);
            await bot.telegram.sendMessage(studentId, textByLang(teacherLang, 'text.dialogClosed'));
            return;
        }

        try {
            await bot.telegram.copyMessage(studentId, CHAT_IDS.teacherChat, ctx.message.message_id);
        } catch {
            // ignore delivery errors
        }
        return;
    }

    if (ctx.message.contact) return;

    const state = userStates.get(fromId);
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);

    if (state?.step === STATES.REGISTER_NAME && ctx.chat.type === 'private' && !isTeacher(ctx)) {
        const studentName = String(ctx.message.text || '').trim();
        if (studentName.length < 2) {
            await ctx.reply(textByLang(lang, 'text.askNameInvalid'));
            return;
        }

        userStates.set(fromId, { step: STATES.REGISTER_PHONE, name: studentName });
        await ctx.reply(
            textByLang(lang, 'text.askContact'),
            Markup.keyboard([[Markup.button.contactRequest(textByLang(lang, 'text.registrationButton'))]]).resize()
        );
        return;
    }

    if (state?.step === STATES.REGISTER_PHONE && ctx.chat.type === 'private' && !isTeacher(ctx)) {
        await ctx.reply(
            textByLang(lang, 'text.askContact'),
            Markup.keyboard([[Markup.button.contactRequest(textByLang(lang, 'text.registrationButton'))]]).resize()
        );
        return;
    }

    if (dialogs.has(fromId) && ctx.chat.type === 'private' && !isTeacher(ctx)) {
        const dialog = dialogs.get(fromId);
        const studentLang = await getUserLang(ctx.from.id, ctx.from.language_code);

        if (ctx.message.text && isFinishText(ctx.message.text)) {
            dialogs.delete(fromId);
            await bot.telegram.sendMessage(
                CHAT_IDS.teacherChat,
                textByLang(studentLang, 'text.dialogClosed'),
                { message_thread_id: dialog.threadId }
            );
            await ctx.reply(textByLang(studentLang, 'text.dialogClosed'), buildMenu(studentLang, ctx));
            return;
        }

        try {
            await bot.telegram.copyMessage(CHAT_IDS.teacherChat, ctx.chat.id, ctx.message.message_id, {
                message_thread_id: dialog.threadId
            });
            await ctx.reply(textByLang(studentLang, 'text.studentMessageSent'));
        } catch {
            await ctx.reply(textByLang(studentLang, 'text.helpTopicFail'));
        }
        return;
    }

    if (!state) return;

    if (state.step === STATES.SET_HOMEWORK) {
        contentStore[CONTENT_KEYS.homework] = { chatId: ctx.chat.id, messageId: ctx.message.message_id };
        userStates.delete(fromId);
        await ctx.reply(textByLang(lang, 'text.contentUpdatedHomework'), buildMenu(lang, ctx));
        return;
    }

    if (state.step === STATES.SET_VOCABULARY) {
        contentStore[CONTENT_KEYS.vocabulary] = { chatId: ctx.chat.id, messageId: ctx.message.message_id };
        userStates.delete(fromId);
        await ctx.reply(textByLang(lang, 'text.contentUpdatedVocabulary'), buildMenu(lang, ctx));
        return;
    }

    if (state.step === STATES.SET_MATERIALS) {
        contentStore[CONTENT_KEYS.materials] = { chatId: ctx.chat.id, messageId: ctx.message.message_id };
        userStates.delete(fromId);
        await ctx.reply(textByLang(lang, 'text.contentUpdatedMaterials'), buildMenu(lang, ctx));
        return;
    }

    if (state.step === STATES.NEWS) {
        await bot.telegram.copyMessage(CHAT_IDS.group, ctx.chat.id, ctx.message.message_id);
        userStates.delete(fromId);
        await ctx.reply(textByLang(lang, 'text.sentToGroup'), buildMenu(lang, ctx));
        return;
    }

    if (state.step === STATES.FEEDBACK) {
        await bot.telegram.sendMessage(
            ROLE_IDS.owner,
            textByLang(lang, 'text.ownerFeedbackHeader', {
                name: esc(ctx.from.first_name || 'Student'),
                id: fromId
            }),
            { parse_mode: 'HTML' }
        );

        await bot.telegram.copyMessage(ROLE_IDS.owner, ctx.chat.id, ctx.message.message_id);
        userStates.delete(fromId);
        await ctx.reply(textByLang(lang, 'text.feedbackSent'), buildMenu(lang, ctx));
        return;
    }

    if (state.step === STATES.BROADCAST) {
        const students = await getStudentsForModeration();
        for (const student of students) {
            try {
                await bot.telegram.copyMessage(student.user_id, ctx.chat.id, ctx.message.message_id);
            } catch {
                // ignore blocked users
            }
        }

        userStates.delete(fromId);
        await ctx.reply(textByLang(lang, 'text.broadcastDone'), buildMenu(lang, ctx));
    }
});

bot.launch().then(() => {
    console.log('BOT STARTED');
});

initDB();
