require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessages,
  ],
  failIfNotExists: false,
});

client.commands = new Collection();

// ===== SHARED STATE (XP System) =====
const xpState = {
  data: {},
  roles: [],
  excludeChannels: [],
  resetTimer: null,
  resetTimestamp: null,
};

client.xpState = xpState; // Attach to client so all commands can access it

// ===== LOAD COMMANDS =====
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  try {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.warn(`[WARNING] commands/${file} missing "data" or "execute".`);
    }
  } catch (err) {
    console.error(`Error loading command ${file}:`, err.message);
  }
}

const XP_PER_MESSAGE = 0.5;

// ===== BOT READY =====
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Bot ready as ${readyClient.user.tag}`);
  
  try {
    const commands = readyClient.commands.map((cmd) => cmd.data.toJSON());
    await readyClient.application.commands.set(commands);
    console.log(`✅ Registered ${commands.length} commands globally`);
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
});

// ===== HANDLE COMMANDS =====
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`No handler for /${interaction.commandName}`);
    try {
      await interaction.reply({ content: 'Command not found.', ephemeral: true });
    } catch (err) {
      console.error('Error replying:', err.message);
    }
    return;
  }

  try {
    command.xpState = xpState;
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing /${interaction.commandName}:`, error.message);
    const errorMsg = { content: '❌ Error running command', ephemeral: true };
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMsg);
      } else {
        await interaction.reply(errorMsg);
      }
    } catch (err) {
      console.error('Error sending error reply:', err.message);
    }
  }
});

// ===== XP TRACKING =====
client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot || !message.guild) return;
    if (message.guild.id !== process.env.OWNER_SERVER_ID) return;

    // Check if channel is excluded
    if (xpState.excludeChannels.includes(message.channelId)) {
      return;
    }

    // Check if user has XP role
    const userRoles = message.member?.roles.cache.map(r => r.id) || [];
    const hasXpRole = userRoles.some(rid => xpState.roles.includes(rid));

    if (hasXpRole) {
      xpState.data[message.author.id] = (xpState.data[message.author.id] || 0) + XP_PER_MESSAGE;
      console.log(`✓ ${message.author.username} +${XP_PER_MESSAGE} XP`);
    }
  } catch (err) {
    console.error('Error in message handler:', err.message);
  }
});

// ===== AUTO-LEAVE NON-OWNER GUILDS =====
client.on(Events.GuildCreate, (guild) => {
  try {
    if (guild.id !== process.env.OWNER_SERVER_ID) {
      guild.leave();
      console.log(`Left guild: ${guild.name}`);
    }
  } catch (err) {
    console.error('Error in guildCreate:', err.message);
  }
});

// ===== GLOBAL ERROR HANDLERS =====
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error?.message || error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error?.message || error);
});

client.on(Events.Warn, (warning) => {
  console.warn('Discord warning:', warning);
});

client.on('error', (error) => {
  console.error('Discord error:', error?.message || error);
});

// ===== LOGIN =====
const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) throw new Error('DISCORD_BOT_TOKEN not set');

async function login() {
  try {
    await client.login(TOKEN);
  } catch (err) {
    console.error('Login failed, retrying in 10s...', err.message);
    setTimeout(login, 10000);
  }
}

login();

