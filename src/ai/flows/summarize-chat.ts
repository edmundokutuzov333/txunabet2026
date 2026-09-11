'use server';

/**
 * @fileOverview A flow to summarize a chat conversation.
 *
 * - summarizeChat - A function that takes a series of messages and returns a concise summary.
 * - SummarizeChatInput - The input type for the summarizeChat function.
 * - SummarizeChatOutput - The return type for the summarizeChat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChatMessageSchema = z.object({
  author: z.string().describe('The name of the person who sent the message.'),
  content: z.string().describe('The text content of the message.'),
});

const SummarizeChatInputSchema = z.object({
  messages: z.array(ChatMessageSchema).describe('The list of chat messages to summarize.'),
});
export type SummarizeChatInput = z.infer<typeof SummarizeChatInputSchema>;

const SummarizeChatOutputSchema = z.object({
  summary: z.string().describe('A concise, well-structured summary of the conversation highlighting key points, decisions, and action items. The response MUST be in Portuguese.'),
});
export type SummarizeChatOutput = z.infer<typeof SummarizeChatOutputSchema>;

export async function summarizeChat(input: SummarizeChatInput): Promise<SummarizeChatOutput> {
  return summarizeChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeChatPrompt',
  input: { schema: SummarizeChatInputSchema },
  output: { schema: SummarizeChatOutputSchema },
  prompt: `Você é OryonAI, um assistente de IA especialista em produtividade para a plataforma Oryon.

Sua tarefa é ler o histórico de uma conversa de chat e criar um resumo conciso e acionável.

Regras do Resumo:
- O resumo deve ser em Português.
- O tom deve ser profissional e direto.
- Estruture o resumo com os seguintes títulos (use markdown para negrito **):
  - **Pontos Chave:** Um ou dois parágrafos resumindo os tópicos principais da discussão.
  - **Decisões Tomadas:** Uma lista de todas as decisões importantes que foram finalizadas na conversa. Se não houver decisões, escreva "Nenhuma decisão tomada".
  - **Ações e Responsáveis:** Uma lista de tarefas ou ações mencionadas e quem é o responsável por cada uma. (Ex: "- [ ] @Maria Silva: Preparar os mockups da campanha.")
- Seja breve e foque-se apenas na informação mais crítica para alguém que precisa de se atualizar rapidamente.

Histórico da Conversa para Resumir:
{{#each messages}}
- {{author}}: {{content}}
{{/each}}

Agora, com base nesta conversa, gere o resumo.`,
});

const summarizeChatFlow = ai.defineFlow(
  {
    name: 'summarizeChatFlow',
    inputSchema: SummarizeChatInputSchema,
    outputSchema: SummarizeChatOutputSchema,
  },
  async input => {
    // Ensure we don't send an empty list of messages, which might confuse the model.
    if (!input.messages || input.messages.length === 0) {
      return { summary: 'Não há mensagens para resumir.' };
    }
    const { output } = await prompt(input);
    return output!;
  }
);
