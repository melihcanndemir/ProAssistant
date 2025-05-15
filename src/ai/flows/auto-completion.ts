// Auto-completion flow to provide real-time suggestions as the user types.

'use server';

/**
 * @fileOverview An AI agent that provides auto-completion suggestions for user input.
 *
 * - autoComplete - A function that handles the auto-completion process.
 * - AutoCompleteInput - The input type for the autoComplete function.
 * - AutoCompleteOutput - The return type for the autoComplete function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutoCompleteInputSchema = z.object({
  text: z.string().describe('The current text input from the user.'),
});
export type AutoCompleteInput = z.infer<typeof AutoCompleteInputSchema>;

const AutoCompleteOutputSchema = z.object({
  suggestion: z.string().describe('The auto-completion suggestion.'),
});
export type AutoCompleteOutput = z.infer<typeof AutoCompleteOutputSchema>;

export async function autoComplete(input: AutoCompleteInput): Promise<AutoCompleteOutput> {
  return autoCompleteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'autoCompletePrompt',
  input: {schema: AutoCompleteInputSchema},
  output: {schema: AutoCompleteOutputSchema},
  prompt: `You are an AI assistant that provides auto-completion suggestions based on the user's input.

  Suggest the most likely next word or phrase to complete the user's input.

  Input: {{{text}}}
  Suggestion: `,
});

const autoCompleteFlow = ai.defineFlow(
  {
    name: 'autoCompleteFlow',
    inputSchema: AutoCompleteInputSchema,
    outputSchema: AutoCompleteOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
