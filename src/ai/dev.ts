'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-proctoring-logs.ts';
import '@/ai/flows/evaluate-answer.ts';
import '@/ai/flows/generate-company-motto.ts';
import '@/ai/flows/parse-mcq-flow.ts';
