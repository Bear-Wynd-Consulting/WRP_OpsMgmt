
// src/ai/flows/clean-data-flow.ts
'use server';
/**
 * @fileOverview A flow for cleaning and standardizing data entries using Claude.
 *
 * - cleanDataFlow - A function that takes a data entry and returns a cleaned version.
 * - CleanDataInput - The input type for the cleanDataFlow function (currently DataEntry).
 * - CleanDataOutput - The return type for the cleanDataFlow function (DataEntry without id).
 */

import { anthropic } from '@/ai/ai-instance';
import type { DataEntry } from '@/services/types';
import { z } from 'zod';

// Define a flexible schema for input, including the string 'id'
const DataEntryInputSchema = z.record(z.string(), z.any())
    .refine((data): data is DataEntry => typeof data.id === 'string', { message: "Input must have a string 'id' field." })
    .describe('A flexible data entry object with string keys and any value types, requiring a string id.');

// Define a flexible schema for output, which excludes 'id'
const DataEntryOutputSchema = z.record(z.string(), z.any())
    .describe('A flexible data entry object representing the cleaned data, excluding the id.');

export type CleanDataInput = z.infer<typeof DataEntryInputSchema>;
// The output type represents the data *excluding* the ID, as the cleaning shouldn't modify the ID.
export type CleanDataOutput = Omit<DataEntry, 'id'>;

const SYSTEM_PROMPT = `You are an expert data cleaning agent. When given a JSON data entry, you perform these cleaning tasks:
1. Trim leading/trailing whitespace from all string values.
2. Standardize casing for common keys if possible (e.g., 'email' to lowercase). Infer reasonable standardization based on the key name.
3. Correct obvious typos in string values where confidence is high.
4. Attempt to standardize boolean-like strings (e.g., "yes", "True", "1" to true; "no", "False", "0" to false).
5. Format date strings to ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ) if they are recognizable date formats.
6. Ensure the structure of the JSON remains the same, only modifying values and potentially key casing. Do not add or remove keys unless it's purely a casing change. Do NOT re-introduce an 'id' field.
7. Return the cleaned JSON object (without the 'id' field).

Return ONLY a valid JSON object with no additional commentary, markdown, or code fences.`;

export async function cleanDataFlow(dataEntryWithId: CleanDataInput): Promise<CleanDataOutput> {
  console.log("Claude Flow: Received data for cleaning:", dataEntryWithId);

  // Extract data without the ID to pass to the model
  const { id, ...dataToClean } = dataEntryWithId;

  console.log("Claude Flow: Sending data to model (excluding ID):", dataToClean);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Clean the following JSON data entry (ID has been excluded):\n\n\`\`\`json\n${JSON.stringify(dataToClean, null, 2)}\n\`\`\``,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Failed to get cleaned data from the AI model.');
  }

  let cleanedOutput: CleanDataOutput;
  try {
    // Strip any accidental markdown code fences before parsing
    const raw = textContent.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    cleanedOutput = JSON.parse(raw);
  } catch {
    console.error("Claude Flow: Failed to parse JSON response:", textContent.text);
    throw new Error('AI model returned invalid JSON.');
  }

  console.log("Claude Flow: Returning cleaned data (excluding ID):", cleanedOutput);
  return cleanedOutput;
}
