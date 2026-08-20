import { readdirSync, statSync } from 'fs';
import { join } from 'path';

import {
  Client,
  REST,
  Routes,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js';
import { Config } from 'src/lib/config/config';
import { logger } from 'src/lib/logger';
import { SlashCommand } from 'typings/command';

module.exports = (client: Client) => {
  const slashCommands: (SlashCommandBuilder | SlashCommandOptionsOnlyBuilder)[] =
    [];

  const baseCommandsDir = join(__dirname, '../commands');

  const loadCommand = (file: string) => {
    const loaded = require(file);
    const command: SlashCommand = loaded.default ?? loaded.command ?? loaded;
    slashCommands.push(command.command);
    client.commands.set(command.command.name, command);
  };

  // Load slash commands from root commands dir and subdirectories
  const commandDirs = readdirSync(baseCommandsDir)
    .map((file) => join(baseCommandsDir, file))
    .filter((file) => {
      const isDirectory = statSync(file).isDirectory();
      if (!isDirectory && (file.endsWith('.js') || file.endsWith('.ts'))) {
        loadCommand(file);
      }
      return isDirectory;
    });

  commandDirs.forEach((commandsDir) => {
    readdirSync(commandsDir).forEach((file) => {
      if (!file.endsWith('.js') && !file.endsWith('.ts')) return;
      loadCommand(`${commandsDir}/${file}`);
    });
  });

  const rest = new REST({ version: '10' }).setToken(Config.token!);

  rest
    .put(Routes.applicationCommands(Config.clientId!), {
      body: slashCommands.map((command) => command.toJSON()),
    })
    .then((data) => {
      logger.info(`Successfully loaded ${(data as unknown[]).length} command(s)`);
    })
    .catch((error) => {
      logger.error(error);
    });
};
