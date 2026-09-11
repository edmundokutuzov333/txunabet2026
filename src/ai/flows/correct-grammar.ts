/**
 * @fileOverview A flow to correct grammar and spelling in a given text.
 *
 * - correctGrammar - A function that takes a string of text and returns the corrected version.
 * - CorrectGrammarInput - The input type for the correctGrammar function.
 * - CorrectGrammarOutput - The return type for the correctGrammar function.
 */

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CorrectGrammarInputSchema = z.object({
  text: z.string().describe('The text to be corrected.'),
});
export type CorrectGrammarInput = z.infer<typeof CorrectGrammarInputSchema>;

const CorrectGrammarOutputSchema = z.object({
  correctedText: z.string().describe('The grammatically corrected version of the text.'),
});
export type CorrectGrammarOutput = z.infer<typeof CorrectGrammarOutputSchema>;

export async function correctGrammar(input: CorrectGrammarInput): Promise<CorrectGrammarOutput> {
  return correctGrammarFlow(input);
}

const prompt = ai.definePrompt({
  name: 'correctGrammarPrompt',
  input: { schema: CorrectGrammarInputSchema },
  output: { schema: CorrectGrammarOutputSchema },
  prompt: `You are a language expert. Correct the grammar and spelling of the following text, but preserve the original meaning and tone. Only return the corrected text.

Text to correct:
"{{text}}"`,
});

const correctGrammarFlow = ai.defineFlow(
  {
    name: 'correctGrammarFlow',
    inputSchema: CorrectGrammarInputSchema,
    outputSchema: CorrectGrammarOutputSchema,
  },
  async input => {
    if (!input.text.trim()) {
      return { correctedText: '' };
    }
    const { output } = await prompt(input);
    return output!;
  }
);
