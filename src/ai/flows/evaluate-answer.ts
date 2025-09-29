
'use server';
/**
 * @fileOverview This file defines a Genkit flow for providing AI-powered suggestions for evaluating a candidate's answer.
 *
 * - evaluateAnswer - A function that takes a question, answer, and marks, and returns AI-generated feedback and a suggested score.
 * - EvaluateAnswerInput - The input type for the evaluateAnswer function.
 * - EvaluateAnswerOutput - The return type for the evaluateAnswer function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const EvaluateAnswerInputSchema = z.object({
    questionText: z.string().describe('The text of the question.'),
    questionType: z.enum(['mcq', 'puzzle', 'paragraph', 'image-mcq', 'video-mcq']).describe('The type of the question.'),
    answer: z.string().describe("The candidate's answer."),
    marks: z.number().describe('The total marks for the question.'),
});

export type EvaluateAnswerInput = z.infer<typeof EvaluateAnswerInputSchema>;

const EvaluateAnswerOutputSchema = z.object({
    feedback: z.string().describe("Detailed feedback on the candidate's answer, highlighting correctness, code quality, time complexity (for puzzle), and adherence to rubrics."),
    suggestedScore: z.number().describe('A suggested score out of the total marks.'),
});

export type EvaluateAnswerOutput = z.infer<typeof EvaluateAnswerOutputSchema>;


export async function evaluateAnswer(input: EvaluateAnswerInput): Promise<EvaluateAnswerOutput> {
    return evaluateAnswerFlow(input);
}

const evaluateAnswerPrompt = ai.definePrompt({
    name: 'evaluateAnswerPrompt',
    input: { schema: EvaluateAnswerInputSchema },
    output: { schema: EvaluateAnswerOutputSchema },
    prompt: `You are an expert evaluator for technical and skill-based assessments. Your task is to provide a detailed evaluation of a candidate's answer to a given question.

    Question ({{questionType}}, {{marks}} marks):
    {{questionText}}

    Candidate's Answer:
    {{answer}}

    Based on the question and the candidate's answer, please provide:
    1. Detailed feedback:
        - For 'puzzle' questions: Analyze the correctness, time complexity, space complexity, and overall code quality (e.g., readability, best practices).
        - For 'paragraph' (descriptive) questions: Evaluate the answer based on correctness, clarity, and depth of explanation against standard criteria for the topic.
    2. A suggested score out of the total marks available for the question. The score should reflect the quality and correctness of the answer. Ensure the suggested score does not exceed the total marks.

    Be objective and constructive in your feedback.
    `,
});


const evaluateAnswerFlow = ai.defineFlow(
    {
        name: 'evaluateAnswerFlow',
        inputSchema: EvaluateAnswerInputSchema,
        outputSchema: EvaluateAnswerOutputSchema,
    },
    async (input) => {
        const { output } = await evaluateAnswerPrompt(input);
        
        if (output && output.suggestedScore > input.marks) {
            output.suggestedScore = input.marks;
        }

        return output!;
    }
);

    