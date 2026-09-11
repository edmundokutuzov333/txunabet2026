
'use server';
/**
 * @fileOverview A flow to generate a predictive and personalized daily briefing for a user.
 *
 * - getDailyBriefing - A function that analyzes user's tasks and meetings and provides a summary.
 * - DailyBriefingInput - The input type for the getDailyBriefing function.
 * - DailyBriefingOutput - The return type for the getDailyBriefing function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TaskSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  priority: z.string(),
  dueDate: z.string(),
});

const MeetingSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  date: z.string(),
  time: z.string(),
  duration: z.number(),
});

const DailyBriefingInputSchema = z.object({
  userName: z.string().describe('The name of the user.'),
  tasks: z.array(TaskSchema).describe('A list of the user\'s tasks for today.'),
  meetings: z.array(MeetingSchema).describe('A list of the user\'s meetings for today.'),
});
export type DailyBriefingInput = z.infer<typeof DailyBriefingInputSchema>;

const DailyBriefingOutputSchema = z.object({
  briefing: z.string().describe('A personalized and proactive daily briefing for the user, written in a helpful and slightly informal tone. It should highlight priorities, potential connections between tasks and meetings, and offer suggestions. The response MUST be in Portuguese.'),
});
export type DailyBriefingOutput = z.infer<typeof DailyBriefingOutputSchema>;

export async function getDailyBriefing(input: DailyBriefingInput): Promise<DailyBriefingOutput> {
  return getDailyBriefingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dailyBriefingPrompt',
  input: { schema: DailyBriefingInputSchema },
  output: { schema: DailyBriefingOutputSchema },
  prompt: `És a OryonAI, a assistente da plataforma Txuna Bet. A tua tarefa é gerar um resumo diário curto, proativo e motivador (máximo 3-4 frases) para o utilizador {{userName}}. Com base no contexto que te forneço, cria um briefing personalizado.

Regras do Resumo:
- O tom deve ser profissional, mas amigável e encorajador. Trata o utilizador pelo nome.
- Sê conciso e direto ao ponto. Usa parágrafos curtos.
- NÃO listes todas as tarefas e reuniões. Em vez disso, sintetiza os pontos mais importantes.
- Identifica as prioridades do dia (tarefas com prioridade 'urgent' ou 'high').
- Encontra sinergias. Se uma tarefa está relacionada com uma reunião, menciona isso. (Ex: "Vejo que tens a tarefa 'X', que é perfeita para preparar a tua reunião 'Y' à tarde.")
- Termina com uma nota positiva e motivacional.
- A resposta deve ser SEMPRE em Português.

Contexto do Utilizador para Hoje:

Tarefas Pendentes:
{{#if tasks}}
{{#each tasks}}
- Título: {{title}} (Prioridade: {{priority}}, Prazo: {{dueDate}})
{{/each}}
{{else}}
Nenhuma tarefa pendente para hoje.
{{/if}}

Reuniões Agendadas para Hoje:
{{#if meetings}}
{{#each meetings}}
- Título: {{title}} (Hora: {{time}}, Duração: {{duration}} min)
{{/each}}
{{else}}
Nenhuma reunião agendada para hoje.
{{/if}}

Agora, com base nesta informação, gera o resumo diário para {{userName}}.`,
});


const getDailyBriefingFlow = ai.defineFlow(
  {
    name: 'getDailyBriefingFlow',
    inputSchema: DailyBriefingInputSchema,
    outputSchema: DailyBriefingOutputSchema,
  },
  async input => {
    // If there's nothing to report, return a friendly message.
    if (input.tasks.length === 0 && input.meetings.length === 0) {
      return { briefing: `Bom dia, ${input.userName}! Parece que tem um dia tranquilo pela frente. Sem tarefas ou reuniões urgentes. Aproveite para planear a sua semana!` };
    }
    
    const { output } = await prompt(input);
    return output!;
  }
);

    