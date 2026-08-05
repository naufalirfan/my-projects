const cron = require('node-cron');
const chalk = require('chalk');
const { analyzeForex, analyzeForexCombined, sendTelegramMessage } = require('./index');

console.log(chalk.blue.bold('\n🤖 FOREX ANALYSIS BOT SCHEDULER'));
console.log(chalk.gray('─'.repeat(40)));

const SCHEDULE_CONFIG = {
  schedule: '0 8 * * *',
  timezone: 'Asia/Jakarta',
  sendTelegram: true
};

console.log(chalk.cyan(`⏰ Schedule: ${SCHEDULE_CONFIG.schedule}`));
console.log(chalk.cyan(`🌍 Timezone: ${SCHEDULE_CONFIG.timezone}`));
console.log(chalk.cyan(`📱 Telegram: ${SCHEDULE_CONFIG.sendTelegram ? 'Enabled' : 'Disabled'}`));
console.log(chalk.gray('─'.repeat(40) + '\n'));

async function runAnalysis() {
  console.log('\n' + chalk.blue('='.repeat(60)));
  console.log(chalk.blue('🔄 Starting scheduled forex analysis...'));
  console.log(chalk.blue('='.repeat(60) + '\n'));
  
  try {
    const results = await analyzeForexCombined(SCHEDULE_CONFIG.sendTelegram);
    console.log(chalk.green('\n✅ Analysis completed successfully!'));
    
    if (SCHEDULE_CONFIG.sendTelegram) {
      console.log(chalk.cyan('📱 Telegram notification sent to configured chat.'));
    }
    
    return results;
  } catch (error) {
    console.error(chalk.red('\n❌ Error during analysis:'), error.message);
    
    if (SCHEDULE_CONFIG.sendTelegram) {
      await sendTelegramMessage(`❌ <b>Forex Bot Error:</b>\n${error.message}`);
    }
    
    throw error;
  }
}

cron.schedule(SCHEDULE_CONFIG.schedule, runAnalysis, {
  timezone: SCHEDULE_CONFIG.timezone
});

console.log(chalk.yellow.bold('📋 NEXT RUNS:'));
console.log(chalk.white('  • 8:00 AM Jakarta time (daily)'));
console.log(chalk.white('  • Press Ctrl+C to stop\n'));

console.log(chalk.green.bold('💡 QUICK COMMANDS:'));
console.log(chalk.white('  • Run now: node index.js'));
console.log(chalk.white('  • Start scheduler: npm run schedule'));
console.log(chalk.white('  • Stop: Ctrl+C\n'));

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 Scheduler stopped.'));
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n❌ Uncaught Exception:'), error.message);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('\n❌ Unhandled Rejection:'), reason);
});