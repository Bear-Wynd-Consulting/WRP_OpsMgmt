
import { notFound } from 'next/navigation';
import { getDataById } from '@/services/database'; // Import getActiveDatasetName
import { DataDetailView } from '@/components/data-detail-view';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { DataEntry } from '@/services/types'; // Updated import path
import { cookies } from 'next/headers';

interface DataDetailPageProps {
  params: {
    id: string; // ID from URL is always a string
  };
}

export const dynamic = 'force-dynamic'; // Ensure data is fetched on each request

export default async function DataDetailPage({ params }: DataDetailPageProps) {
  const { id } = params; // id is a string here
  let dataEntry: DataEntry | null = null;
  let error: string | null = null;
  let activeDatasetName: string | null = null; // To display the dataset name

  try {
    // Fetch the active dataset name first for context
    const cookieStore = await cookies();
    activeDatasetName = cookieStore.get('active_dataset')?.value || 'default';

    console.log(`[DataDetailPage - Active: ${activeDatasetName || 'N/A'}] Rendering page for ID: ${id}`);

    if (activeDatasetName) {
        // Pass the string ID directly to getDataById
        dataEntry = await getDataById(activeDatasetName, id); // Fetches from the active dataset using string ID

        if (dataEntry) {
            console.log(`[DataDetailPage - Active: ${activeDatasetName || 'N/A'}] Successfully fetched data for ID: ${id}.`);
        } else {
            console.warn(`[DataDetailPage - Active: ${activeDatasetName || 'N/A'}] getDataById returned null for ID: ${id}. Entry not found in this dataset.`);
        }
    } else {
         error = "No active dataset selected.";
    }

  } catch (e) {
    const datasetCtx = activeDatasetName || 'N/A'; // Use fetched name or N/A
    console.error(`[DataDetailPage - Active: ${datasetCtx}] Failed to fetch data for ID ${id}:`, e);
    error = `Failed to load data for ID ${id} from dataset '${datasetCtx}'.`;
    if (e instanceof Error) {
        error = `${error} Details: ${e.message}`;
    }
    // No need to re-fetch names on error, use the one already fetched or N/A
  }

  // Trigger 404 if no error occurred BUT dataEntry is still null
  if (!error && !dataEntry) {
     console.log(`[DataDetailPage - Active: ${activeDatasetName || 'N/A'}] No data found for ID ${id}. Triggering notFound().`);
    notFound();
  }

  return (
    <div className="space-y-6">
       <Button variant="outline" asChild>
           <Link href="/">
             <ArrowLeft className="mr-2 h-4 w-4" /> Back to Overview
           </Link>
         </Button>
      <Card>
        <CardHeader>
          <CardTitle>Data Details (ID: {id})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Dataset: <span className="font-medium">{activeDatasetName || 'N/A'}</span>
          </p>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : dataEntry ? (
            // Pass the string ID to the client component
            <DataDetailView initialData={dataEntry} entryId={id} />
          ) : (
             <p className="text-destructive">Data entry not found (ID: {id}) in dataset '{activeDatasetName || 'N/A'}'.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
