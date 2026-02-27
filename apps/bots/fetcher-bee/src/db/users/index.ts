import KeyvSqlite from '@keyv/sqlite';
import Keyv from 'keyv';
import { UserRole } from 'src/lib/config/config';
import { logger } from 'src/lib/logger';
import { CubeSelectionHistory } from 'typings/cube';

export type UserInfo = {
  discordId: string;
};

export const users = new Keyv<UserInfo>({
  store: new KeyvSqlite('sqlite://src/db/users/users.sqlite')
});

export type DiscordModInfo = {
  discordID: string;
  role: UserRole;
};

export const discordMods = new Keyv<DiscordModInfo>({
  store: new KeyvSqlite('sqlite://src/db/users/discordMods.sqlite')
});

export type CommandUsageInfo = {
  commandName: string;
  count: number;
};

export type UserCommandUsageInfo = {
  discordId: string;
  count: number;
};

export const commandCountDB = new Keyv({
  store: new KeyvSqlite('sqlite://src/db/users/commands.sqlite')
});
export const userCountDB = new Keyv({
  store: new KeyvSqlite('sqlite://src/db/users/user_commands.sqlite')
});

// Cube selection tracking databases
export const cubeHistoryDB = new Keyv<CubeSelectionHistory>({
  store: new KeyvSqlite('sqlite://src/db/users/cube_history.sqlite')
});
export const cubeIndexDB = new Keyv<string[]>({
  store: new KeyvSqlite('sqlite://src/db/users/cube_index.sqlite')
}); // Stores array of selection IDs per cube

users.on('error', (err) => logger.error('Keyv connection error:', err));
discordMods.on('error', (err) => logger.error('Keyv connection error:', err));
commandCountDB.on('error', (err) =>
  logger.error('Keyv connection error (commandCountDB):', err),
);
userCountDB.on('error', (err) =>
  logger.error('Keyv connection error (userCountDB):', err),
);
cubeHistoryDB.on('error', (err) =>
  logger.error('Keyv connection error (cubeHistoryDB):', err),
);
cubeIndexDB.on('error', (err) =>
  logger.error('Keyv connection error (cubeIndexDB):', err),
);
