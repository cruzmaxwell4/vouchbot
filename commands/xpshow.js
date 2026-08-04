const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Global XP data - persists in memory during bot lifetime
let xpData = {};
let xpRoles = [];
const XP_PER_MESSAGE = 0.5;
let xpResetTimer = null;
let resetInProgress = false;
let resetTimestamp = null;

function getTimeRemaining(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds
  };
}

function formatTime(time) {
  return `${String(time.days).padStart(2, '0')}d ${String(time.hours).padStart(2, '0')}h ${String(time.minutes).padStart(2, '0')}m ${String(time.seconds).padStart(2, '0')}s`;
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
            .setFooter({ text: `${XP_PER_MESSAGE} XP per message` });
          
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

async function updateTimerMessage(message) {
  try {
    if (!resetTimestamp || !message) return;

    const timeRemaining = resetTimestamp - Date.now();
    if (timeRemaining <= 0) {
      await message.edit({ content: 'Time expired!' });
      return;
    }

    const time = getTimeRemaining(timeRemaining);
    const timerEmbed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('⏱️ XP RESET TIMER')
      .setDescription(`\`\`\`\n${formatTime(time)}\n\`\`\``)
      .addFields({
        name: 'Seconds Remaining',
        value: `${time.totalSeconds.toLocaleString()}`,
        inline: true
      },
      {
        name: 'Next Reset',
        value: `<t:${Math.floor(resetTimestamp / 1000)}:R>`,
        inline: true
      })
      .setFooter({ text: 'Updates every 10 seconds' });

    await message.edit({ embeds: [timerEmbed] });
  } catch (err) {
    console.error('Error updating timer:', err);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xpshow')
    .setDescription('Show XP leaderboard by roles (Owner only)')
    .setDefaultMemberPermissions(0),
  
  async execute(interaction) {
    try {
      const OWNER_ID = process.env.OWNER_ID;
      if (interaction.user.id !== OWNER_ID) {
        await interaction.reply({ content: '⛔ Owner only!', flags: MessageFlags.Ephemeral });
        return;
      }

      if (xpRoles.length === 0) {
        await interaction.reply({
          content: '❌ No XP roles set. Use `/xproles` to add roles.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // Create embeds for each role
      const embeds = [];
      const guild = interaction.guild;

      for (const roleId of xpRoles) {
        try {
          const role = await guild.roles.fetch(roleId);
          if (!role) {
            console.warn(`Role ${roleId} not found`);
            continue;
          }

          // Get all members with this role
          const membersWithRole = await guild.members.fetch();
          const usersWithRole = membersWithRole
            .filter(member => member.roles.cache.has(roleId))
            .map(member => ({
              id: member.user.id,
              name: member.user.username,
              xp: xpData[member.user.id] || 0
            }))
            .sort((a, b) => b.xp - a.xp);

          if (usersWithRole.length === 0) {
            continue;
          }

          // Build leaderboard for this role
          const leaderboard = usersWithRole
            .slice(0, 10)
            .map((user, index) => {
              const medals = ['🥇', '🥈', '🥉'];
              const medal = medals[index] || `${index + 1}.`;
              return `${medal} <@${user.id}> • **${user.xp.toFixed(2)} XP**`;
            })
            .join('\n');

          const roleEmbed = new EmbedBuilder()
            .setColor(role.color || '#00A4FF')
            .setTitle(`${role.name}`)
            .setDescription(leaderboard || 'No one with XP yet')
            .addFields({
              name: '👥 Members with XP',
              value: `${usersWithRole.length}`,
              inline: true
            },
            {
              name: '⭐ Total XP',
              value: `${usersWithRole.reduce((a, b) => a + b.xp, 0).toFixed(2)}`,
              inline: true
            },
            {
              name: '💰 Per Message',
              value: `${XP_PER_MESSAGE} XP`,
              inline: true
            })
            .setTimestamp();

          embeds.push(roleEmbed);
        } catch (err) {
          console.error(`Error fetching role ${roleId}:`, err);
        }
      }

      if (embeds.length === 0) {
        await interaction.reply({
          content: '❌ No roles found with members.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // Create timer embed (big and blue with live countdown)
      if (!resetTimestamp) {
        const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
        resetTimestamp = Date.now() + twoWeeksMs;
      }

      const timeRemaining = resetTimestamp - Date.now();
      const time = getTimeRemaining(timeRemaining);

      const timerEmbed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('⏱️ XP RESET TIMER')
        .setDescription(`\`\`\`\n${formatTime(time)}\n\`\`\``)
        .addFields({
          name: 'Seconds Remaining',
          value: `${time.totalSeconds.toLocaleString()}`,
          inline: true
        },
        {
          name: 'Next Reset',
          value: `<t:${Math.floor(resetTimestamp / 1000)}:R>`,
          inline: true
        })
        .setFooter({ text: 'Updates every 10 seconds' });

      // Send all embeds
      const allEmbeds = [...embeds, timerEmbed];
      const response = await interaction.reply({ embeds: allEmbeds });

      // Update timer every 10 seconds
      const timerInterval = setInterval(async () => {
        try {
          if (!resetTimestamp) {
            clearInterval(timerInterval);
            return;
          }

          const timeRemaining = resetTimestamp - Date.now();
          if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            return;
          }

          const time = getTimeRemaining(timeRemaining);
          const updatedEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('⏱️ XP RESET TIMER')
            .setDescription(`\`\`\`\n${formatTime(time)}\n\`\`\``)
            .addFields({
              name: 'Seconds Remaining',
              value: `${time.totalSeconds.toLocaleString()}`,
              inline: true
            },
            {
              name: 'Next Reset',
              value: `<t:${Math.floor(resetTimestamp / 1000)}:R>`,
              inline: true
            })
            .setFooter({ text: 'Updates every 10 seconds' });

          // Update only the timer embed (last one)
          const updatedEmbeds = [...embeds, updatedEmbed];
          await response.edit({ embeds: updatedEmbeds });
        } catch (err) {
          console.error('Error updating timer:', err);
          clearInterval(timerInterval);
        }
      }, 10000); // Update every 10 seconds

      // Start 2-week timer if not already running
      if (!xpResetTimer) {
        const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
        
        xpResetTimer = setTimeout(async () => {
          xpResetTimer = null;
          clearInterval(timerInterval);
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

