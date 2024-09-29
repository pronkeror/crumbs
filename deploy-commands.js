const { REST, Routes } = require('discord.js');
require('dotenv').config();
const { clientId, token, guildId } = process.env;
const fs = require('node:fs');
const path = require('node:path');

const globalCommands = [];
const guildCommands = [];

// Grab all the command folders from the commands directory
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// Load commands from the command files
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            // Ensure the command name is unique
            if (!globalCommands.some(cmd => cmd.name === command.data.name) && !guildCommands.some(cmd => cmd.name === command.data.name)) {
                if (command.guildcommand) {
                    guildCommands.push(command.data.toJSON());
                } else {
                    globalCommands.push(command.data.toJSON());
                }
            } else {
                console.log(`[WARNING] Duplicate command name: ${command.data.name}`);
            }
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// Function to delete commands from Discord that don't exist locally
async function deleteRemovedCommands(existingCommands, localCommands) {
    const existingCommandNames = existingCommands.map(cmd => cmd.name);
    const localCommandNames = localCommands.map(cmd => cmd.name);

    const commandsToDelete = existingCommands.filter(cmd => !localCommandNames.includes(cmd.name));

    for (const command of commandsToDelete) {
        try {
            await rest.delete(Routes.applicationCommand(clientId, command.id));
            console.log(`Deleted command: ${command.name}`);
        } catch (error) {
            console.error(`Error deleting command ${command.name}:`, error);
        }
    }
}

// Deploy commands and handle deletions
(async () => {
    try {
        console.log(`Started refreshing ${globalCommands.length} global application (/) commands and ${guildCommands.length} guild-specific commands.`);

        // Fetch existing global commands from Discord
        const existingGlobalCommands = await rest.get(Routes.applicationCommands(clientId));
        
        // Delete any global commands that no longer exist locally
        await deleteRemovedCommands(existingGlobalCommands, globalCommands);
        
        // Update global commands on Discord
        const globalData = await rest.put(
            Routes.applicationCommands(clientId),
            { body: globalCommands },
        );
        console.log(`Successfully reloaded ${globalData.length} global application (/) commands.`);

        // Fetch existing guild-specific commands from Discord
        const existingGuildCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
        
        // Delete any guild commands that no longer exist locally
        await deleteRemovedCommands(existingGuildCommands, guildCommands);

        // Update guild-specific commands on Discord
        const guildData = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: guildCommands },
        );
        console.log(`Successfully reloaded ${guildData.length} guild-specific application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();
