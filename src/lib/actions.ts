'use server';

import { analyzeProctoringLogs, type ProctoringLog } from '@/ai/flows/analyze-proctoring-logs';
import { evaluateAnswer, type EvaluateAnswerInput } from '@/ai/flows/evaluate-answer';
import { generateCompanyMotto } from '@/ai/flows/generate-company-motto';
import { parseMcqQuestions, type McqParserInput } from '@/ai/flows/parse-mcq-flow';
import { z } from 'zod';

const proctoringLogSchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  testId: z.string(),
  timestamp: z.string(),
  status: z.enum(['present', 'no_face', 'multiple_faces', 'tab_switch']),
});

const proctoringLogsSchema = z.array(proctoringLogSchema);


export async function getAnalysis(logs: Omit<ProctoringLog, 'id'>[]) {
  // Validate input with Zod. This is a good practice for server actions.
  const logsWithIds = logs.map((log, index) => ({ ...log, id: `log-${index}` }));
  const validatedLogs = proctoringLogsSchema.safeParse(logsWithIds);

  if (!validatedLogs.success) {
    return { error: 'Invalid log format.' };
  }

  try {
    const analysis = await analyzeProctoringLogs({ logs: validatedLogs.data });
    return { data: analysis };
  } catch (error) {
    console.error('Error analyzing logs:', error);
    return { error: 'Failed to analyze logs.' };
  }
}

const evaluateAnswerInputSchema = z.object({
    questionText: z.string(),
    questionType: z.enum(['mcq', 'coding', 'paragraph', 'image', 'audio']),
    answer: z.string(),
    marks: z.number(),
});

export async function getAIEvaluation(input: EvaluateAnswerInput) {
    const validatedInput = evaluateAnswerInputSchema.safeParse(input);

    if (!validatedInput.success) {
        return { error: 'Invalid input format.' };
    }
    
    try {
        const evaluation = await evaluateAnswer(validatedInput.data);
        return { data: evaluation };
    } catch (error) {
        console.error('Error getting AI evaluation:', error);
        return { error: 'Failed to get AI evaluation.' };
    }
}

const companyMottoInputSchema = z.string();

export async function getCompanyMotto(companyName: string) {
    const validatedInput = companyMottoInputSchema.safeParse(companyName);

    if (!validatedInput.success) {
        return { error: 'Invalid input format.' };
    }

    try {
        const motto = await generateCompanyMotto(validatedInput.data);
        return { data: motto };
    } catch(error) {
        console.error('Error generating company motto:', error);
        return { error: 'Failed to generate company motto.' };
    }
}

const bulkQuestionsInputSchema = z.string();

export async function processBulkQuestions(input: string) {
  const validatedInput = bulkQuestionsInputSchema.safeParse(input);

  if (!validatedInput.success) {
    return { error: 'Invalid input format. Expected a raw string.'};
  }

  try {
    const result = await parseMcqQuestions(validatedInput.data as McqParserInput);
    return { data: result };
  } catch(error) {
    console.error('Error processing bulk questions:', error);
    return { error: 'Failed to process questions using AI.'};
  }
}
