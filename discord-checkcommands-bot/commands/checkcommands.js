const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkcommands')
    .setDescription('Lists all commands this bot currently supports'),

  async execute(interaction) {
    await interaction.deferReply();

    // Pull the live list straight from Discord rather than hardcoding it,
    // so this command stays accurate automatically as more commands are added.
    const guildCommands = interaction.guild
      ? await interaction.guild.commands.fetch().catch(() => null)
      : null;
    const globalCommands = await interaction.client.application.commands.fetch().catch(() => null);

    const merged = new Map();
    globalCommands?.forEach((cmd) => merged.set(cmd.name, cmd));
    guildCommands?.forEach((cmd) => merged.set(cmd.name, cmd));

    const list =
      [...merged.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((cmd) => `**/${cmd.name}** — ${cmd.description}`)
        .join('\n') || 'No commands are currently registered.';

    const embed = new EmbedBuilder()
      .setTitle('Available Commands')
      .setDescription(list)
      .setColor(0x5865f2)
      .setFooter({ text: `${merged.size} command${merged.size === 1 ? '' : 's'} registered` });

    await interaction.editReply({ embeds: [embed] });
  },
};
