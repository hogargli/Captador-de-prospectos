const { Lead } = require('./models');
const { connectDB } = require('./database');

async function check() {
    await connectDB();
    const total = await Lead.countDocuments();
    const premium = await Lead.countDocuments({ es_premium: true });
    console.log(`📊 TOTAL_LEADS: ${total}`);
    console.log(`💎 PREMIUM_LEADS: ${premium}`);
    process.exit(0);
}

check();
