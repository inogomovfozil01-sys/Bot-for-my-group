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
    FEEDBACK: 'FEEDBACK',
    RESULTS_TEACHER_MENU: 'RESULTS_TEACHER_MENU',
    RESULTS_STUDENT_MENU: 'RESULTS_STUDENT_MENU',
    RESULT_CREATE_NAME: 'RESULT_CREATE_NAME',
    RESULT_CREATE_GRAMMAR: 'RESULT_CREATE_GRAMMAR',
    RESULT_CREATE_WORDLIST: 'RESULT_CREATE_WORDLIST',
    RESULT_CREATE_CONFIRM: 'RESULT_CREATE_CONFIRM'
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
const resultStore = new Map();

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

function uiText(lang, key) {
    const dict = {
        ru: {
            helpStudent: [
                '<b>Справка ученика</b>',
                '/menu - открыть главное меню',
                '/cancel - отменить текущий шаг',
                '/lang - выбрать язык',
                '',
                'Разделы:',
                `- ${buttonByLang('ru', 'student.homework')}`,
                `- ${buttonByLang('ru', 'student.vocabulary')}`,
                `- ${buttonByLang('ru', 'student.materials')}`,
                `- ${buttonByLang('ru', 'student.results')}`,
                `- ${buttonByLang('ru', 'student.help')}`,
                `- ${buttonByLang('ru', 'student.feedback')}`
            ].join('\n'),
            helpTeacher: [
                '<b>Справка преподавателя</b>',
                '/menu - открыть главное меню',
                '/cancel - отменить текущий шаг',
                '',
                'Разделы:',
                `- ${buttonByLang('ru', 'teacher.setHomework')}`,
                `- ${buttonByLang('ru', 'teacher.setVocabulary')}`,
                `- ${buttonByLang('ru', 'teacher.setMaterials')}`,
                `- ${buttonByLang('ru', 'teacher.resultsPanel')}`,
                `- ${buttonByLang('ru', 'teacher.sendNews')}`,
                `- ${buttonByLang('ru', 'owner.adminPanel')}`
            ].join('\n'),
            helpOwner: [
                '<b>Справка владельца</b>',
                '/menu - открыть главное меню',
                '/cancel - отменить текущий шаг',
                '/dbstatus - статус базы данных',
                '/sync_topics - синхронизация тем учеников',
                '',
                'Разделы:',
                `- ${buttonByLang('ru', 'owner.broadcastAll')}`,
                `- ${buttonByLang('ru', 'owner.adminPanel')}`,
                `- ${buttonByLang('ru', 'owner.phones')}`,
                `- ${buttonByLang('ru', 'owner.stats')}`
            ].join('\n'),
            cancelDone: 'Текущее действие отменено.',
            noActiveAction: 'Активных действий нет.',
            sendToGroupFailed: 'Не удалось отправить сообщение в группу. Повторите попытку.',
            feedbackFailed: 'Не удалось отправить сообщение директору. Повторите попытку.',
            unexpectedError: 'Произошла ошибка. Повторите попытку.',
            broadcastReport: 'Рассылка завершена.\n\nУспешно: <b>{sent}</b>\nОшибки: <b>{failed}</b>'
        },
        en: {
            helpStudent: [
                '<b>Student Help</b>',
                '/menu - open main menu',
                '/cancel - cancel current step',
                '/lang - choose language',
                '',
                'Sections:',
                `- ${buttonByLang('en', 'student.homework')}`,
                `- ${buttonByLang('en', 'student.vocabulary')}`,
                `- ${buttonByLang('en', 'student.materials')}`,
                `- ${buttonByLang('en', 'student.results')}`,
                `- ${buttonByLang('en', 'student.help')}`,
                `- ${buttonByLang('en', 'student.feedback')}`
            ].join('\n'),
            helpTeacher: [
                '<b>Teacher Help</b>',
                '/menu - open main menu',
                '/cancel - cancel current step',
                '',
                'Sections:',
                `- ${buttonByLang('en', 'teacher.setHomework')}`,
                `- ${buttonByLang('en', 'teacher.setVocabulary')}`,
                `- ${buttonByLang('en', 'teacher.setMaterials')}`,
                `- ${buttonByLang('en', 'teacher.resultsPanel')}`,
                `- ${buttonByLang('en', 'teacher.sendNews')}`,
                `- ${buttonByLang('en', 'owner.adminPanel')}`
            ].join('\n'),
            helpOwner: [
                '<b>Owner Help</b>',
                '/menu - open main menu',
                '/cancel - cancel current step',
                '/dbstatus - database status',
                '/sync_topics - sync student topics',
                '',
                'Sections:',
                `- ${buttonByLang('en', 'owner.broadcastAll')}`,
                `- ${buttonByLang('en', 'owner.adminPanel')}`,
                `- ${buttonByLang('en', 'owner.phones')}`,
                `- ${buttonByLang('en', 'owner.stats')}`
            ].join('\n'),
            cancelDone: 'Current action canceled.',
            noActiveAction: 'No active actions.',
            sendToGroupFailed: 'Failed to send to group. Please retry.',
            feedbackFailed: 'Failed to send feedback to director. Please retry.',
            unexpectedError: 'Unexpected error. Please try again.',
            broadcastReport: 'Broadcast completed.\n\nDelivered: <b>{sent}</b>\nFailed: <b>{failed}</b>'
        }
    };

    const normalized = normalizeLang(lang);
    return dict[normalized]?.[key] || dict.ru[key] || '';
}

