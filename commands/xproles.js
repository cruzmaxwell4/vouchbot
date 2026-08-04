const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { loadXpRoles, saveXpRoles } = require('../xp-data');

let xpRoles = [];

// Load roles on startup
function initializeRoles() {
  xpRoles = loadXpRoles();
  console.log(`✓ Loaded ${xpRoles.length} XP roles`);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xproles')
    .setDescription('Set which roles gain XP (Owner only)')
    .setDefaultMemberPermissions(0)
    .addRoleOption((opt) =>
      opt
        .setName('role')
        .setDescription('Role to add/remove from XP')
        .setRequired(true)
    ),
  
  async execute(interaction) {
    try {
      const OWNER_ID = process.env.OWNER_ID;
      if (interaction.user.id !== OWNER_ID) {
        await interaction.reply({ content: '⛔ Owner only!', flags: MessageFlags.Ephemeral });
        return;
      }

      const role = interaction.options.getRole('role');
      if (!role) {
        await interaction.reply({ content: '❌ Invalid role', ephemeral: true });
        return;
      }

      if (xpRoles.includes(role.id)) {
        xpRoles = xpRoles.filter(r => r !== role.id);
        saveXpRoles(xpRoles);
        await interaction.reply({ 
          content: `✅ Removed ${role.name} from XP roles\n**Active roles:** ${xpRoles.length}`, 
          flags: MessageFlags.Ephemeral 
        });
        console.log(`Removed role ${role.name} (${role.id})`);
      } else {
        xpRoles.push(role.id);
        saveXpRoles(xpRoles);
        await interaction.reply({ 
          content: `✅ Added ${role.name} to XP roles\n**Active roles:** ${xpRoles.length}`, 
          flags: MessageFlags.Ephemeral 
        });
        console.log(`Added role ${role.name} (${role.id})`);
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
  
  getXpRoles: () => xpRoles,
  setXpRoles: (roles) => { xpRoles = roles; saveXpRoles(roles); },
  initializeRoles,
};

