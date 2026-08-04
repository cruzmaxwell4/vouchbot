const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

async function buildLeaderboard(xpState, guild) {
  const embeds = [];

  for (const roleId of xpState.roles) {
    try {
      const role = guild.roles.cache.get(roleId);
      if (!role) continue;

      const members = guild.members.cache
        .filter(m => m.roles.cache.has(roleId))
        .map(m => ({
          id: m.user.id,
          xp: xpState.data[m.user.id] || 0
        }))
        .filter(u => u.xp > 0)
        .sort((a, b) => b.xp - a.xp);

      if (members.length === 0) continue;

      const board = members
        .slice(0, 10)
        .map((u, i) => {
          const medals = ['🥇', '🥈', '🥉'];
          const medal = medals[i] || `${i + 1}.`;
          return `${medal} <@${u.id}> • **${u.xp.toFixed(2)}** XP`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(role.color || '#00A4FF')
        .setTitle(`${role.name}`)
        .setDescription(board)
        .addFields(
          { name: '👥 Members', value: `${members.length}`, inline: true },
          { name: '⭐ Total XP', value: `${members.reduce((a, b) => a + b.xp, 0).toFixed(2)}`, inline: true }
        );

      embeds.push(embed);
    } catch (err) {
      console.error(`Role error:`, err.message);
    }
  }

  if (embeds.length === 0) return null;
  return embeds;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xpshowrole')
    .setDescription('Show XP leaderboard (auto-refreshes every 5 mins)'),
  
  async execute(interaction) {
    try {
      if (interaction.user.id !== process.env.OWNER_ID) {
        await interaction.reply({ content: '⛔ Owner only!', ephemeral: true });
        return;
      }

      await interaction.deferReply();

      const xpState = this.xpState;
      const guild = interaction.guild;

      if (xpState.roles.length === 0) {
        await interaction.editReply('❌ No XP roles. Use `/xproles add`');
        return;
      }

      const embeds = await buildLeaderboard(xpState, guild);
      if (!embeds) {
        await interaction.editReply('❌ No roles with members');
        return;
      }

      const msg = await interaction.editReply({ embeds });
      
      // Store message ID for auto-refresh
      xpState.panelMessageId = msg.id;
      xpState.panelChannelId = interaction.channelId;

      // Clear old interval if exists
      if (xpState.refreshInterval) clearInterval(xpState.refreshInterval);

      // Auto-refresh every 5 minutes
      xpState.refreshInterval = setInterval(async () => {
        try {
          const channel = await guild.client.channels.fetch(xpState.panelChannelId);
          if (!channel) return;

          const panelMsg = await channel.messages.fetch(xpState.panelMessageId);
          if (!panelMsg) return;

          const newEmbeds = await buildLeaderboard(xpState, guild);
          if (newEmbeds) {
            await panelMsg.edit({ embeds: newEmbeds });
            console.log('✓ Panel refreshed');
          }
        } catch (err) {
          console.error('Refresh error:', err.message);
        }
      }, 5 * 60 * 1000); // Every 5 minutes

      console.log('✓ Panel created - auto-refreshes every 5 mins');
    } catch (err) {
      console.error('xpshowrole error:', err.message);
      const msg = interaction.deferred ? 'editReply' : 'reply';
      await interaction[msg]({ content: '❌ Error' });
    }
  },
};