function normalizePercent(value) {
    const num = Number(String(value || '').trim().replace(',', '.'));
    if (!Number.isFinite(num) || num < 0 || num > 100) return null;
    return Math.round(num * 100) / 100;
}

function normalizeResultKey(name) {
    return String(name || '').trim().toLowerCase();
}

function getSortedResults() {
    return Array.from(resultStore.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

function formatResultMessage(lang, result) {
    return [
        textByLang(lang, 'text.resultViewTitle', { name: esc(result.name) }),
        textByLang(lang, 'text.resultViewGrammar', { grammar: esc(result.grammar_percent) }),
        textByLang(lang, 'text.resultViewWordList', { wordlist: esc(result.wordlist_percent) })
    ].join('\n');
}

async function setUserState(userId, state = null) {
    const id = toId(userId);

    if (!state) {
        userStates.delete(id);
        if (!dbReady) return;
        try {
            await pool.query('DELETE FROM user_states WHERE user_id = $1', [id]);
        } catch (e) {
            console.error('DB delete user state error:', e.message);
        }
        return;
    }

    userStates.set(id, state);
    if (!dbReady) return;

    try {
        await pool.query(
            `INSERT INTO user_states (user_id, step, state_data)
             VALUES ($1, $2, $3::jsonb)
             ON CONFLICT (user_id)
             DO UPDATE SET
                step = EXCLUDED.step,
                state_data = EXCLUDED.state_data,
                updated_at = CURRENT_TIMESTAMP`,
            [id, state.step || null, JSON.stringify(state)]
        );
    } catch (e) {
        console.error('DB upsert user state error:', e.message);
    }
}

async function getUserState(userId) {
    const id = toId(userId);
    if (userStates.has(id)) return userStates.get(id);
    if (!dbReady) return null;

    try {
        const res = await pool.query('SELECT step, state_data FROM user_states WHERE user_id = $1', [id]);
        if (res.rowCount === 0) return null;

        const row = res.rows[0];
        const state = row.state_data && typeof row.state_data === 'object'
            ? row.state_data
            : (row.step ? { step: row.step } : null);

        if (state) userStates.set(id, state);
        return state;
    } catch (e) {
        console.error('DB read user state error:', e.message);
        return null;
    }
}

async function upsertResult(result) {
    const key = normalizeResultKey(result.name);
    const row = {
        key,
        name: String(result.name).trim(),
        grammar_percent: result.grammar_percent,
        wordlist_percent: result.wordlist_percent,
        updated_by: toId(result.updated_by)
    };

    resultStore.set(key, row);
    if (!dbReady) return row;

    try {
        await pool.query(
            `INSERT INTO student_results (result_key, student_name, grammar_percent, wordlist_percent, updated_by)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (result_key)
             DO UPDATE SET
                student_name = EXCLUDED.student_name,
                grammar_percent = EXCLUDED.grammar_percent,
                wordlist_percent = EXCLUDED.wordlist_percent,
                updated_by = EXCLUDED.updated_by,
                updated_at = CURRENT_TIMESTAMP`,
            [row.key, row.name, row.grammar_percent, row.wordlist_percent, row.updated_by]
        );
    } catch (e) {
        console.error('DB upsert result error:', e.message);
    }

    return row;
}

function getDbConnectionMeta() {
    if (!config.DATABASE_URL) {
        return { configured: false, host: '-', database: '-' };
    }

    try {
        const parsed = new URL(config.DATABASE_URL);
        return {
            configured: true,
            host: parsed.hostname || '-',
            database: (parsed.pathname || '').replace(/^\//, '') || '-'
        };
    } catch {
        return { configured: true, host: 'invalid_url', database: '-' };
    }
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
                language_selected BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Backward-compatible schema migration for existing deployments.
        await pool.query(`
            ALTER TABLE users
                ADD COLUMN IF NOT EXISTS phone TEXT,
                ADD COLUMN IF NOT EXISTS username TEXT,
                ADD COLUMN IF NOT EXISTS first_name TEXT,
                ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'ru',
                ADD COLUMN IF NOT EXISTS language_selected BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);

        await pool.query(`
            ALTER TABLE users
            ALTER COLUMN user_id TYPE TEXT USING user_id::text;
        `);

        // If old schema had phone_number instead of phone, copy values once.
        await pool.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'users' AND column_name = 'phone_number'
                ) THEN
                    UPDATE users
                    SET phone = COALESCE(phone, phone_number::text)
                    WHERE phone IS NULL;
                END IF;
            END $$;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS students_topic (
                user_id TEXT PRIMARY KEY,
                topic_id BIGINT NOT NULL,
                topic_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            ALTER TABLE students_topic
            ALTER COLUMN user_id TYPE TEXT USING user_id::text;
        `);

        // Migrate old table name if it exists.
        await pool.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_name = 'student_topics'
                ) THEN
                    INSERT INTO students_topic (user_id, topic_id, topic_name, created_at)
                    SELECT user_id::text, topic_id, topic_name, created_at
                    FROM student_topics
                    ON CONFLICT (user_id)
                    DO UPDATE SET
                        topic_id = EXCLUDED.topic_id,
                        topic_name = EXCLUDED.topic_name;
                END IF;
            END $$;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_states (
                user_id TEXT PRIMARY KEY,
                step TEXT,
                state_data JSONB,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS bot_content (
                content_key TEXT PRIMARY KEY,
                source_chat_id TEXT NOT NULL,
                source_message_id BIGINT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS student_results (
                result_key TEXT PRIMARY KEY,
                student_name TEXT NOT NULL,
                grammar_percent NUMERIC(5,2) NOT NULL,
                wordlist_percent NUMERIC(5,2) NOT NULL,
                updated_by TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const contentRes = await pool.query(`
            SELECT content_key, source_chat_id, source_message_id
            FROM bot_content
        `);
        for (const row of contentRes.rows) {
            if (!Object.prototype.hasOwnProperty.call(contentStore, row.content_key)) continue;
            contentStore[row.content_key] = {
                chatId: row.source_chat_id,
                messageId: Number(row.source_message_id)
            };
        }

        const resultRes = await pool.query(`
            SELECT result_key, student_name, grammar_percent, wordlist_percent, updated_by
            FROM student_results
        `);
        for (const row of resultRes.rows) {
            resultStore.set(row.result_key, {
                key: row.result_key,
                name: row.student_name,
                grammar_percent: Number(row.grammar_percent),
                wordlist_percent: Number(row.wordlist_percent),
                updated_by: row.updated_by
            });
        }

        dbReady = true;
        const meta = getDbConnectionMeta();
        console.log(`Database synchronized (host=${meta.host}, db=${meta.database})`);
    } catch (e) {
        dbReady = false;
        console.error('DB Init Error:', e.message);
    }
}

async function getUserRecord(userId) {
    const id = toId(userId);
    if (dbReady) {
        try {
            const res = await pool.query('SELECT user_id, phone, username, first_name, language, language_selected FROM users WHERE user_id = $1', [id]);
            if (res.rowCount > 0) return res.rows[0];
        } catch (e) {
            console.error('DB read user error:', e.message);
        }
    }
    return memoryUsers.get(id) || null;
}

async function upsertUserRecord(userId, payload = {}) {
    const id = toId(userId);
    let prev = memoryUsers.get(id) || {};

    // Preserve persisted values when memory cache is cold after restart.
    if (!memoryUsers.has(id) && dbReady) {
        const dbUser = await getUserRecord(id);
        if (dbUser) prev = dbUser;
    }

    const next = {
        user_id: id,
        phone: payload.phone ?? prev.phone ?? null,
        username: payload.username ?? prev.username ?? '',
        first_name: payload.first_name ?? prev.first_name ?? '',
        language: normalizeLang(payload.language ?? prev.language ?? msgs.DEFAULT_LANG),
        language_selected: payload.language_selected ?? prev.language_selected ?? false
    };

    memoryUsers.set(id, next);

    if (!dbReady) return;

    try {
        await pool.query(
            `INSERT INTO users (user_id, phone, username, first_name, language, language_selected)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (user_id)
             DO UPDATE SET
                phone = COALESCE(EXCLUDED.phone, users.phone),
                username = EXCLUDED.username,
                first_name = EXCLUDED.first_name,
                language = EXCLUDED.language,
                language_selected = EXCLUDED.language_selected`,
            [next.user_id, next.phone, next.username, next.first_name, next.language, next.language_selected]
        );
    } catch (e) {
        console.error('DB upsert user error:', e.message);
    }
}

async function getUserLang(userId, telegramLangCode) {
    const id = toId(userId);
    if ([ROLE_IDS.owner, ROLE_IDS.teacher].includes(id)) return 'ru';

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
        language: lang,
        language_selected: true
    });
}

async function hasSelectedLanguage(userId) {
    const user = await getUserRecord(userId);
    return Boolean(user?.language_selected);
}

async function runStudentOnboarding(ctx) {
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    const allowed = await ensureStudentAccess(ctx);
    if (!allowed) return;

    if (!(await isRegistered(ctx.from.id))) {
        await setUserState(ctx.from.id, { step: STATES.REGISTER_NAME });
        await ctx.reply(textByLang(lang, 'text.askName'), Markup.removeKeyboard());
        return;
    }

    await sendMainMenu(ctx);
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
            `INSERT INTO students_topic (user_id, topic_id, topic_name)
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
            const res = await pool.query('SELECT topic_id FROM students_topic WHERE user_id = $1', [id]);
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
            const res = await pool.query('SELECT user_id FROM students_topic WHERE topic_id = $1', [thread]);
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
    const baseName = preferredName || from.first_name || 'Student';
    const safeName = String(baseName).slice(0, 120);

    if (existing) {
        try {
            await bot.telegram.editForumTopic(CHAT_IDS.teacherChat, existing, { name: safeName });
        } catch (e) {
            console.error('Forum topic rename error:', e.message);
        }
        await saveStudentTopic(userId, existing, safeName);
        return existing;
    }

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

    try {
        await bot.telegram.sendMessage(CHAT_IDS.teacherChat, card, {
            parse_mode: 'HTML',
            message_thread_id: topicId
        });
    } catch (e) {
        console.error('Student card send error:', e.message);
        throw e;
    }
}

async function syncStudentTopics() {
    const students = await getStudentsForModeration();
    let created = 0;
    let updated = 0;

    for (const student of students) {
        const userId = toId(student.user_id);
        const hadTopic = await getTopicByStudent(userId);

        await ensureStudentTopic(
            { id: userId, first_name: student.first_name || 'Student' },
            student.first_name || 'Student'
        );

        if (hadTopic) updated += 1;
        else created += 1;
    }

    return { total: students.length, created, updated };
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
            [buttonByLang(lang, 'student.homework'), buttonByLang(lang, 'student.vocabulary')],
            [buttonByLang(lang, 'student.materials'), buttonByLang(lang, 'student.results')],
            [buttonByLang(lang, 'student.help'), buttonByLang(lang, 'student.feedback')],
            [buttonByLang(lang, 'teacher.setHomework'), buttonByLang(lang, 'teacher.setVocabulary')],
            [buttonByLang(lang, 'teacher.setMaterials'), buttonByLang(lang, 'teacher.resultsPanel')],
            [buttonByLang(lang, 'teacher.sendNews'), buttonByLang(lang, 'owner.broadcastAll')],
            [buttonByLang(lang, 'owner.adminPanel'), buttonByLang(lang, 'owner.phones')],
            [buttonByLang(lang, 'owner.stats'), buttonByLang(lang, 'student.gift')]
        ]).resize();
    }

    if (isTeacher(ctx)) {
        return Markup.keyboard([
            [buttonByLang(lang, 'teacher.setHomework'), buttonByLang(lang, 'teacher.setVocabulary')],
            [buttonByLang(lang, 'teacher.setMaterials'), buttonByLang(lang, 'teacher.resultsPanel')],
            [buttonByLang(lang, 'teacher.sendNews'), buttonByLang(lang, 'owner.adminPanel')],
            [buttonByLang(lang, 'owner.phones'), buttonByLang(lang, 'owner.stats')]
        ]).resize();
    }

    return Markup.keyboard([
        [buttonByLang(lang, 'student.homework'), buttonByLang(lang, 'student.vocabulary')],
        [buttonByLang(lang, 'student.materials'), buttonByLang(lang, 'student.results')],
        [buttonByLang(lang, 'student.help'), buttonByLang(lang, 'student.feedback')],
        [buttonByLang(lang, 'student.gift')],
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

async function showDefaultPrivateScreen(ctx) {
    if (ctx.chat?.type !== 'private') return;

    if (!isTeacher(ctx)) {
        if (!(await hasSelectedLanguage(ctx.from.id))) {
            await sendLanguageSelector(ctx, true);
            return;
        }
        await runStudentOnboarding(ctx);
        return;
    }

    await sendMainMenu(ctx);
}

function helpMessageByRole(lang, ctx) {
    if (isOwner(ctx)) return uiText(lang, 'helpOwner');
    if (isTeacher(ctx)) return uiText(lang, 'helpTeacher');
    return uiText(lang, 'helpStudent');
}

async function sendStartGreeting(ctx) {
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    const key = isOwner(ctx)
        ? 'text.startGreetingOwner'
        : isTeacher(ctx)
            ? 'text.startGreetingTeacher'
            : 'text.startGreetingStudent';

    await ctx.reply(textByLang(lang, key), { parse_mode: 'HTML' });
}

function resultListKeyboard(lang, results, includeCreate = false) {
    const rows = [];
    if (includeCreate) {
        rows.push([buttonByLang(lang, 'teacher.createResult')]);
    }
    for (const item of results) {
        rows.push([item.name]);
    }
    rows.push([buttonByLang(lang, 'common.back')]);
    return Markup.keyboard(rows).resize();
}

async function showTeacherResultsMenu(ctx) {
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    const results = getSortedResults();
    await setUserState(ctx.from.id, { step: STATES.RESULTS_TEACHER_MENU });
    await ctx.reply(textByLang(lang, 'text.resultsMenuTeacher'), {
        parse_mode: 'HTML',
        ...resultListKeyboard(lang, results, true)
    });
}

async function showStudentResultsMenu(ctx) {
    if (!(await ensureStudentAccess(ctx))) return;
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    const results = getSortedResults();
    if (!results.length) {
        await ctx.reply(textByLang(lang, 'text.noResults'));
        return;
    }

    await setUserState(ctx.from.id, { step: STATES.RESULTS_STUDENT_MENU });
    await ctx.reply(textByLang(lang, 'text.resultsMenuStudent'), {
        parse_mode: 'HTML',
        ...resultListKeyboard(lang, results, false)
    });
}

async function persistContent(contentKey, chatId, messageId) {
    contentStore[contentKey] = { chatId, messageId };
    if (!dbReady) return;
    try {
        await pool.query(
            `INSERT INTO bot_content (content_key, source_chat_id, source_message_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (content_key)
             DO UPDATE SET
                source_chat_id = EXCLUDED.source_chat_id,
                source_message_id = EXCLUDED.source_message_id,
                updated_at = CURRENT_TIMESTAMP`,
            [contentKey, String(chatId), Number(messageId)]
        );
    } catch (e) {
        console.error('DB persist content error:', e.message);
    }
}

async function sendLanguageSelector(ctx, forceStartPrompt = false) {
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    const prompt = forceStartPrompt ? textByLang('ru', 'text.languagePromptStart') : textByLang(lang, 'text.languagePrompt');
    await ctx.reply(prompt, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
            [Markup.button.callback(buttonByLang('ru', 'language.russian'), 'lang_ru')],
            [Markup.button.callback(buttonByLang('en', 'language.english'), 'lang_en')]
        ])
    });
}

function isFinishText(text) {
    return msgs.SUPPORTED_LANGS.some((lang) => text === buttonByLang(lang, 'common.finish'));
}

function isBackText(text) {
    return msgs.SUPPORTED_LANGS.some((lang) => text === buttonByLang(lang, 'common.back'));
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
        username: ctx.from.username || ''
    });

    if (!isTeacher(ctx)) {
        if (!(await hasSelectedLanguage(ctx.from.id))) {
            await sendLanguageSelector(ctx, true);
            return;
        }
        await sendStartGreeting(ctx);
        await runStudentOnboarding(ctx);
        return;
    }

    await sendStartGreeting(ctx);
    await sendMainMenu(ctx);
});

bot.command('menu', async (ctx) => {
    await showDefaultPrivateScreen(ctx);
});

bot.command('help', async (ctx) => {
    if (ctx.chat?.type !== 'private') return;

    if (!isTeacher(ctx) && !(await hasSelectedLanguage(ctx.from.id))) {
        await sendLanguageSelector(ctx, true);
        return;
    }

    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    await ctx.reply(helpMessageByRole(lang, ctx), { parse_mode: 'HTML' });
});

bot.command('cancel', async (ctx) => {
    if (ctx.chat?.type !== 'private') return;

    const fromId = toId(ctx.from.id);
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    const state = await getUserState(fromId);
    const hadDialog = dialogs.has(fromId);

    if (!state && !hadDialog) {
        await ctx.reply(uiText(lang, 'noActiveAction'));
        return;
    }

    dialogs.delete(fromId);
    await setUserState(fromId, null);
    await ctx.reply(uiText(lang, 'cancelDone'));
    await showDefaultPrivateScreen(ctx);
});

bot.command('lang', async (ctx) => {
    if (isTeacher(ctx)) {
        await ctx.reply('Для учителя и владельца язык зафиксирован: русский.');
        return;
    }
    await sendLanguageSelector(ctx);
});

bot.command('dbstatus', async (ctx) => {
    if (!isOwner(ctx)) return;

    const meta = getDbConnectionMeta();
    const lines = [
        `<b>DB status</b>`,
        `configured: <code>${meta.configured ? 'yes' : 'no'}</code>`,
        `ready: <code>${dbReady ? 'yes' : 'no'}</code>`,
        `host: <code>${esc(meta.host)}</code>`,
        `database: <code>${esc(meta.database)}</code>`
    ];

    if (dbReady) {
        try {
            const usersCountRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM users');
            const topicsCountRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM students_topic');
            lines.push(`users: <code>${usersCountRes.rows[0].cnt}</code>`);
            lines.push(`students_topic: <code>${topicsCountRes.rows[0].cnt}</code>`);
        } catch (e) {
            lines.push(`count_error: <code>${esc(e.message)}</code>`);
        }
    }

    await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });
});

bot.command('sync_topics', async (ctx) => {
    if (!isOwner(ctx)) return;
    try {
        const result = await syncStudentTopics();
        await ctx.reply(
            `Синхронизация завершена.\nВсего учеников: ${result.total}\nСоздано тем: ${result.created}\nОбновлено тем: ${result.updated}`
        );
    } catch (e) {
        await ctx.reply(`Ошибка синхронизации: ${e.message}`);
    }
});

bot.on('contact', async (ctx) => {
    if (ctx.chat?.type !== 'private') return;
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    const state = await getUserState(ctx.from.id);
    const registered = await isRegistered(ctx.from.id);

    if (toId(ctx.message.contact.user_id) !== toId(ctx.from.id)) {
        await ctx.reply(textByLang(lang, 'text.notYourContact'));
        return;
    }

    if (!registered && state?.step !== STATES.REGISTER_PHONE) {
        await setUserState(ctx.from.id, { step: STATES.REGISTER_NAME });
        await ctx.reply(textByLang(lang, 'text.askName'), Markup.removeKeyboard());
        return;
    }

    try {
        const studentName = String(state?.name || ctx.from.first_name || 'Student').trim();
        await upsertUserRecord(ctx.from.id, {
            phone: ctx.message.contact.phone_number,
            first_name: studentName,
            username: ctx.from.username || '',
            language: lang
        });

        await sendStudentCardToTopic(ctx.from, studentName, ctx.message.contact.phone_number, ctx.from.username || '');
        await setUserState(ctx.from.id, null);
        await ctx.reply(textByLang(lang, 'text.registrationSuccess'), buildMenu(lang, ctx));
        await ctx.reply(textByLang(lang, 'text.registrationTopicCardSent'));
    } catch {
        await ctx.reply(textByLang(lang, 'text.registrationError'));
    }
});

registerLocalizedHears('student.homework', (ctx) => showContent(ctx, CONTENT_KEYS.homework, 'text.homeworkTitle'));
registerLocalizedHears('student.vocabulary', (ctx) => showContent(ctx, CONTENT_KEYS.vocabulary, 'text.vocabularyTitle'));
registerLocalizedHears('student.materials', (ctx) => showContent(ctx, CONTENT_KEYS.materials, 'text.materialsTitle'));
registerLocalizedHears('student.results', (ctx) => showStudentResultsMenu(ctx));

registerLocalizedHears('student.gift', async (ctx) => {
    if (!(await ensureStudentAccess(ctx))) return;
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);

    try {
        await ctx.replyWithInvoice({
            title: textByLang(lang, 'text.giftTitle'),
            description: textByLang(lang, 'text.giftDescription'),
            payload: `gift_30_${Date.now()}`,
            currency: 'XTR',
            prices: [{ label: textByLang(lang, 'text.giftLabel'), amount: 30 }]
        });
        await ctx.reply(textByLang(lang, 'text.giftSent'));
    } catch (e) {
        console.error('Gift invoice error:', e.message);
        await ctx.reply(textByLang(lang, 'text.giftFail'));
    }
});

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
    await setUserState(ctx.from.id, { step: STATES.FEEDBACK });
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    await ctx.reply(textByLang(lang, 'text.feedbackPrompt'));
});

registerLocalizedHears('teacher.setHomework', async (ctx) => {
    if (!isTeacher(ctx)) return;
    await setUserState(ctx.from.id, { step: STATES.SET_HOMEWORK });
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    await ctx.reply(textByLang(lang, 'text.setHomeworkPrompt'));
});

registerLocalizedHears('teacher.setVocabulary', async (ctx) => {
    if (!isTeacher(ctx)) return;
    await setUserState(ctx.from.id, { step: STATES.SET_VOCABULARY });
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    await ctx.reply(textByLang(lang, 'text.setVocabularyPrompt'));
});

registerLocalizedHears('teacher.setMaterials', async (ctx) => {
    if (!isTeacher(ctx)) return;
    await setUserState(ctx.from.id, { step: STATES.SET_MATERIALS });
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    await ctx.reply(textByLang(lang, 'text.setMaterialsPrompt'));
});

registerLocalizedHears('teacher.sendNews', async (ctx) => {
    if (!isTeacher(ctx)) return;
    await setUserState(ctx.from.id, { step: STATES.NEWS });
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    await ctx.reply(textByLang(lang, 'text.sendNewsPrompt'));
});

registerLocalizedHears('teacher.resultsPanel', async (ctx) => {
    if (!isTeacher(ctx)) return;
    await showTeacherResultsMenu(ctx);
});

registerLocalizedHears('owner.broadcastAll', async (ctx) => {
    if (!isOwner(ctx)) return;
    await setUserState(ctx.from.id, { step: STATES.BROADCAST });
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

registerLocalizedHears('common.changeLanguage', async (ctx) => {
    if (isTeacher(ctx)) return;
    await sendLanguageSelector(ctx);
});

bot.on('pre_checkout_query', async (ctx) => {
    try {
        await ctx.answerPreCheckoutQuery(true);
    } catch (e) {
        console.error('Pre-checkout error:', e.message);
    }
});

bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery?.data || '';
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);

    if (data === 'lang_ru' || data === 'lang_en') {
        if (isTeacher(ctx)) {
            await ctx.answerCbQuery('Язык для этой роли фиксирован: русский.');
            return;
        }

        const hadSelectedLanguage = await hasSelectedLanguage(ctx.from.id);
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

        if (isTeacher(ctx)) {
            await sendMainMenu(ctx);
            return;
        }

        if (!hadSelectedLanguage) {
            await sendStartGreeting(ctx);
        }
        await runStudentOnboarding(ctx);
        return;
    }

    if (data === 'result_confirm') {
        if (!isTeacher(ctx)) {
            await ctx.answerCbQuery(textByLang(lang, 'text.noRights'));
            return;
        }

        const state = await getUserState(ctx.from.id);
        if (!state || state.step !== STATES.RESULT_CREATE_CONFIRM) {
            await ctx.answerCbQuery();
            return;
        }

        await upsertResult({
            name: state.name,
            grammar_percent: state.grammar_percent,
            wordlist_percent: state.wordlist_percent,
            updated_by: ctx.from.id
        });

        await setUserState(ctx.from.id, null);
        await ctx.answerCbQuery(textByLang(lang, 'text.resultSaved'));
        await showTeacherResultsMenu(ctx);
        return;
    }

    if (data === 'result_cancel') {
        if (!isTeacher(ctx)) {
            await ctx.answerCbQuery(textByLang(lang, 'text.noRights'));
            return;
        }
        await setUserState(ctx.from.id, null);
        await ctx.answerCbQuery(textByLang(lang, 'text.resultCanceled'));
        await showTeacherResultsMenu(ctx);
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
        username: ctx.from?.username || ''
    });

    if (chatId === CHAT_IDS.group) {
        lastGroupMessages.set(fromId, ctx.message.message_id);
        return;
    }

    if (ctx.chat.type === 'private' && !isTeacher(ctx)) {
        const selectedLanguage = await hasSelectedLanguage(fromId);
        if (!selectedLanguage) {
            await sendLanguageSelector(ctx, true);
            return;
        }

        const registered = await isRegistered(fromId);
        const state = await getUserState(fromId);
        if (!registered && !state && !ctx.message.contact) {
            const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
            await setUserState(fromId, { step: STATES.REGISTER_NAME });
            await ctx.reply(textByLang(lang, 'text.askName'), Markup.removeKeyboard());
            return;
        }
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
            const studentLang = await getUserLang(studentId);
            const prefix = textByLang(studentLang, 'text.teacherMessagePrefix');

            if (ctx.message.text) {
                await bot.telegram.sendMessage(studentId, `${prefix}\n\n${ctx.message.text}`);
            } else if (ctx.message.caption) {
                await bot.telegram.copyMessage(studentId, CHAT_IDS.teacherChat, ctx.message.message_id, {
                    caption: `${prefix}\n\n${ctx.message.caption}`
                });
            } else {
                await bot.telegram.copyMessage(studentId, CHAT_IDS.teacherChat, ctx.message.message_id, {
                    caption: prefix
                });
            }
        } catch {
            // ignore delivery errors
        }
        return;
    }

    if (ctx.message.successful_payment?.currency === 'XTR') {
        const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
        await ctx.reply(textByLang(lang, 'text.giftPaid'));
        return;
    }

    if (ctx.message.contact) return;

    const state = await getUserState(fromId);
    const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
    const text = String(ctx.message.text || '').trim();

    if (state?.step === STATES.REGISTER_NAME && ctx.chat.type === 'private' && !isTeacher(ctx)) {
        const studentName = text;
        if (studentName.length < 2) {
            await ctx.reply(textByLang(lang, 'text.askNameInvalid'));
            return;
        }

        await setUserState(fromId, { step: STATES.REGISTER_PHONE, name: studentName });
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

    if (state?.step === STATES.RESULTS_STUDENT_MENU && ctx.chat.type === 'private' && !isTeacher(ctx)) {
        if (isBackText(text)) {
            await setUserState(fromId, null);
            await sendMainMenu(ctx);
            return;
        }

        const result = getSortedResults().find((item) => item.name === text);
        if (!result) {
            await ctx.reply(textByLang(lang, 'text.noResults'));
            return;
        }

        await ctx.reply(formatResultMessage(lang, result), {
            parse_mode: 'HTML',
            ...Markup.keyboard([[buttonByLang(lang, 'common.back')]]).resize()
        });
        return;
    }

    if (state?.step === STATES.RESULTS_TEACHER_MENU && ctx.chat.type === 'private' && isTeacher(ctx)) {
        if (isBackText(text)) {
            await setUserState(fromId, null);
            await sendMainMenu(ctx);
            return;
        }

        if (text === buttonByLang(lang, 'teacher.createResult')) {
            await setUserState(fromId, { step: STATES.RESULT_CREATE_NAME });
            await ctx.reply(textByLang(lang, 'text.resultAskName'), Markup.removeKeyboard());
            return;
        }

        const result = getSortedResults().find((item) => item.name === text);
        if (result) {
            await ctx.reply(formatResultMessage(lang, result), {
                parse_mode: 'HTML',
                ...Markup.keyboard([[buttonByLang(lang, 'common.back')]]).resize()
            });
            return;
        }

        await showTeacherResultsMenu(ctx);
        return;
    }

    if (state?.step === STATES.RESULT_CREATE_NAME && ctx.chat.type === 'private' && isTeacher(ctx)) {
        if (isBackText(text)) {
            await showTeacherResultsMenu(ctx);
            return;
        }

        if (text.length < 2) {
            await ctx.reply(textByLang(lang, 'text.resultAskName'));
            return;
        }

        await setUserState(fromId, { step: STATES.RESULT_CREATE_GRAMMAR, name: text });
        await ctx.reply(textByLang(lang, 'text.resultAskGrammar'));
        return;
    }

    if (state?.step === STATES.RESULT_CREATE_GRAMMAR && ctx.chat.type === 'private' && isTeacher(ctx)) {
        if (isBackText(text)) {
            await showTeacherResultsMenu(ctx);
            return;
        }

        const grammar = normalizePercent(text);
        if (grammar === null) {
            await ctx.reply(textByLang(lang, 'text.resultInvalidPercent'));
            return;
        }

        await setUserState(fromId, {
            step: STATES.RESULT_CREATE_WORDLIST,
            name: state.name,
            grammar_percent: grammar
        });
        await ctx.reply(textByLang(lang, 'text.resultAskWordList'));
        return;
    }

    if (state?.step === STATES.RESULT_CREATE_WORDLIST && ctx.chat.type === 'private' && isTeacher(ctx)) {
        if (isBackText(text)) {
            await showTeacherResultsMenu(ctx);
            return;
        }

        const wordlist = normalizePercent(text);
        if (wordlist === null) {
            await ctx.reply(textByLang(lang, 'text.resultInvalidPercent'));
            return;
        }

        await setUserState(fromId, {
            step: STATES.RESULT_CREATE_CONFIRM,
            name: state.name,
            grammar_percent: state.grammar_percent,
            wordlist_percent: wordlist
        });

        await ctx.reply(textByLang(lang, 'text.resultConfirmText', {
            name: esc(state.name),
            grammar: esc(state.grammar_percent),
            wordlist: esc(wordlist)
        }), {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback(buttonByLang(lang, 'common.confirm'), 'result_confirm'),
                    Markup.button.callback(buttonByLang(lang, 'common.cancel'), 'result_cancel')
                ]
            ])
        });
        return;
    }

    if (state?.step === STATES.RESULT_CREATE_CONFIRM && ctx.chat.type === 'private' && isTeacher(ctx)) {
        await ctx.reply(textByLang(lang, 'text.resultConfirmText', {
            name: esc(state.name),
            grammar: esc(state.grammar_percent),
            wordlist: esc(state.wordlist_percent)
        }), {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback(buttonByLang(lang, 'common.confirm'), 'result_confirm'),
                    Markup.button.callback(buttonByLang(lang, 'common.cancel'), 'result_cancel')
                ]
            ])
        });
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
        await persistContent(CONTENT_KEYS.homework, ctx.chat.id, ctx.message.message_id);
        await setUserState(fromId, null);
        await ctx.reply(textByLang(lang, 'text.contentUpdatedHomework'), buildMenu(lang, ctx));
        return;
    }

    if (state.step === STATES.SET_VOCABULARY) {
        await persistContent(CONTENT_KEYS.vocabulary, ctx.chat.id, ctx.message.message_id);
        await setUserState(fromId, null);
        await ctx.reply(textByLang(lang, 'text.contentUpdatedVocabulary'), buildMenu(lang, ctx));
        return;
    }

    if (state.step === STATES.SET_MATERIALS) {
        await persistContent(CONTENT_KEYS.materials, ctx.chat.id, ctx.message.message_id);
        await setUserState(fromId, null);
        await ctx.reply(textByLang(lang, 'text.contentUpdatedMaterials'), buildMenu(lang, ctx));
        return;
    }

    if (state.step === STATES.NEWS) {
        try {
            await bot.telegram.copyMessage(CHAT_IDS.group, ctx.chat.id, ctx.message.message_id);
        } catch (e) {
            console.error('Group publish error:', e.message);
            await ctx.reply(uiText(lang, 'sendToGroupFailed'));
            return;
        }

        await setUserState(fromId, null);
        await ctx.reply(textByLang(lang, 'text.sentToGroup'), buildMenu(lang, ctx));
        return;
    }

    if (state.step === STATES.FEEDBACK) {
        try {
            await bot.telegram.sendMessage(
                ROLE_IDS.owner,
                textByLang(lang, 'text.ownerFeedbackHeader', {
                    name: esc(ctx.from.first_name || 'Student'),
                    id: fromId
                }),
                { parse_mode: 'HTML' }
            );

            await bot.telegram.copyMessage(ROLE_IDS.owner, ctx.chat.id, ctx.message.message_id);
        } catch (e) {
            console.error('Feedback forwarding error:', e.message);
            await ctx.reply(uiText(lang, 'feedbackFailed'));
            return;
        }

        await setUserState(fromId, null);
        await ctx.reply(textByLang(lang, 'text.feedbackSent'), buildMenu(lang, ctx));
        return;
    }

    if (state.step === STATES.BROADCAST) {
        const students = await getStudentsForModeration();
        let sent = 0;
        let failed = 0;

        for (const student of students) {
            try {
                await bot.telegram.copyMessage(student.user_id, ctx.chat.id, ctx.message.message_id);
                sent += 1;
            } catch {
                failed += 1;
            }
        }

        await setUserState(fromId, null);
        const report = template(uiText(lang, 'broadcastReport'), { sent, failed });
        await ctx.reply(report, { parse_mode: 'HTML', ...buildMenu(lang, ctx) });
    }
});

bot.catch(async (err, ctx) => {
    console.error('Bot runtime error:', err);

    try {
        if (ctx?.chat?.type === 'private' && ctx?.from?.id) {
            const lang = await getUserLang(ctx.from.id, ctx.from.language_code);
            await ctx.reply(uiText(lang, 'unexpectedError'));
        }
    } catch {
        // ignore fallback errors
    }
});

let shuttingDown = false;

async function gracefulShutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`${signal} received. Shutting down...`);

    try {
        await bot.stop(signal);
    } catch (e) {
        console.error('Bot stop error:', e.message);
    }

    if (pool) {
        try {
            await pool.end();
        } catch (e) {
            console.error('Pool close error:', e.message);
        }
    }

    process.exit(0);
}

process.once('SIGINT', () => {
    void gracefulShutdown('SIGINT');
});

process.once('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
});

bot.launch()
    .then(() => {
        console.log('BOT STARTED');
    })
    .catch((e) => {
        console.error('Bot launch error:', e.message);
        process.exit(1);
    });

initDB();
