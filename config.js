module.exports = {
    TOKEN: process.env.BOT_TOKEN || '8550705709:AAGpKWiMEsterjXk1FBHOUETLfv6-KyQCro',
    OWNER_ID: process.env.OWNER_ID || '6690476979',
    TEACHER_ID: process.env.TEACHER_ID || '5092858512',
    GROUP_ID: process.env.GROUP_ID || '-1002582621647',

    // Chat where teacher support threads are created (forum supergroup recommended)
    TEACHER_CHAT_ID: process.env.TEACHER_CHAT_ID || process.env.GROUP_ID || '-1003546840118',
    // Chat and topic for student feedback addressed to the director.
    DIRECTOR_CHAT_ID: process.env.DIRECTOR_CHAT_ID || process.env.TEACHER_CHAT_ID || process.env.GROUP_ID || '-1003546840118',
    DIRECTOR_FEEDBACK_TOPIC_ID: process.env.DIRECTOR_FEEDBACK_TOPIC_ID || '',
    DIRECTOR_FEEDBACK_TOPIC_TITLE: process.env.DIRECTOR_FEEDBACK_TOPIC_TITLE || 'Director Feedback',

    // Postgres connection string
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:ZrpFafPDeqCYbTujpGjXzacdwENFZtiw@postgres-afeu.railway.internal:5432/railway',
};
