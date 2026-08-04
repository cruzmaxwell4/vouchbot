const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xpchannels')
    .setDescription('Manage XP exclude channels (Owner only)')
    .setDefaultMemberPermissions(0)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add channels where XP is NOT earned')
        .addChannelOption((opt) =>
          opt
            .setName('channel1')
            .setDescription('First channel')
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel2')
            .setDescription('Second channel (optional)')
            .setRequired(false)
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel3')
            .setDescription('Third channel (optional)')
            .setRequired(false)
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel4')
            .setDescription('Fourth channel (optional)')
            .setRequired(false)
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel5')
            .setDescription('Fifth channel (optional)')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a channel from XP exclude list')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel to remove')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('List all excluded channels')
    ),
  
  async execute(interaction) {
    try {
      const OWNER_ID = process.env.OWNER_ID;
      if (interaction.user.id !== OWNER_ID) {
        await interaction.reply({ content: '⛔ Owner only!', flags: MessageFlags.Ephemeral });
        return;
      }

      const subcommand = interaction.options.getSubcommand();
      const xpSystem = this.xpSystem;

      if (subcommand === 'add') {
        const channels = [];
        for (let i = 1; i <= 5; i++) {
          const channel = interaction.options.getChannel(`channel${i}`);
          if (channel) channels.push(channel);
        }

        if (channels.length === 0) {
          await interaction.reply({ content: '❌ No channels provided', flags: MessageFlags.Ephemeral });
          return;
        }

        let added = 0;
        let already = 0;

        for (const channel of channels) {
          if (xpSystem.addXpExcludeChannel(channel.id)) {
            added++;
            console.log(`✅ Excluded channel: ${channel.name}`);
          } else {
            already++;
          }
        }

        const embed = new EmbedBuilder()
          .setColor('#FF6B6B')
          .setTitle('✅ Excluded Channels Updated')
          .addFields(
            { name: '✅ Added', value: `${added}`, inline: true },
            { name: '⚠️ Already Excluded', value: `${already}`, inline: true }
          );

        const currentChannels = xpSystem.getXpExcludeChannels();
        if (currentChannels.length > 0) {
          embed.addFields({
            name: '📋 All Excluded Channels',
            value: currentChannels.map(id => `<#${id}>`).join(', '),
            inline: false
          });
        }

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      } else if (subcommand === 'remove') {
        const channel = interaction.options.getChannel('channel');
        if (!channel) {
          await interaction.reply({ content: '❌ Invalid channel', ephemeral: true });
          return;
        }

        if (xpSystem.removeXpExcludeChannel(channel.id)) {
          const embed = new EmbedBuilder()
            .setColor('#00A4FF')
            .setTitle('✅ Channel Removed')
            .setDescription(`Removed <#${channel.id}> from excluded channels`);

          const currentChannels = xpSystem.getXpExcludeChannels();
          if (currentChannels.length > 0) {
            embed.addFields({
              name: '📋 Remaining Excluded Channels',
              value: currentChannels.map(id => `<#${id}>`).join(', '),
              inline: false
            });
          } else {
            embed.addFields({
              name: '📋 Excluded Channels',
              value: 'None',
              inline: false
            });
          }

          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content: '⚠️ Channel was not in excluded list', flags: MessageFlags.Ephemeral });
        }
      } else if (subcommand === 'list') {
        const currentChannels = xpSystem.getXpExcludeChannels();
        
        if (currentChannels.length === 0) {
          await interaction.reply({ content: '📭 No excluded channels. XP is earned in all channels!', flags: MessageFlags.Ephemeral });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor('#FF6B6B')
          .setTitle('📋 Excluded Channels (XP NOT Earned Here)')
          .setDescription(currentChannels.map(id => `<#${id}>`).join('\n'))
          .addFields({
            name: '👥 Total',
            value: `${currentChannels.length}`,
            inline: true
          })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }
    } catch (err) {
      console.error('Error in xpchannels command:', err);
      try {
        if (!interaction.replied) {
          await interaction.reply({ content: '❌ Error managing excluded channels', ephemeral: true });
        }
      } catch (e) {
        console.error('Failed to send error reply:', e);
      }
    }
  },
};

