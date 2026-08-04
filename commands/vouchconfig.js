const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { loadConfig, saveConfig } = require('../config');

const OWNER_ID = process.env.OWNER_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouchconfig')
    .setDescription('Configure vouch settings (Owner only)')
    .setDefaultMemberPermissions(0)
    .addSubcommand((sub) =>
      sub
        .setName('setperson')
        .setDescription('Set the person to vouch for (Owner only)')
        .addUserOption((opt) =>
          opt
            .setName('user')
            .setDescription('User to vouch for')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('removeperson')
        .setDescription('Remove the person to vouch for (Owner only)')
    )
    .addSubcommand((sub) =>
      sub
        .setName('view')
        .setDescription('View current vouch settings')
    ),

  async execute(interaction) {
    try {
      if (interaction.user.id !== OWNER_ID) {
        await interaction.reply({
          content: '⛔ Owner only!',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const subcommand = interaction.options.getSubcommand();
      const config = loadConfig();

      if (subcommand === 'setperson') {
        try {
          const user = interaction.options.getUser('user');
          if (!user) {
            await interaction.reply({
              content: '❌ Invalid user',
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          config.vouchPerson = user.id;
          saveConfig(config);
          await interaction.reply({
            content: `✅ Set vouch person to ${user}`,
            flags: MessageFlags.Ephemeral,
          });
        } catch (err) {
          console.error('Error setting person:', err);
          await interaction.reply({
            content: '❌ Error setting person',
            flags: MessageFlags.Ephemeral,
          });
        }
      } else if (subcommand === 'removeperson') {
        try {
          config.vouchPerson = null;
          saveConfig(config);
          await interaction.reply({
            content: '🗑️ Removed vouch person',
            flags: MessageFlags.Ephemeral,
          });
        } catch (err) {
          console.error('Error removing person:', err);
          await interaction.reply({
            content: '❌ Error removing person',
            flags: MessageFlags.Ephemeral,
          });
        }
      } else if (subcommand === 'view') {
        const person = config.vouchPerson ? `<@${config.vouchPerson}>` : 'None set';
        const categories = config.vouchCategories.join(', ') || 'None';
        const embed = new EmbedBuilder()
          .setColor('#2f3136')
          .setTitle('⚙️ Vouch Configuration')
          .addFields(
            { name: 'Vouch Person', value: person, inline: false },
            { name: 'Categories', value: categories, inline: false }
          )
          .setTimestamp();
        await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (err) {
      console.error('Error in vouchconfig command:', err);
      try {
        if (!interaction.replied) {
          await interaction.reply({
            content: '❌ An error occurred',
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch (e) {
        console.error('Failed to send error reply:', e);
      }
    }
  },
};

