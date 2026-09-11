'use server';

/**
 * @fileOverview Summarizes the content of a webpage using AI.
 *
 * - `summarizePage` - A function that accepts a URL and returns a summary of the page.
 * - `SummarizePageInput` - The input type for the `summarizePage` function.
 * - `SummarizePageOutput` - The return type for the `summarizePage` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizePageInputSchema = z.object({
  url: z.string().describe('The URL of the page to summarize.'),
});
export type SummarizePageInput = z.infer<typeof SummarizePageInputSchema>;

const SummarizePageOutputSchema = z.object({
  summary: z.string().describe('A summary of the page content.'),
});
export type SummarizePageOutput = z.infer<typeof SummarizePageOutputSchema>;

export async function summarizePage(input: SummarizePageInput): Promise<SummarizePageOutput> {
  return summarizePageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizePagePrompt',
  input: {schema: SummarizePageInputSchema},
  output: {schema: SummarizePageOutputSchema},
  prompt: `Summarize the content of the following webpage:\n\nURL: {{{url}}}`,
});

const summarizePageFlow = ai.defineFlow(
  {
    name: 'summarizePageFlow',
    inputSchema: SummarizePageInputSchema,
    outputSchema: SummarizePageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
