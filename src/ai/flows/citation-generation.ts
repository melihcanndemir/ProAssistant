'use server';

/**
 * @fileOverview AI agent for automatically generating citations for URLs and links included in user messages.
 *
 * - generateCitations - A function that handles the citation generation process.
 * - CitationGenerationInput - The input type for the generateCitations function.
 * - CitationGenerationOutput - The return type for the generateCitations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CitationGenerationInputSchema = z.object({
  message: z
    .string()
    .describe('The user message that may contain URLs or links.'),
});
export type CitationGenerationInput = z.infer<typeof CitationGenerationInputSchema>;

const CitationGenerationOutputSchema = z.object({
  citations: z.array(
    z.object({
      url: z.string().url().describe('The URL or link that was cited.'),
      citationText: z
        .string()
        .describe('The citation text for the URL or link.'),
    })
  ).describe('An array of citations generated from the message.'),
});
export type CitationGenerationOutput = z.infer<typeof CitationGenerationOutputSchema>;

export async function generateCitations(input: CitationGenerationInput): Promise<CitationGenerationOutput> {
  return citationGenerationFlow(input);
}

const citationPrompt = ai.definePrompt({
  name: 'citationPrompt',
  input: {schema: CitationGenerationInputSchema},
  output: {schema: CitationGenerationOutputSchema},
  prompt: `You are an AI assistant that generates citations for URLs and links found in a user message.

  Given the following message, extract all URLs and links, and generate a citation text for each.
  Return the citations as a JSON array.

  Message: {{{message}}}`,
});

const citationGenerationFlow = ai.defineFlow(
  {
    name: 'citationGenerationFlow',
    inputSchema: CitationGenerationInputSchema,
    outputSchema: CitationGenerationOutputSchema,
  },
  async input => {
    const {output} = await citationPrompt(input);
    return output!;
  }
);

//git
