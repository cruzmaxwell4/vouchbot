const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Global XP data - persists in memory during bot lifetime
let xpData = {};
let xpRoles = [];
const XP_PER_MESSAGE = 0.5;
let xpResetTimer = null;
let resetInProgress = false;
let resetTimestamp = null;

function formatTimeRemaining(ms) {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

async function performReset(client) {
  if (resetInProgress) return;
  resetInProgress = true;
  
  try {
    xpData = {};
    resetTimestamp = null;
    console.log('✓ XP data reset after 2 weeks');

    // Post reset panel to vouch channel
    try {
      const VOUCH_CHANNEL_ID = process.env.VOUCH_CHANNEL_ID;
      if (VOUCH_CHANNEL_ID) {
        const channel = await client.channels.fetch(VOUCH_CHANNEL_ID);
        if (channel?.isTextBased()) {
          const resetEmbed = new EmbedBuilder()
            .setColor('#00A4FF')
            .setTitle('🔄 XP LEADERBOARD RESET')
            .setDescription('The XP leaderboard has been reset! New 2-week cycle begins.')
            .addFields({
              name: '⏱️ New Reset Time',
              value: `<t:${Math.floor((Date.now() + 14 * 24 * 60 * 60 * 1000) / 1000)}:R>`,
              inline: false
            })
            .setFooter({ text: '${XP_PER_MESSAGE} XP per message' });
          
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
        const timerEmbed = new EmbedBuilder()
          .setColor('#00A4FF')
          .setTitle('⏱️ XP RESET TIMER')
          .setDescription(resetTimestamp ? formatTimeRemaining(resetTimestamp - Date.now()) : 'Not started');
        
        await interaction.reply({ embeds: [timerEmbed], flags: MessageFlags.Ephemeral });
        return;
      }

      // Create leaderboard sorted by XP
      const sorted = Object.entries(xpData)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15); // Top 15

      const leaderboardText = sorted.length > 0
        ? sorted.map(([userId, xp], index) => {
            const medals = ['🥇', '🥈', '🥉'];
            const medal = medals[index] || `${index + 1}.`;
            return `${medal} <@${userId}> • **${xp.toFixed(2)} XP**`;
          }).join('\n')
        : '📭 No XP data yet';

      // Get total players
      const totalPlayers = Object.keys(xpData).length;
      const totalXp = Object.values(xpData).reduce((a, b) => a + b, 0);

      // Create main leaderboard embed
      const leaderboardEmbed = new EmbedBuilder()
        .setColor('#00A4FF')
        .setTitle('📊 XP LEADERBOARD')
        .setDescription(leaderboardText)
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .addFields(
          {
            name: '👥 Players',
            value: `${totalPlayers}`,
            inline: true
          },
          {
            name: '⭐ Total XP',
            value: `${totalXp.toFixed(2)}`,
            inline: true
          },
          {
            name: '💰 Per Message',
            value: `${XP_PER_MESSAGE} XP`,
            inline: true
          },
          {
            name: '🎯 Active Roles',
            value: xpRoles.length > 0 ? xpRoles.map(id => `<@&${id}>`).join(', ') : 'None set',
            inline: false
          }
        )
        .setTimestamp();

      // Create timer embed (big and blue)
      const timeRemaining = resetTimestamp ? resetTimestamp - Date.now() : 14 * 24 * 60 * 60 * 1000;
      const timerEmbed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('⏱️ XP RESET TIMER')
        .setDescription(`\`\`\`\n${formatTimeRemaining(timeRemaining)}\n\`\`\``)
        .addFields({
          name: 'Next Reset',
          value: `<t:${Math.floor((Date.now() + timeRemaining) / 1000)}:R>`,
          inline: false
        })
        .setFooter({ text: 'Resets automatically in 2 weeks' });

      await interaction.reply({ embeds: [leaderboardEmbed, timerEmbed] });

      // Start 2-week timer if not already running
      if (!xpResetTimer) {
        const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
        resetTimestamp = Date.now() + twoWeeksMs;
        
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
  getResetTimer: () => resetTimestamp,
};

