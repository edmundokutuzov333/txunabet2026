
'use server';

/**
 * @fileOverview A general-purpose, multi-modal chat flow that maintains conversation history.
 *
 * - `chat` - A function that takes a prompt, optional image, and history, and returns the AI's response.
 * - `ChatInput` - The input type for the chat function.
 * - `ChatOutput` - The return type for the chat function.
 * - `ChatMessage` - A single message in the chat history.
 * - `ChatHistory` - An array of chat messages.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MessageData } from 'genkit/ai';
import { googleAI } from '@genkit-ai/google-genai';

// Define the schema for a single chat message part (can be text or media)
const ChatMessageContentSchema = z.object({
  text: z.string().optional(),
  media: z.object({
    contentType: z.string(),
    url: z.string(),
  }).optional(),
});
export type ChatMessageContent = z.infer<typeof ChatMessageContentSchema>;

// Define the schema for a single chat message
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.array(ChatMessageContentSchema),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// Define the schema for chat history
const ChatHistorySchema = z.array(ChatMessageSchema);
export type ChatHistory = z.infer<typeof ChatHistorySchema>;

// Define the input schema for the chat flow
const ChatInputSchema = z.object({
  prompt: z.string().describe("The user's latest text message."),
  imageUrl: z.string().optional().describe("A data URI of an image uploaded by the user."),
  history: ChatHistorySchema.optional().describe('The conversation history.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

// Define the output schema for the chat flow
const ChatOutputSchema = z.object({
  response: z.string().describe("The AI model's response text."),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

export async function chat(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}

const systemPrompt = `Você é OryonAI, um assistente de IA especialista integrado na plataforma de gestão 'Oryon' da Txuna Bet.

Sua identidade:
- Você é profissional, rápido e conhecedor do mundo das apostas desportivas.
- Sua função principal é ajudar os funcionários da Txuna Bet (Traders, Gestores de Risco, Marketing) a serem mais produtivos, respondendo a perguntas, fornecendo dados, resumindo informações e analisando padrões de apostas.
- Você se comunica PRIMARIAMENTE em Português. Só use outros idiomas se for explicitamente solicitado pelo usuário.

Suas diretrizes de resposta:
- Forneça respostas claras, concisas e orientadas a dados.
- EVITE o uso excessivo de markdown. O objetivo é um texto limpo e legível.
- Baseie suas respostas no contexto da conversa e nos dados fornecidos.
- Quando receber uma imagem (ex: um gráfico de performance de um mercado), analise-a conforme solicitado.

Contexto da Plataforma:
A plataforma Oryon é o centro de comando para todas as operações da Txuna Bet, incluindo gestão de mercados (Sportsbook), análise de risco, gestão de utilizadores e automação de marketing. Você tem acesso a informações sobre eventos desportivos, odds, limites de aposta e atividade dos jogadores. Use esse conhecimento para fornecer respostas contextuais quando apropriado.
`;

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async ({ prompt, history, imageUrl }) => {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable not set. Please check your .env file.');
    }

    // Convert the incoming history to the format Genkit's model expects
    const genkitMessages: MessageData[] = history
      ? history.map((msg) => ({
          role: msg.role,
          content: msg.content.map(c => {
            if (c.media) {
                return { media: { contentType: c.media.contentType, url: c.media.url } };
            }
            return { text: c.text || '' };
          }),
        }))
      : [];
      
    const userPrompt: MessageData[] = [{
        role: 'user',
        content: [{text: prompt}]
    }];

    if (imageUrl) {
        const mimeType = imageUrl.match(/data:(.*);base64,/)?.[1] || 'image/jpeg';
        userPrompt[0].content.push({ media: { url: imageUrl, contentType: mimeType } });
    }

    const response = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      system: systemPrompt,
      history: genkitMessages,
      prompt: userPrompt[0].content,
    });

    const responseText = response.text;
    if (responseText === undefined) {
      throw new Error("The model did not return a text response.");
    }

    return {
      response: responseText,
    };
  }
);
