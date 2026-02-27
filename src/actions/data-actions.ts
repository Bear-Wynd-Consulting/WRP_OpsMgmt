
// src/actions/data-actions.ts
'use server';
import pool from '@/services/db/client';

import {
    addData,
    updateDataById,
    getDataById,
    getDataByIds,
    addRelationship,
    getRelationshipsBySourceId,
    getAllData,
    getAllRelationships,
    createOrReplaceDataset,  // Import new service function
    getAllDatasetNames,      // Import new service function
    // Removed replaceDatabase import as it's superseded by createOrReplaceDataset
} from '@/services/database';
import type { DataEntry, RelationshipEntry } from '@/services/types'; // Import types
import { revalidatePath } from 'next/cache';
import { cleanDataFlow } from '@/ai/flows/clean-data-flow';
import { cookies } from 'next/headers';

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

// --- Dataset Management Actions ---

/**
 * Sets the active dataset for subsequent operations.
 */
export async function setActiveDatasetAction(name: string): Promise<ActionResult> {
    console.log(`Server Action: Received request to set active dataset to: ${name}`);
    try {
        const cookieStore = await cookies();
        cookieStore.set('active_dataset', name);
        console.log(`Server Action: Active dataset set to '${name}'.`);
        // Revalidate the main page to reflect changes related to the active dataset
        revalidatePath('/');
        return { success: true, message: `Dataset '${name}' is now active.` };
    } catch (error) {
        console.error(`Server Action: Error setting active dataset to '${name}':`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

/**
 * Gets the name of the currently active dataset.
 */
export async function getActiveDatasetNameAction(): Promise<ActionResult> {
    console.log("Server Action: Received request to get active dataset name.");
    try {
        const cookieStore = await cookies();
        const activeCookie = cookieStore.get('active_dataset');
        const name = activeCookie?.value || 'default';
        console.log(`Server Action: Active dataset name is '${name}'.`);
        return { success: true, data: name };
    } catch (error) {
        console.error("Server Action: Error getting active dataset name:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}

/**
 * Gets the names of all available datasets.
 */
export async function getAllDatasetNamesAction(): Promise<ActionResult> {
    console.log("Server Action: Received request to get all dataset names.");
    try {
        const names = await getAllDatasetNames();
        console.log(`Server Action: Found dataset names: [${names.join(', ')}]`);
        return { success: true, data: names };
    } catch (error) {
        console.error("Server Action: Error getting all dataset names:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    }
}


/**
 * Creates a new dataset with the provided data, replacing if the name already exists.
 * Sets the new dataset as active. Accepts DataEntry with optional string IDs.
 */
export async function createNewDatasetAction(datasetName: string, newData: DataEntry[]): Promise<ActionResult> {
  console.log(`Server Action: Received request to create/replace dataset '${datasetName}' with ${newData.length} entries.`);
  try {
    // Pass data directly, createOrReplaceDataset handles ID assignment/conversion internally
    const success = await createOrReplaceDataset(datasetName, newData);

    if (success) {
      console.log(`Server Action: Dataset '${datasetName}' created/replaced.`);
      // Set the new dataset as active
      const cookieStore = await cookies();
      cookieStore.set('active_dataset', datasetName);
      console.log(`Server Action: Dataset '${datasetName}' set as active.`);

      revalidatePath('/'); // Revalidate main page to show the new active dataset
      return { success: true, message: `New data set '${datasetName}' created successfully and is now active.` };
    } else {
      console.error(`Server Action: Failed to create/replace dataset '${datasetName}'.`);
      return { success: false, error: `Failed to create/replace dataset '${datasetName}'.` };
    }
  } catch (error) {
    console.error(`Server Action: Error creating/replacing dataset '${datasetName}':`, error);
    let errorMessage = `An unexpected error occurred while creating/replacing data set '${datasetName}'.`;
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}


// --- Data Operations Actions (operate on the active dataset) ---

/**
 * Uploads/updates data in the active dataset. Handles both single entries and arrays.
 * Expects DataEntry with optional string IDs.
 */
export async function uploadDataAction(data: DataEntry | DataEntry[]): Promise<ActionResult> {
  const activeNameResult = await getActiveDatasetNameAction();
  const activeName = activeNameResult.data;

  if (!activeName) {
    return { success: false, error: "No active dataset selected." };
  }
  console.log(`Server Action [Active: ${activeName}]: Received data for upload/update:`, JSON.stringify(data).substring(0, 100) + '...');
  try {
    // Pass data directly, addData handles ID assignment/conversion and upsert logic\
    const success = await addData(activeName, data);

    if (success) {
      console.log(`Server Action [Active: ${activeName}]: Data added/updated successfully.`);
      revalidatePath('/');
      return { success: true, message: 'Data added/updated in the current set successfully.' };
    } else {
      console.error(`Server Action [Active: ${activeName}]: Failed to add or update data.`);
      return { success: false, error: 'Failed to add or update data entries.' };
    }
  } catch (error) {
    console.error(`Server Action [Active: ${activeName}]: Error uploading/updating data:`, error);
    let errorMessage = 'An unexpected error occurred during data upload/update.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Cleans a specific data entry using an AI flow. Requires the entry ID (string).
 */
export async function cleanDataAction(entryId: string): Promise<ActionResult> {
  const activeNameResult = await getActiveDatasetNameAction();
  const activeName = activeNameResult.data;

   if (!activeName) {
    return { success: false, error: "No active dataset selected." };
  }
  console.log(`Server Action [Active: ${activeName}]: Received request to clean data for ID: ${entryId}`);
  try {
     // Fetch data using string ID
    const currentData = await getDataById(activeName, entryId);
    if (!currentData) {
      return { success: false, error: `Data entry with ID ${entryId} not found in active dataset '${activeName}'.` };
    }

    // Pass the fetched data (which includes the string 'id') to the flow
    const cleanedData = await cleanDataFlow(currentData);
    console.log(`Server Action [Active: ${activeName}]: Genkit flow returned cleaned data:`, cleanedData);
    // The cleaned data returned by the flow might or might not include the 'id'.
    // The updateDataAction will handle merging correctly.
    return { success: true, message: 'Data cleaning suggestions generated.', data: cleanedData };

  } catch (error) {
    console.error(`Server Action [Active: ${activeName}]: Error cleaning data for ID ${entryId}:`, error);
    let errorMessage = 'An unexpected error occurred during data cleaning.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Updates a specific data entry in the active dataset.
 * @param entryId The string ID of the entry to update.
 * @param cleanedData The data object (should NOT contain the 'id' field).
 */
export async function updateDataAction(entryId: string, cleanedData: Omit<DataEntry, 'id'>): Promise<ActionResult> {
    const activeNameResult = await getActiveDatasetNameAction();
    const activeName = activeNameResult.data;

     if (!activeName) {
        return { success: false, error: "No active dataset selected." };
     }
    console.log(`Server Action [Active: ${activeName}]: Received request to update/amend data for ID: ${entryId}`);
    try {
        // Pass string ID and data without ID to the service function
        const success = await updateDataById(activeName, entryId, cleanedData);

        if (success) {
            console.log(`Server Action [Active: ${activeName}]: Data for ID ${entryId} updated successfully.`);
            revalidatePath(`/data/${entryId}`);
            revalidatePath('/');
            return { success: true, message: 'Data entry amended successfully.' };
        } else {
            console.error(`Server Action [Active: ${activeName}]: Failed to update data for ID ${entryId}.`);
            return { success: false, error: `Failed to amend data entry with ID ${entryId} in active dataset '${activeName}'. Ensure the ID exists.` };
        }
    } catch (error) {
        console.error(`Server Action [Active: ${activeName}]: Error updating data for ID ${entryId}:`, error);
        let errorMessage = 'An unexpected error occurred during data update.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}

/**
 * Fetches multiple data entries by their string IDs from the active dataset.
 */
export async function getDataByIdsAction(ids: string[]): Promise<ActionResult> {
    const activeNameResult = await getActiveDatasetNameAction();
    const activeName = activeNameResult.data;

    if (!activeName) {
       return { success: false, error: "No active dataset selected." };
    }
    console.log(`Server Action [Active: ${activeName}]: Received request to get data for IDs: [${ids.join(', ')}]`);
    try {
        // Pass string IDs to service
        const data = await getDataByIds(activeName, ids);
        console.log(`Server Action [Active: ${activeName}]: Found ${data.length} entries for the requested IDs.`);
        return { success: true, data: data };
    } catch (error) {
        console.error(`Server Action [Active: ${activeName}]: Error getting data for IDs [${ids.join(', ')}]:`, error);
        let errorMessage = 'An unexpected error occurred while fetching multiple data entries.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}

/**
 * Fetches all data entries from the active dataset.
 */
export async function getAllDataAction(): Promise<ActionResult> {
    const activeNameResult = await getActiveDatasetNameAction();
    const activeName = activeNameResult.data;

     if (!activeName) {
        return { success: false, error: "No active dataset selected." };
     }
    console.log(`Server Action [Active: ${activeName}]: Received request to get all data.`);
     try {
         const data = await getAllData(activeName); // Fetches from active dataset
         console.log(`Server Action [Active: ${activeName}]: Found ${data.length} total data entries.`);
         return { success: true, data: data };
     } catch (error) {
         console.error(`Server Action [Active: ${activeName}]: Error getting all data:`, error);
         let errorMessage = 'An unexpected error occurred while fetching all data.';
         if (error instanceof Error) {
             errorMessage = error.message;
         }
         return { success: false, error: errorMessage };
     }
}


// --- Relationship Actions (operate on the active dataset) ---

/**
 * Adds a relationship between two entries identified by their string IDs.
 */
export async function addRelationshipAction(sourceId: string, targetId: string): Promise<ActionResult> {
    const activeNameResult = await getActiveDatasetNameAction();
    const activeName = activeNameResult.data;

     if (!activeName) {
        return { success: false, error: "No active dataset selected." };
     }
    console.log(`Server Action [Active: ${activeName}]: Received request to add relationship: ${sourceId} -> ${targetId}`);
    try {
        if (sourceId === targetId) {
             console.warn(`Server Action [Active: ${activeName}]: Attempted to add self-referencing relationship for ID ${sourceId}.`);
             return { success: false, error: 'Cannot create a relationship with the same entry.' };
        }

        // Pass string IDs to service
        const newRelationship = await addRelationship(activeName, sourceId, targetId);

        if (newRelationship) {
            console.log(`Server Action [Active: ${activeName}]: Relationship added/found successfully:`, newRelationship);
            revalidatePath(`/data/${sourceId}`); // Revalidate source page
            revalidatePath(`/data/${targetId}`); // Revalidate target page (if visited)
            revalidatePath('/'); // Revalidate overview page
            return { success: true, message: 'Relationship added successfully.', data: newRelationship };
        } else {
             // addRelationship service now returns null if source/target don't exist
             console.error(`Server Action [Active: ${activeName}]: Failed add relationship ${sourceId} -> ${targetId}. Source or Target ID likely missing in dataset '${activeName}'.`);
             // Check existence for better error message (optional, requires extra DB calls)
             // const sourceExists = !!await getDataById(sourceId);
             // const targetExists = !!await getDataById(targetId);
             // let errorMsg = `Failed to add relationship in dataset '${activeName}'.`;
             // if (!sourceExists) errorMsg = `Source entry ID ${sourceId} not found in dataset '${activeName}'.`;
             // else if (!targetExists) errorMsg = `Target entry ID ${targetId} not found in dataset '${activeName}'.`;
             // else errorMsg = `Failed to add relationship in dataset '${activeName}'. Possible database issue.`;
             return { success: false, error: `Failed to add relationship. Ensure both source (${sourceId}) and target (${targetId}) IDs exist in dataset '${activeName}'.` };
        }
    } catch (error) {
        console.error(`Server Action [Active: ${activeName}]: Error adding relationship ${sourceId} -> ${targetId}:`, error);
        let errorMessage = 'An unexpected error occurred while adding the relationship.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}

/**
 * Fetches relationships originating from a specific source ID (string) in the active dataset.
 */
export async function getRelationshipsAction(sourceId: string): Promise<ActionResult> {
    const activeNameResult = await getActiveDatasetNameAction();
    const activeName = activeNameResult.data;

     if (!activeName) {
        return { success: false, error: "No active dataset selected." };
     }
    console.log(`Server Action [Active: ${activeName}]: Received request to get relationships for source ID: ${sourceId}`);
    try {
        // Pass string ID to service
        const relationships = await getRelationshipsBySourceId(activeName, sourceId);
        console.log(`Server Action [Active: ${activeName}]: Found ${relationships.length} relationships for ${sourceId}.`);
        return { success: true, data: relationships };
    } catch (error) {
        console.error(`Server Action [Active: ${activeName}]: Error getting relationships for ID ${sourceId}:`, error);
        let errorMessage = 'An unexpected error occurred while fetching relationships.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}

/**
 * Fetches all relationships from the active dataset.
 */
export async function getAllRelationshipsAction(): Promise<ActionResult> {
    const activeNameResult = await getActiveDatasetNameAction();
    const activeName = activeNameResult.data;

     if (!activeName) {
        return { success: false, error: "No active dataset selected." };
     }
    console.log(`Server Action [Active: ${activeName}]: Received request to get all relationships.`);
    try {
        const relationships = await getAllRelationships(activeName); // Fetches from active dataset
        console.log(`Server Action [Active: ${activeName}]: Found ${relationships.length} total relationships.`);
        return { success: true, data: relationships };
    } catch (error) {
        console.error(`Server Action [Active: ${activeName}]: Error getting all relationships:`, error);
        let errorMessage = 'An unexpected error occurred while fetching all relationships.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}
