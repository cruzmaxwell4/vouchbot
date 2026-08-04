const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xproles')
    .setDescription('Manage XP earning roles')
    .setDefaultMemberPermissions(0)
    .addSubcommand(sub =>
      sub.setName('add').setDescription('Add roles (up to 5)')
        .addRoleOption(o => o.setName('r1').setDescription('Role 1').setRequired(true))
        .addRoleOption(o => o.setName('r2').setDescription('Role 2'))
        .addRoleOption(o => o.setName('r3').setDescription('Role 3'))
        .addRoleOption(o => o.setName('r4').setDescription('Role 4'))
        .addRoleOption(o => o.setName('r5').setDescription('Role 5'))
    )
    .addSubcommand(sub =>
      sub.setName('remove').setDescription('Remove a role')
        .addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('List all XP roles')
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
        const roles = [];
        for (let i = 1; i <= 5; i++) {
          const r = interaction.options.getRole(`r${i}`);
          if (r) roles.push(r);
        }

        let added = 0;
        for (const role of roles) {
          if (!xpState.roles.includes(role.id)) {
            xpState.roles.push(role.id);
            added++;
            console.log(`✅ XP role: ${role.name}`);
          }
        }

        const embed = new EmbedBuilder()
          .setColor('#00A4FF')
          .setTitle('✅ XP Roles Updated')
          .addFields(
            { name: 'Added', value: `${added}`, inline: true },
            { name: 'Total', value: `${xpState.roles.length}`, inline: true }
          );

        if (xpState.roles.length > 0) {
          embed.addFields({ name: 'Roles', value: xpState.roles.map(id => `<@&${id}>`).join(', '), inline: false });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
      } 
      else if (sub === 'remove') {
        const role = interaction.options.getRole('role');
        const idx = xpState.roles.indexOf(role.id);

        if (idx > -1) {
          xpState.roles.splice(idx, 1);
          const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('✅ Role Removed')
            .setDescription(`Removed <@&${role.id}>`)
            .addFields({ name: 'Remaining', value: xpState.roles.length > 0 ? xpState.roles.map(id => `<@&${id}>`).join(', ') : 'None', inline: false });

          await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
          await interaction.reply({ content: '⚠️ Role not in list', ephemeral: true });
        }
      } 
      else if (sub === 'list') {
        if (xpState.roles.length === 0) {
          await interaction.reply({ content: '📭 No XP roles set', ephemeral: true });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor('#00A4FF')
          .setTitle('📋 XP Roles')
          .setDescription(xpState.roles.map(id => `<@&${id}>`).join('\n'))
          .addFields({ name: 'Count', value: `${xpState.roles.length}`, inline: true });

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (err) {
      console.error('xproles error:', err.message);
      await interaction.reply({ content: '❌ Error', ephemeral: true });
    }
  },
};

