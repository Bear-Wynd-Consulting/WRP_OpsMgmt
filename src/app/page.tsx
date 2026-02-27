
import { DataUploadForm } from "@/components/data-upload-form";
import { DataPreviewSection } from "@/components/data-preview-section";
import { getAllData, getAllRelationships, getAllDatasetNames } from "@/services/database"; // Import dataset name functions
import type { DataEntry, RelationshipEntry } from "@/services/types"; // Import types
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic'; // Ensure data is fetched on each request

export default async function Home() {
  let initialData: DataEntry[] = [];
  let initialRelationships: RelationshipEntry[] = [];
  let activeDatasetName: string | null = null;
  let allDatasetNames: string[] = [];
  let error: string | null = null;

  try {
    // Fetch active dataset name from cookies
    const cookieStore = await cookies();
    activeDatasetName = cookieStore.get('active_dataset')?.value || 'default';

    // Fetch all dataset names
    allDatasetNames = await getAllDatasetNames();

    // Fetch data and relationships for the active dataset
    if (activeDatasetName) {
        // We need to handle the case where the dataset might not exist yet (e.g., 'default' before init)
        // But for now we pass the name. The service functions will throw or return empty if not found/empty.
        // We'll wrap in try/catch specifically for data fetching to be robust.
        try {
            [initialData, initialRelationships] = await Promise.all([
                getAllData(activeDatasetName),      // Fetches from active dataset
                getAllRelationships(activeDatasetName), // Fetches from active dataset
            ]);
        } catch (fetchError) {
             console.warn(`Could not fetch data for dataset '${activeDatasetName}':`, fetchError);
             // If fetching fails (e.g. dataset doesn't exist in DB yet), treat as empty
             initialData = [];
             initialRelationships = [];
             // Only set error if it's not the default 'default' case which might just be empty initially
             if (activeDatasetName !== 'default') {
                 error = `Could not load data for '${activeDatasetName}'.`;
             }
        }

    } else {
        // Should not happen with default fallback, but safe check
        error = "No active dataset selected.";
        initialData = [];
        initialRelationships = [];
    }

  } catch (e) {
    console.error("Failed to fetch initial data, relationships, or dataset names:", e);
    error = `Failed to load application data.`;
    if (e instanceof Error) {
        error = `${error} Details: ${e.message}`;
    }
    initialData = [];
    initialRelationships = [];
    // activeDatasetName preserves the cookie value or 'default'
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload New Data</CardTitle>
        </CardHeader>
        <CardContent>
          <DataUploadForm allDatasetNames={allDatasetNames}/> {/* Pass dataset names */}
        </CardContent>
      </Card>

      <Separator />

      {/* Pass dataset names and active name to the preview section */}
      <DataPreviewSection
        initialData={initialData}
        initialRelationships={initialRelationships}
        activeDatasetName={activeDatasetName}
        allDatasetNames={allDatasetNames}
        error={error}
      />
    </div>
  );
}
