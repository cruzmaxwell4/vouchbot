require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const xpSystem = require('./xpSystem');

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

// Load every command file in ./commands automatically.
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  try {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.warn(`[WARNING] commands/${file} is missing a required "data" or "execute" export.`);
    }
  } catch (err) {
    console.error(`Error loading command ${file}:`, err);
  }
}

const XP_PER_MESSAGE = 0.5;

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Bot ready as ${readyClient.user.tag}`);
  
  // Register commands globally
  try {
    const commands = readyClient.commands.map((cmd) => cmd.data.toJSON());
    await readyClient.application.commands.set(commands);
    console.log(`✅ Registered ${commands.length} commands globally`);
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
});

// Handle interaction errors gracefully
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`No handler found for "/${interaction.commandName}".`);
    try {
      await interaction.reply({ content: 'Command not found.', ephemeral: true });
    } catch (err) {
      console.error('Failed to reply to command:', err);
    }
    return;
  }

  try {
    // Pass xpSystem to commands that need it
    command.xpSystem = xpSystem;
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error while executing /${interaction.commandName}:`, error);
    const errorReply = { content: '❌ Something went wrong running that command. Try again later.', ephemeral: true };
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorReply);
      } else {
        await interaction.reply(errorReply);
      }
    } catch (err) {
      console.error('Failed to send error reply:', err);
    }
  }
});

// XP tracking on message
client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild || message.guild.id !== process.env.OWNER_SERVER_ID) return;

    // Check if user has any XP roles
    const userRoles = message.member?.roles.cache.map(r => r.id) || [];
    const xpRoles = xpSystem.getXpRoles();
    const hasXpRole = userRoles.some(rid => xpRoles.includes(rid));

    if (hasXpRole) {
      xpSystem.addXp(message.author.id, XP_PER_MESSAGE);
      console.log(`✓ ${message.author.username} gained ${XP_PER_MESSAGE} XP`);
    }
  } catch (err) {
    console.error('Error in messageCreate handler:', err);
  }
});

// Auto leave guilds that aren't the owner's server
const OWNER_SERVER_ID = process.env.OWNER_SERVER_ID;
client.on(Events.GuildCreate, (guild) => {
  try {
    console.log(`Tried to join guild: ${guild.name} (${guild.id})`);
    if (guild.id !== OWNER_SERVER_ID) {
      guild.leave();
      console.log(`Left guild: ${guild.name}`);
    }
  } catch (err) {
    console.error('Error in guildCreate handler:', err);
  }
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', error => {
  console.error('Unhandled Promise Rejection:', error);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
});

// Graceful disconnect handler
client.on(Events.Warn, (warning) => {
  console.warn('Warning:', warning);
});

client.on('error', (error) => {
  console.error('Discord.js error:', error);
});

const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) throw new Error('DISCORD_BOT_TOKEN not set');

// Login with retry logic
async function login() {
  try {
    await client.login(TOKEN);
  } catch (err) {
    console.error('Failed to login, retrying in 10s...', err);
    setTimeout(login, 10000);
  }
}

login();

