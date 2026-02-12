module.exports = {
    TOKEN: process.env.BOT_TOKEN || '8529939811:AAEE2XMUZ5RkMxqWHLL86OBSGW45-sIoQzQ',
    OWNER_ID: process.env.OWNER_ID || '6690476979',
    TEACHER_ID: process.env.TEACHER_ID || '5092858512',
    GROUP_ID: process.env.GROUP_ID || '-1002582621647',

    // Chat where teacher support threads are created (forum supergroup recommended)
    TEACHER_CHAT_ID: process.env.TEACHER_CHAT_ID || process.env.GROUP_ID || '-1003747817914',

    // Postgres connection string
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:JPGaDBzwPaKlKTFAWxOdkMazIxopCwoU@postgres.railway.internal:5432/railway',
};



