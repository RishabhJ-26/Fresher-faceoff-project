
'use server';
/**
 * @fileOverview Generates interview questions based on a topic.
 *
 * - generateInterviewQuestions - Function to generate interview questions.
 * - GenerateInterviewQuestionsInput - Input type for the function.
 * - GenerateInterviewQuestionsOutput - Output type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateInterviewQuestionsInputSchema = z.object({
  topic: z.string().describe('The topic or category for the interview questions (e.g., "Software Engineering", "Behavioral questions for a product manager").'),
  numQuestions: z.number().optional().default(5).describe('The number of questions to generate.'),
});
export type GenerateInterviewQuestionsInput = z.infer<typeof GenerateInterviewQuestionsInputSchema>;

const GenerateInterviewQuestionsOutputSchema = z.object({
  questions: z.array(z.string()).describe('A list of generated interview questions.'),
});
export type GenerateInterviewQuestionsOutput = z.infer<typeof GenerateInterviewQuestionsOutputSchema>;

export async function generateInterviewQuestions(input: GenerateInterviewQuestionsInput): Promise<GenerateInterviewQuestionsOutput> {
  return generateInterviewQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInterviewQuestionsPrompt',
  input: { schema: GenerateInterviewQuestionsInputSchema },
  output: { schema: GenerateInterviewQuestionsOutputSchema },
  prompt: `You are an expert interview coach. Generate {{numQuestions}} insightful and practical interview questions related to the following topic: "{{topic}}".

Focus on questions that would be suitable for a mock interview setting for freshers or early-career professionals.
The questions should encourage detailed responses and reveal the candidate's thinking process.
Avoid overly simple yes/no questions.

Return the questions as a list of strings.
`,
});

const generateInterviewQuestionsFlow = ai.defineFlow(
  {
    name: 'generateInterviewQuestionsFlow',
    inputSchema: GenerateInterviewQuestionsInputSchema,
    outputSchema: GenerateInterviewQuestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        // Throw an error or return a default response if the model doesn't provide output
        // For example, you could return an empty list of questions or a specific error message.
        console.error("AI model did not return an output for generateInterviewQuestionsPrompt with input:", input);
        // Returning an empty list of questions as a fallback
        return { questions: ["Error: Could not generate questions at this time. Please try a different topic or try again later."] };
    }
    return output;
  }
);

