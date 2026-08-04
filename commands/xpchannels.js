const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xpchannels')
    .setDescription('Manage channels where XP is NOT earned')
    .setDefaultMemberPermissions(0)
    .addSubcommand(sub =>
      sub.setName('add').setDescription('Exclude channels (up to 5)')
        .addChannelOption(o => o.setName('c1').setDescription('Channel 1').setRequired(true))
        .addChannelOption(o => o.setName('c2').setDescription('Channel 2'))
        .addChannelOption(o => o.setName('c3').setDescription('Channel 3'))
        .addChannelOption(o => o.setName('c4').setDescription('Channel 4'))
        .addChannelOption(o => o.setName('c5').setDescription('Channel 5'))
    )
    .addSubcommand(sub =>
      sub.setName('remove').setDescription('Remove a channel')
        .addChannelOption(o => o.setName('channel').setDescription('Channel to remove').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List excluded channels')
    ),
  
  async execute(interaction) {
    try {
      if (interaction.user.id !== process.env.OWNER_ID) {
        await interaction.reply({ content: '⛔ Owner only!', ephemeral: true });
        return;
      }

      const xpState = this.xpState;
      const sub = interaction.options.getSubcommand();

      if (sub === 'add') {
        const channels = [];
        for (let i = 1; i <= 5; i++) {
          const c = interaction.options.getChannel(`c${i}`);
          if (c) channels.push(c);
        }

        let added = 0;
        for (const channel of channels) {
          if (!xpState.excludeChannels.includes(channel.id)) {
            xpState.excludeChannels.push(channel.id);
            added++;
            console.log(`✅ Excluded: ${channel.name}`);
          }
        }

        const embed = new EmbedBuilder()
          .setColor('#FF6B6B')
          .setTitle('✅ Channels Updated')
          .addFields(
            { name: 'Added', value: `${added}`, inline: true },
            { name: 'Total', value: `${xpState.excludeChannels.length}`, inline: true }
          );

        if (xpState.excludeChannels.length > 0) {
          embed.addFields({ name: 'Excluded', value: xpState.excludeChannels.map(id => `<#${id}>`).join(', '), inline: false });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } 
      else if (sub === 'remove') {
        const channel = interaction.options.getChannel('channel');
        const idx = xpState.excludeChannels.indexOf(channel.id);

        if (idx > -1) {
          xpState.excludeChannels.splice(idx, 1);
          const embed = new EmbedBuilder()
            .setColor('#00A4FF')
            .setTitle('✅ Channel Removed')
            .setDescription(`Removed <#${channel.id}>`)
            .addFields({ name: 'Remaining', value: xpState.excludeChannels.length > 0 ? xpState.excludeChannels.map(id => `<#${id}>`).join(', ') : 'None', inline: false });

          await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
          await interaction.reply({ content: '⚠️ Channel not excluded', ephemeral: true });
        }
      } 
      else if (sub === 'list') {
        if (xpState.excludeChannels.length === 0) {
          await interaction.reply({ content: '📭 No excluded channels. XP earned everywhere!', ephemeral: true });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor('#FF6B6B')
          .setTitle('📋 Excluded Channels')
          .setDescription(xpState.excludeChannels.map(id => `<#${id}>`).join('\n'))
          .addFields({ name: 'Count', value: `${xpState.excludeChannels.length}`, inline: true });

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (err) {
      console.error('xpchannels error:', err.message);
      await interaction.reply({ content: '❌ Error', ephemeral: true });
    }
  },
};

