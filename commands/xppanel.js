const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

function timeRemaining(ms) {
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return {
    days: d,
    hours: h,
    minutes: m,
    seconds: s,
    total: total,
    format: `${String(d).padStart(2, '0')}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xppanel')
    .setDescription('Show XP leaderboard by roles')
    .setDefaultMemberPermissions(0),
  
  async execute(interaction) {
    try {
      if (interaction.user.id !== process.env.OWNER_ID) {
        await interaction.reply({ content: '⛔ Owner only!', ephemeral: true });
        return;
      }

      await interaction.deferReply();

      const xpState = this.xpState;
      
      if (xpState.roles.length === 0) {
        await interaction.editReply('❌ No XP roles. Use `/xproles add`');
        return;
      }

      const embeds = [];
      const guild = interaction.guild;

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
            .setTitle(role.name)
            .setDescription(board)
            .addFields(
              { name: '👥 Members', value: `${members.length}`, inline: true },
              { name: '⭐ Total XP', value: `${members.reduce((a, b) => a + b.xp, 0).toFixed(2)}`, inline: true },
              { name: '💰 Rate', value: '0.50/msg', inline: true }
            );

          embeds.push(embed);
        } catch (err) {
          console.error(`Role ${roleId} error:`, err.message);
        }
      }

      if (embeds.length === 0) {
        await interaction.editReply('❌ No roles with members');
        return;
      }

      // Timer
      if (!xpState.resetTimestamp) {
        xpState.resetTimestamp = Date.now() + 14 * 24 * 60 * 60 * 1000;
      }

      const remaining = xpState.resetTimestamp - Date.now();
      const time = timeRemaining(remaining);

      const timerEmbed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('⏱️ RESET TIMER')
        .setDescription(`\`\`\`\n${time.format}\n\`\`\``)
        .addFields(
          { name: 'Seconds', value: `${time.total.toLocaleString()}`, inline: true },
          { name: 'Reset', value: `<t:${Math.floor(xpState.resetTimestamp / 1000)}:R>`, inline: true }
        );

      const allEmbeds = [...embeds, timerEmbed];
      const msg = await interaction.editReply({ embeds: allEmbeds });

      // Live timer updates every 10s
      const updateInterval = setInterval(async () => {
        try {
          const remaining = xpState.resetTimestamp - Date.now();
          if (remaining <= 0) {
            clearInterval(updateInterval);
            return;
          }

          const time = timeRemaining(remaining);
          const updatedTimer = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('⏱️ RESET TIMER')
            .setDescription(`\`\`\`\n${time.format}\n\`\`\``)
            .addFields(
              { name: 'Seconds', value: `${time.total.toLocaleString()}`, inline: true },
              { name: 'Reset', value: `<t:${Math.floor(xpState.resetTimestamp / 1000)}:R>`, inline: true }
            );

          const updated = [...embeds, updatedTimer];
          await msg.edit({ embeds: updated });
        } catch (err) {
          console.error('Timer update error:', err.message);
          clearInterval(updateInterval);
        }
      }, 10000);

      // Auto-reset after 14 days
      if (!xpState.resetTimer) {
        xpState.resetTimer = setTimeout(() => {
          xpState.data = {};
          xpState.resetTimestamp = Date.now() + 14 * 24 * 60 * 60 * 1000;
          xpState.resetTimer = null;
          console.log('✓ XP reset after 14 days');
        }, 14 * 24 * 60 * 60 * 1000);
      }
    } catch (err) {
      console.error('xppanel error:', err.message);
      const msg = interaction.replied || interaction.deferred ? 'editReply' : 'reply';
      await interaction[msg]({ content: '❌ Error showing panel' });
    }
  },
};

