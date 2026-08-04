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

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  try {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    }
  } catch (err) {
    console.error(`Error loading ${file}:`, err.message);
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Bot ready as ${readyClient.user.tag}`);
  
  try {
    const commands = readyClient.commands.map((cmd) => cmd.data.toJSON());
    await readyClient.application.commands.set(commands);
    console.log(`✅ Registered ${commands.length} commands`);
  } catch (error) {
    console.error('Register error:', error.message);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error in ${interaction.commandName}:`, error.message);
    const msg = { content: '❌ Error', ephemeral: true };
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    } catch (e) {
      console.error('Reply error:', e.message);
    }
  }
});

client.on(Events.GuildCreate, (guild) => {
  try {
    if (guild.id !== process.env.OWNER_SERVER_ID) {
      guild.leave();
    }
  } catch (err) {
    console.error('Guild error:', err.message);
  }
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled:', error?.message || error);
});

process.on('uncaughtException', (error) => {
  console.error('Exception:', error?.message || error);
});

client.on(Events.Warn, (w) => console.warn('Warn:', w));
client.on('error', (e) => console.error('Error:', e?.message));

const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) throw new Error('DISCORD_BOT_TOKEN not set');

async function login() {
  try {
    await client.login(TOKEN);
  } catch (err) {
    console.error('Login failed, retry in 10s...', err.message);
    setTimeout(login, 10000);
  }
}

login();

