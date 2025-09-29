'use server';
/**
 * @fileOverview This file defines a Genkit flow for parsing a raw text of multiple-choice questions
 * into a structured format.
 *
 * - parseMcqQuestions - A function that takes a raw string of questions and returns a structured array.
 * - McqParserInput - The input type for the parseMcqQuestions function.
 * - McqParserOutput - The return type for the parseMcqQuestions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const McqParserInputSchema = z.string().describe('A raw string containing multiple-choice questions and their options.');

export type McqParserInput = z.infer<typeof McqParserInputSchema>;

const ParsedQuestionSchema = z.object({
    questionText: z.string().describe('The main text of the question.'),
    options: z.array(z.string()).describe('An array of possible answers.'),
    answer: z.string().describe('The correct answer from the options.'),
    marks: z.number().describe('The marks for the question, default to 10.'),
});

const McqParserOutputSchema = z.object({
    questions: z.array(ParsedQuestionSchema).describe('An array of parsed question objects.')
});

export type McqParserOutput = z.infer<typeof McqParserOutputSchema>;

export async function parseMcqQuestions(input: McqParserInput): Promise<McqParserOutput> {
    return parseMcqFlow(input);
}

const parseMcqPrompt = ai.definePrompt({
    name: 'parseMcqPrompt',
    input: { schema: McqParserInputSchema },
    output: { schema: McqParserOutputSchema },
    prompt: `You are an expert data parser specializing in Multiple-Choice Questions (MCQs). You will be given a raw string that may contain a mix of text, but your job is to find and structure only the MCQs.

Your task is to parse the string and convert it into a structured JSON object containing an array of questions. For each question you find, you MUST identify:
1.  The question text. Questions are usually numbered (e.g., "Q1.", "1)", "Question 1:") or start a new paragraph.
2.  The list of options. Options are typically lettered (a, b, c) or numbered (1, 2, 3) and may or may not have parentheses or dots.
3.  The correct answer. First, look for an explicit answer key (e.g., "Answer: C", "Correct answer is B"). If no explicit key is found for a question, you MUST use your own knowledge to determine the correct answer from the provided options. The answer you provide must exactly match one of the options you extracted.
4.  Assign a default of 10 marks to each question.

Ignore any text that does not appear to be part of an MCQ.

Here is the text you need to parse:
{{{text}}}

Please provide the output in the specified JSON format.
`,
});

const parseMcqFlow = ai.defineFlow(
    {
        name: 'parseMcqFlow',
        inputSchema: McqParserInputSchema,
        outputSchema: McqParserOutputSchema,
    },
    async (text) => {
        const { output } = await parseMcqPrompt(text);
        return output!;
    }
);
