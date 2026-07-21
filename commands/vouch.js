const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { loadConfig } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouch')
    .setDescription('Leave a vouch')
    .addStringOption((opt) =>
      opt
        .setName('category')
        .setDescription('What are you vouching for?')
        .setRequired(true)
        .addChoices(
          { name: 'Accounts', value: 'accounts' },
          { name: 'Prem Gen', value: 'prem_gen' },
          { name: 'Methods', value: 'methods' },
          { name: 'Replacements', value: 'replacements' },
          { name: 'Amazon Card', value: 'amazon_card' },
          { name: 'Other', value: 'other' }
        )
    )
    .addIntegerOption((opt) =>
      opt
        .setName('rating')
        .setDescription('Star rating')
        .setRequired(true)
        .addChoices(
          { name: '⭐ 1 Star', value: 1 },
          { name: '⭐⭐ 2 Stars', value: 2 },
          { name: '⭐⭐⭐ 3 Stars', value: 3 },
          { name: '⭐⭐⭐⭐ 4 Stars', value: 4 },
          { name: '⭐⭐⭐⭐⭐ 5 Stars', value: 5 }
        )
    )
    .addStringOption((opt) =>
      opt
        .setName('message')
        .setDescription('Add a message to your vouch')
        .setRequired(false)
    ),

  async execute(interaction) {
    const config = loadConfig();
    
    // Check if person is set
    if (!config.vouchPerson) {
      await interaction.reply({
        content: 'Owner has not set a person to vouch for yet',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const category = interaction.options.getString('category');
    const rating = interaction.options.getInteger('rating');
    const message = interaction.options.getString('message') || 'No message';
    const vouchedBy = interaction.user;

    // Format the category
    const categoryMap = {
      accounts: 'Accounts',
      prem_gen: 'Prem Gen',
      methods: 'Methods',
      replacements: 'Replacements',
      amazon_card: 'Amazon Card',
      other: 'Other',
    };

    const categoryName = categoryMap[category] || category;
    const stars = '⭐'.repeat(rating) + '🌑'.repeat(5 - rating);

    const embed = new EmbedBuilder()
      .setColor('#2f3136')
      .setTitle('✅ New Vouch')
      .setDescription(`**Vouch Category:** ${categoryName}`)
      .addFields(
        { name: 'Vouching For', value: `<@${config.vouchPerson}>`, inline: true },
        { name: 'Rating', value: stars, inline: true },
        { name: 'Message', value: message, inline: false },
        {
          name: 'Vouched By',
          value: vouchedBy.toString(),
          inline: false,
        },
        {
          name: 'Time',
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: false,
        }
      )
      .setAuthor({
        name: vouchedBy.username,
        iconURL: vouchedBy.displayAvatarURL({ size: 256 }),
      });

    const vouchChannelId = process.env.VOUCH_CHANNEL_ID;
    if (!vouchChannelId) {
      await interaction.reply({
        content: 'Vouch channel not configured',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const channel = await interaction.client.channels.fetch(vouchChannelId);
      const vouchMessage = await channel.send({ embeds: [embed] });

      // Auto react with a heart
      await vouchMessage.react('❤️');
      console.log('✅ Reacted with heart');

      await interaction.reply({
        content: '✅ Vouch posted!',
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('Failed to post vouch:', error);
      await interaction.reply({
        content: 'Failed to post vouch',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

