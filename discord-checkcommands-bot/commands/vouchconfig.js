const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

let vouchCategories = ["accounts", "prem_gen", "methods", "replacements", "amazon_card", "other"];
let vouchPerson = null;

const OWNER_ID = process.env.OWNER_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouchconfig')
    .setDescription('Configure vouch categories (Owner only)')
    .setDefaultMemberPermissions(0)
    .addSubcommand((sub) =>
      sub
        .setName('addperson')
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
        .setName('addcategory')
        .setDescription('Add a vouch category')
        .addStringOption((opt) =>
          opt
            .setName('category')
            .setDescription('Category name')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('removecategory')
        .setDescription('Remove a vouch category')
        .addStringOption((opt) =>
          opt
            .setName('category')
            .setDescription('Category name')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('view')
        .setDescription('View current person and categories')
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

    if (subcommand === 'addperson') {
      const user = interaction.options.getUser('user');
      vouchPerson = user.id;
      await interaction.reply({
        content: `✅ Set vouch person to ${user}`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (subcommand === 'removeperson') {
      vouchPerson = null;
      await interaction.reply({
        content: '🗑️ Removed vouch person',
        flags: MessageFlags.Ephemeral,
      });
    } else if (subcommand === 'addcategory') {
      const category = interaction.options.getString('category').toLowerCase();
      if (!vouchCategories.includes(category)) {
        vouchCategories.push(category);
        await interaction.reply({
          content: `✅ Added category: ${category}`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: 'Category already exists',
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (subcommand === 'removecategory') {
      const category = interaction.options.getString('category').toLowerCase();
      vouchCategories = vouchCategories.filter((c) => c !== category);
      await interaction.reply({
        content: `🗑️ Removed category: ${category}`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (subcommand === 'view') {
      const person = vouchPerson ? `<@${vouchPerson}>` : 'None set';
      const categories = vouchCategories.join(', ');
      await interaction.reply({
        content: `**Vouch Person:** ${person}\n**Categories:** ${categories}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

