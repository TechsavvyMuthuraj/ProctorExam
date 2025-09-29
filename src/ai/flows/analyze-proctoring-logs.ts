'use server';
/**
 * @fileOverview This file defines a Genkit flow for analyzing proctoring logs and flagging suspicious activities.
 *
 * - analyzeProctoringLogs - A function that takes proctoring logs as input and returns an analysis of suspicious activities.
 * - AnalyzeProctoringLogsInput - The input type for the analyzeProctoringLogs function.
 * - AnalyzeProctoringLogsOutput - The return type for the analyzeProctoringLogs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProctoringLogSchema = z.object({
  id: z.string().describe('The ID of the log entry.'),
  candidateId: z.string().describe('The ID of the candidate.'),
  testId: z.string().describe('The ID of the test.'),
  timestamp: z.string().describe('The timestamp of the event (ISO format).'),
  status: z
    .enum(['present', 'no_face', 'multiple_faces', 'tab_switch'])
    .describe('The status of the candidate during proctoring.'),
});

export type ProctoringLog = z.infer<typeof ProctoringLogSchema>;

const AnalyzeProctoringLogsInputSchema = z.object({
  logs: z.array(ProctoringLogSchema).describe('An array of proctoring log entries.'),
});
export type AnalyzeProctoringLogsInput = z.infer<typeof AnalyzeProctoringLogsInputSchema>;

const SuspiciousActivitySchema = z.object({
  candidateId: z.string().describe('The ID of the candidate involved.'),
  testId: z.string().describe('The ID of the test involved.'),
  reason: z.string().describe('The reason for flagging the activity as suspicious.'),
  timestamps: z.array(z.string()).describe('Timestamps of the suspicious events.'),
});

const AnalyzeProctoringLogsOutputSchema = z.object({
  summary: z.string().describe('A summary of the analysis of the proctoring logs.'),
  suspiciousActivities: z
    .array(SuspiciousActivitySchema)
    .describe('An array of suspicious activities identified in the logs.'),
});
export type AnalyzeProctoringLogsOutput = z.infer<typeof AnalyzeProctoringLogsOutputSchema>;

export async function analyzeProctoringLogs(input: AnalyzeProctoringLogsInput): Promise<AnalyzeProctoringLogsOutput> {
  return analyzeProctoringLogsFlow(input);
}

const analyzeProctoringLogsPrompt = ai.definePrompt({
  name: 'analyzeProctoringLogsPrompt',
  input: {schema: AnalyzeProctoringLogsInputSchema},
  output: {schema: AnalyzeProctoringLogsOutputSchema},
  prompt: `You are an AI assistant that analyzes proctoring logs from online tests to identify potential cheating incidents.

  You are provided with an array of proctoring logs, each containing the candidate ID, test ID, timestamp, and status (present, no_face, multiple_faces, tab_switch).

  Your task is to analyze these logs and identify any suspicious activities, such as:

  1.  A candidate frequently disappearing from the camera (no_face status).
  2.  The presence of multiple faces in the camera (multiple_faces status), which could indicate assistance from others.
  3.  The candidate switching to another browser tab or application (tab_switch status).

  For each suspicious activity, provide the candidate ID, test ID, a clear reason for flagging the activity as suspicious, and the timestamps of the events.

  Also, provide a concise summary of your analysis.

  Here are the proctoring logs:
  {{#each logs}}
  - Candidate ID: {{{candidateId}}}, Test ID: {{{testId}}}, Timestamp: {{{timestamp}}}, Status: {{{status}}}
  {{/each}}

  Ensure that the output is structured according to the AnalyzeProctoringLogsOutputSchema, including a summary and an array of suspicious activities with reasons and timestamps.
  `,
});

const analyzeProctoringLogsFlow = ai.defineFlow(
  {
    name: 'analyzeProctoringLogsFlow',
    inputSchema: AnalyzeProctoringLogsInputSchema,
    outputSchema: AnalyzeProctoringLogsOutputSchema,
  },
  async input => {
    const {output} = await analyzeProctoringLogsPrompt(input);
    return output!;
  }
);
