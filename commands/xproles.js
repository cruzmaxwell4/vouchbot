const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xproles')
    .setDescription('Manage XP roles (Owner only)')
    .setDefaultMemberPermissions(0)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add one or more roles to earn XP')
        .addRoleOption((opt) =>
          opt
            .setName('role1')
            .setDescription('First role')
            .setRequired(true)
        )
        .addRoleOption((opt) =>
          opt
            .setName('role2')
            .setDescription('Second role (optional)')
            .setRequired(false)
        )
        .addRoleOption((opt) =>
          opt
            .setName('role3')
            .setDescription('Third role (optional)')
            .setRequired(false)
        )
        .addRoleOption((opt) =>
          opt
            .setName('role4')
            .setDescription('Fourth role (optional)')
            .setRequired(false)
        )
        .addRoleOption((opt) =>
          opt
            .setName('role5')
            .setDescription('Fifth role (optional)')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a role from XP earning')
        .addRoleOption((opt) =>
          opt
            .setName('role')
            .setDescription('Role to remove')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('List all XP roles')
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
        const roles = [];
        for (let i = 1; i <= 5; i++) {
          const role = interaction.options.getRole(`role${i}`);
          if (role) roles.push(role);
        }

        if (roles.length === 0) {
          await interaction.reply({ content: '❌ No roles provided', flags: MessageFlags.Ephemeral });
          return;
        }

        let added = 0;
        let already = 0;

        for (const role of roles) {
          if (xpSystem.addXpRole(role.id)) {
            added++;
            console.log(`✅ Added role: ${role.name}`);
          } else {
            already++;
          }
        }

        const embed = new EmbedBuilder()
          .setColor('#00A4FF')
          .setTitle('✅ XP Roles Updated')
          .addFields(
            { name: '✅ Added', value: `${added}`, inline: true },
            { name: '⚠️ Already Added', value: `${already}`, inline: true }
          );

        const currentRoles = xpSystem.getXpRoles();
        if (currentRoles.length > 0) {
          embed.addFields({
            name: '📋 All XP Roles',
            value: currentRoles.map(id => `<@&${id}>`).join(', '),
            inline: false
          });
        }

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      } else if (subcommand === 'remove') {
        const role = interaction.options.getRole('role');
        if (!role) {
          await interaction.reply({ content: '❌ Invalid role', ephemeral: true });
          return;
        }

        if (xpSystem.removeXpRole(role.id)) {
          const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('✅ Role Removed')
            .setDescription(`Removed <@&${role.id}> from XP roles`);

          const currentRoles = xpSystem.getXpRoles();
          if (currentRoles.length > 0) {
            embed.addFields({
              name: '📋 Remaining XP Roles',
              value: currentRoles.map(id => `<@&${id}>`).join(', '),
              inline: false
            });
          } else {
            embed.addFields({
              name: '📋 XP Roles',
              value: 'None',
              inline: false
            });
          }

          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content: '⚠️ Role was not in XP roles list', flags: MessageFlags.Ephemeral });
        }
      } else if (subcommand === 'list') {
        const currentRoles = xpSystem.getXpRoles();
        
        if (currentRoles.length === 0) {
          await interaction.reply({ content: '📭 No XP roles set', flags: MessageFlags.Ephemeral });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor('#00A4FF')
          .setTitle('📋 XP Roles')
          .setDescription(currentRoles.map(id => `<@&${id}>`).join('\n'))
          .addFields({
            name: '👥 Total',
            value: `${currentRoles.length}`,
            inline: true
          })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }
    } catch (err) {
      console.error('Error in xproles command:', err);
      try {
        if (!interaction.replied) {
          await interaction.reply({ content: '❌ Error managing XP roles', ephemeral: true });
        }
      } catch (e) {
        console.error('Failed to send error reply:', e);
      }
    }
  },
};

