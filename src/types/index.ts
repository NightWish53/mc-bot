import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export type SlashCommandData = Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;

export interface Command {
  data: SlashCommandData;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}