'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a company motto.
 *
 * - generateCompanyMotto - A function that takes a company name and returns a generated motto.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateCompanyMottoInputSchema = z.string().describe('The name of the company.');
export type GenerateCompanyMottoInput = z.infer<typeof GenerateCompanyMottoInputSchema>;

const GenerateCompanyMottoOutputSchema = z.string().describe('A short, catchy motto for the company.');

export async function generateCompanyMotto(companyName: GenerateCompanyMottoInput): Promise<string> {
    return generateCompanyMottoFlow(companyName);
}

const mottoPrompt = ai.definePrompt({
  name: 'generateCompanyMottoPrompt',
  input: { schema: GenerateCompanyMottoInputSchema },
  output: { schema: GenerateCompanyMottoOutputSchema },
  prompt: `You are a branding expert. Generate a short, catchy, and inspiring motto for the following tech company: {{{text}}}`,
});

const generateCompanyMottoFlow = ai.defineFlow(
  {
    name: 'generateCompanyMottoFlow',
    inputSchema: GenerateCompanyMottoInputSchema,
    outputSchema: GenerateCompanyMottoOutputSchema,
  },
  async (companyName) => {
    const { output } = await mottoPrompt(companyName);
    return output!;
  }
);
