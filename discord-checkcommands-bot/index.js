require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

// Load every command file in ./commands automatically.
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[WARNING] commands/${file} is missing a required "data" or "execute" export.`);
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Bot ready as ${readyClient.user.tag}`);
  
  // Register commands globally
  try {
    const commands = client.commands.map((cmd) => cmd.data.toJSON());
    await client.application.commands.set(commands);
    console.log(`✅ Registered ${commands.length} commands globally`);
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`No handler found for "/${interaction.commandName}".`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error while executing /${interaction.commandName}:`, error);
    const errorReply = { content: 'Something went wrong running that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorReply);
    } else {
      await interaction.reply(errorReply);
    }
  }
});

// Auto leave guilds that aren't the owner's server
const OWNER_SERVER_ID = process.env.OWNER_SERVER_ID;
client.on(Events.GuildCreate, (guild) => {
  console.log(`Tried to join guild: ${guild.name} (${guild.id})`);
  if (guild.id !== OWNER_SERVER_ID) {
    guild.leave();
    console.log(`Left guild: ${guild.name}`);
  }
});

const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) throw new Error('DISCORD_BOT_TOKEN not set');

client.login(TOKEN);

