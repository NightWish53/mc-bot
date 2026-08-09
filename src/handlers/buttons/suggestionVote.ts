import type { ButtonInteraction } from 'discord.js';
import { handleSuggestionVote } from '../../services/suggestion.service.js';

export default [
  {
    customIdPrefix: 'suggestion_upvote',
    async run(interaction: ButtonInteraction): Promise<void> {
      await handleSuggestionVote(interaction, 'upvote');
    },
  },
  {
    customIdPrefix: 'suggestion_downvote',
    async run(interaction: ButtonInteraction): Promise<void> {
      await handleSuggestionVote(interaction, 'downvote');
    },
  },
];
