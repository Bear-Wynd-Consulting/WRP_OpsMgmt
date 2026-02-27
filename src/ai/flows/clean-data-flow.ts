
// src/ai/flows/clean-data-flow.ts
'use server';
/**
 * @fileOverview A Genkit flow for cleaning and standardizing data entries.
 *
 * - cleanDataFlow - A function that takes a data entry and returns a cleaned version.
 * - CleanDataInput - The input type for the cleanDataFlow function (currently DataEntry).
 * - CleanDataOutput - The return type for the cleanDataFlow function (potentially DataEntry without id).
 */

import { ai } from '@/ai/ai-instance';
import type { DataEntry } from '@/services/types'; // Updated import path
import { z } from 'genkit';

// Define a flexible schema for input, including the string 'id'
const DataEntryInputSchema = z.record(z.string(), z.any())
    .refine((data): data is DataEntry => typeof data.id === 'string', { message: "Input must have a string 'id' field." })
    .describe('A flexible data entry object with string keys and any value types, requiring a string id.');

// Define a flexible schema for output, which might exclude 'id'
const DataEntryOutputSchema = z.record(z.string(), z.any())
    .describe('A flexible data entry object representing the cleaned data, potentially excluding the id.');

export type CleanDataInput = z.infer<typeof DataEntryInputSchema>;
// The output type represents the data *excluding* the ID, as the cleaning shouldn't modify the ID.
export type CleanDataOutput = Omit<DataEntry, 'id'>;


// Define the prompt for the LLM
const cleanDataPrompt = ai.definePrompt({
  name: 'cleanDataPrompt',
  input: {
    // Input to the prompt should be the data *without* the ID
    schema: z.record(z.string(), z.any()).describe('Data entry content excluding the ID.'),
  },
  output: {
    // Expect the LLM to output cleaned JSON *without* the ID
    schema: DataEntryOutputSchema,
  },
  prompt: `You are an expert data cleaning agent. Analyze the following JSON data entry (which excludes the original ID) and perform these cleaning tasks:
1.  Trim leading/trailing whitespace from all string values.
2.  Standardize casing for common keys if possible (e.g., 'email' to lowercase). Infer reasonable standardization based on the key name.
3.  Correct obvious typos in string values where confidence is high.
4.  Attempt to standardize boolean-like strings (e.g., "yes", "True", "1" to true; "no", "False", "0" to false).
5.  Format date strings to ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ) if they are recognizable date formats.
6.  Ensure the structure of the JSON remains the same, only modifying values and potentially key casing. Do not add or remove keys unless it's purely a casing change. Do NOT re-introduce an 'id' field.
7.  Return the cleaned JSON object (without the 'id' field).

Original Data Entry (excluding ID):
\`\`\`json
{{{json input}}}
\`\`\`

Return ONLY the cleaned JSON object, without adding an 'id' field.`,
});


// Define the Genkit flow
export const cleanDataFlow = ai.defineFlow(
  {
    name: 'cleanDataFlow',
    // We use the full DataEntry for the flow's inputSchema for type safety at the call site
    inputSchema: DataEntryInputSchema,
    // The flow's outputSchema represents the cleaned data (potentially without ID)
    outputSchema: DataEntryOutputSchema,
  },
  async (dataEntryWithId) => {
    console.log("Genkit Flow: Received data for cleaning:", dataEntryWithId);

    // Extract data without the ID to pass to the prompt
    const { id, ...dataToClean } = dataEntryWithId;

    console.log("Genkit Flow: Sending data to prompt (excluding ID):", dataToClean);

    // Call the LLM prompt with the data excluding the ID
    const result = await cleanDataPrompt(dataToClean);

    // Use .output directly; the prompt's output schema defines the expected structure (without ID)
    const cleanedOutput = result.output;

    if (!cleanedOutput) {
        console.error("Genkit Flow: LLM did not return valid output.");
        throw new Error('Failed to get cleaned data from the AI model.');
    }

    console.log("Genkit Flow: Returning cleaned data (excluding ID):", cleanedOutput);
    // Return the cleaned data, which should not include the 'id' based on the prompt
    return cleanedOutput as CleanDataOutput;
  }
);
