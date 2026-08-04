const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

// Global XP data - persists in memory during bot lifetime
let xpData = {};
let xpRoles = [];
const XP_PER_MESSAGE = 0.5;
let xpResetTimer = null;
let resetInProgress = false;

async function performReset(client) {
  if (resetInProgress) return;
  resetInProgress = true;
  
  try {
    xpData = {};
    console.log('✓ XP data reset after 2 weeks');

    // Post reset panel to vouch channel
    try {
      const VOUCH_CHANNEL_ID = process.env.VOUCH_CHANNEL_ID;
      if (VOUCH_CHANNEL_ID) {
        const channel = await client.channels.fetch(VOUCH_CHANNEL_ID);
        if (channel?.isTextBased()) {
          const resetEmbed = new EmbedBuilder()
            .setColor('#2f3136')
            .setTitle('✅ XP Reset')
            .setDescription('XP leaderboard has been reset! New 2-week cycle begins.')
            .setFooter({ text: `${XP_PER_MESSAGE} XP per message • Next reset in 2 weeks` });
          await channel.send({ embeds: [resetEmbed] });
        }
      }
    } catch (err) {
      console.error('Failed to post reset panel:', err);
    }
  } catch (err) {
    console.error('Error during XP reset:', err);
  } finally {
    resetInProgress = false;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xpshow')
    .setDescription('Show XP leaderboard (Owner only)')
    .setDefaultMemberPermissions(0),
  
  async execute(interaction) {
    try {
      const OWNER_ID = process.env.OWNER_ID;
      if (interaction.user.id !== OWNER_ID) {
        await interaction.reply({ content: 'Owner only!', flags: MessageFlags.Ephemeral });
        return;
      }

      // Create leaderboard sorted by XP
      const leaderboard = Object.entries(xpData)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10) // Top 10
        .map(([userId, xp], index) => `${index + 1}. <@${userId}> - ${xp.toFixed(2)} XP`)
        .join('\n') || 'No XP data yet';

      const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle('📊 XP Leaderboard')
        .setDescription(leaderboard)
        .addFields({
          name: 'Active Roles',
          value: xpRoles.length > 0 ? xpRoles.map(id => `<@&${id}>`).join(', ') : 'None set',
          inline: false
        })
        .setFooter({ text: `${XP_PER_MESSAGE} XP per message • Auto-reset in 2 weeks` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

      // Start 2-week timer if not already running
      if (!xpResetTimer) {
        const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
        xpResetTimer = setTimeout(async () => {
          xpResetTimer = null;
          await performReset(interaction.client);
        }, twoWeeksMs);

        console.log('✓ Started 2-week XP reset timer');
      }
    } catch (err) {
      console.error('Error in xpshow command:', err);
      try {
        if (!interaction.replied) {
          await interaction.reply({ content: '❌ Error displaying leaderboard', ephemeral: true });
        }
      } catch (e) {
        console.error('Failed to send error reply:', e);
      }
    }
  },
  
  // Export functions for other modules to use
  getXpData: () => xpData,
  setXpData: (data) => { xpData = data; },
  getXpRoles: () => xpRoles,
  setXpRoles: (roles) => { xpRoles = roles; },
  addXp: (userId, amount) => {
    try {
      xpData[userId] = (xpData[userId] || 0) + amount;
    } catch (err) {
      console.error('Error adding XP:', err);
    }
  },
};

