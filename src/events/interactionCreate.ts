import { MessageFlags, type BaseInteraction } from 'discord.js';
import { loadCommands } from '../commands/registry.js';
import { handleButton } from '../handlers/index.js';
import { handleSelectMenu } from '../handlers/selectMenus/index.js';
import { handleModal } from '../handlers/modals/index.js';
import { logger } from '../utils/logger.js';
import { errorEmbed } from '../utils/embeds.js';

const commands = await loadCommands();

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction: BaseInteraction) {
    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }

    if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModal(interaction);
      return;
    }

    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (!command) {
        await interaction.reply({
          embeds: [errorEmbed('Bilinmeyen komut', 'Bu komut bulunamadı. Komutlar yeniden kaydedilmiş olabilir.')],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        logger.error(`Komut hatası (/${interaction.commandName}):`, error);
        const message = 'Bir şeyler ters gitti. Lütfen tekrar deneyin.';
        if (interaction.deferred) {
          await interaction.editReply({ embeds: [errorEmbed('Hata', message)] });
        } else if (!interaction.replied) {
          await interaction.reply({ embeds: [errorEmbed('Hata', message)], flags: MessageFlags.Ephemeral });
        }
      }
    }
  },
};