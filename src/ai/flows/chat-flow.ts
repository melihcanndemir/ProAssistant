'use server';
/**
 * @fileOverview A simple chat AI agent.
 *
 * - chat - A function that handles the chat interaction.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type {GenerateResponse, StreamPart} from 'genkit';

const ChatInputSchema = z.object({
  message: z.string().describe('The user message to the AI.'),
  // Optional: Add history if needed for context
  // history: z.array(z.object({ role: z.enum(['user', 'model']), content: z.string() })).optional(),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  response: z.string().describe('The AI-generated response.'),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

const chatPrompt = ai.definePrompt({
  name: 'chatPrompt',
  input: {schema: ChatInputSchema},
  output: {schema: ChatOutputSchema},
  prompt: `You are ProAssistant, a friendly and helpful AI assistant.
  Your goal is to provide concise and accurate responses to the user's queries.
  Keep your answers to a few sentences unless more detail is specifically requested.

  User Message: {{{message}}}
  AI Response: `,
});

// Exported function for the client to call for streaming chat
export async function chat( 
  input: ChatInput
): Promise<{ 
  stream: AsyncIterableIterator<StreamPart<typeof ChatOutputSchema>>;
  response: Promise<GenerateResponse<z.infer<typeof ChatOutputSchema>>>;
}> {
  console.log('[AI CHAT STREAM FN] Received input:', JSON.stringify(input));
  const {stream, response} = chatPrompt.generateStream(input);
  return {stream, response};
}

// This 'chatFlow' const can be used for non-streaming scenarios or by Genkit tooling.
// The client-side streaming will use the 'chat' function above.
const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    console.log('[AI CHAT FLOW - NON-STREAMING] Received input:', JSON.stringify(input));
    const llmResponse = await chatPrompt(input); 
    console.log('[AI CHAT FLOW - NON-STREAMING] LLM response:', JSON.stringify(llmResponse));
    const output = llmResponse.output;

    if (!output || !output.response) {
      console.error("AI failed to produce valid output for chatFlow. Input:", input, "LLM Response:", llmResponse);
      return { response: "I'm sorry, I encountered an issue and couldn't generate a response at this moment." };
    }
    return output;
  }
);
