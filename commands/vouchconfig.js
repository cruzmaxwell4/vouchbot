const { SlashCommandBuilder, MessageFlags } = require('discord.js');
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
    if (interaction.user.id !== OWNER_ID) {
      await interaction.reply({
        content: 'Owner only!',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const config = loadConfig();

    if (subcommand === 'setperson') {
      const user = interaction.options.getUser('user');
      config.vouchPerson = user.id;
      saveConfig(config);
      await interaction.reply({
        content: `✅ Set vouch person to ${user}`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (subcommand === 'removeperson') {
      config.vouchPerson = null;
      saveConfig(config);
      await interaction.reply({
        content: '🗑️ Removed vouch person',
        flags: MessageFlags.Ephemeral,
      });
    } else if (subcommand === 'view') {
      const person = config.vouchPerson ? `<@${config.vouchPerson}>` : 'None set';
      const categories = config.vouchCategories.join(', ');
      await interaction.reply({
        content: `**Vouch Person:** ${person}\n**Categories:** ${categories}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

