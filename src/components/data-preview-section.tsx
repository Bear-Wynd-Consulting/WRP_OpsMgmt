
// src/components/data-preview-section.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Filter, X, Database } from "lucide-react"; // Removed BarChartHorizontalBig

import type { DataEntry, RelationshipEntry } from "@/services/types";
import { DataPreviewTable } from "@/components/data-preview-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setActiveDatasetAction } from "@/actions/data-actions";
// Removed DataVisualization import


interface DataPreviewSectionProps {
  initialData: DataEntry[]; // Expects DataEntry with string id
  initialRelationships: RelationshipEntry[]; // Expects RelationshipEntry with string ids
  activeDatasetName: string | null; // Name of the currently active dataset
  allDatasetNames: string[];       // List of all available dataset names
  error: string | null;
}

export function DataPreviewSection({
    initialData,
    initialRelationships,
    activeDatasetName: initialActiveName,
    allDatasetNames,
    error: initialError
}: DataPreviewSectionProps) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isFiltering, startFilteringTransition] = useTransition();
  const [isSwitchingDataset, startSwitchingDatasetTransition] = useTransition();

  const [error, setError] = useState<string | null>(initialError);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [filterSourceId, setFilterSourceId] = useState<string>(''); // Filter ID is a string
  const [displayedData, setDisplayedData] = useState<DataEntry[]>(initialData);
  const [currentActiveName, setCurrentActiveName] = useState<string | null>(initialActiveName);

  // Removed visualization dialog state

  const { toast } = useToast();

  // Update local state when props change
  useEffect(() => {
    // Only reset displayedData if no filter is active OR if the active dataset name changed
    if (!filterSourceId || currentActiveName !== initialActiveName) {
      setDisplayedData(initialData);
    }
    // Update local active name if prop changes
    if (currentActiveName !== initialActiveName) {
        setCurrentActiveName(initialActiveName);
    }
    // Clear general error if initialError is null
    setError(initialError);

   }, [initialData, initialError, filterSourceId, initialActiveName, currentActiveName]);


  // --- Dataset Switching ---
  const handleDatasetChange = (newDatasetName: string) => {
        if (newDatasetName === currentActiveName) return; // No change needed

        setError(null); // Clear errors
        setFilterError(null);
        setFilterSourceId(''); // Clear filter when switching datasets

        startSwitchingDatasetTransition(async () => {
            try {
                 console.log(`Switching active dataset to: ${newDatasetName}`);
                 const result = await setActiveDatasetAction(newDatasetName);
                 if (result.success) {
                     toast({
                         title: "Dataset Switched",
                         description: result.message || `Dataset '${newDatasetName}' is now active. Refreshing data...`,
                     });
                     setCurrentActiveName(newDatasetName); // Update local state immediately
                     // Trigger a full page refresh to load data for the new active dataset
                     router.refresh();
                 } else {
                      setError(result.error || `Failed to switch to dataset '${newDatasetName}'.`);
                      toast({
                         variant: "destructive",
                         title: "Switch Failed",
                         description: result.error || `Could not switch to dataset '${newDatasetName}'.`,
                      });
                 }
            } catch (e) {
                 console.error("Dataset switch failed:", e);
                 const errorMessage = e instanceof Error ? e.message : "Failed to switch dataset.";
                 setError(errorMessage);
                 toast({
                   variant: "destructive",
                   title: "Switch Error",
                   description: errorMessage,
                 });
            }
        });
  };


  const handleRefresh = () => {
    setError(null);
    setFilterError(null);
    setFilterSourceId('');
    startRefreshTransition(() => {
      try {
        // Refresh the current route; this re-runs the server component (page.tsx)
        // which fetches data for the *currently active* dataset.
        router.refresh();
        toast({
          title: "Data Refreshed",
          description: `Data for dataset '${currentActiveName || 'N/A'}' updated.`,
        });
      } catch (e) {
        console.error("Refresh failed:", e);
        const errorMessage = e instanceof Error ? e.message : "Failed to refresh data.";
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "Refresh Error",
          description: errorMessage,
        });
      }
    });
  };


  const handleApplyFilter = () => {
    const sourceIdStr = filterSourceId.trim();
    if (!sourceIdStr) {
      setFilterError("Please enter a Source Entry ID to filter by.");
      toast({ variant: "destructive", title: "Missing Input", description: "Source Entry ID cannot be empty." });
      return;
    }
    setError(null);
    setFilterError(null);
    startFilteringTransition(async () => {
      try {
        // Use relationships from props (which should be for the active dataset)
        // Filter relationships based on the string source ID
        const targetIds = new Set(
            initialRelationships
            .filter(rel => rel.source_entry_id === sourceIdStr) // Compare strings
            .map(rel => rel.target_entry_id) // Target IDs are already strings
        );

        // Check if the source entry exists in the initialData using string comparison
        const sourceExists = initialData.some(entry => entry.id === sourceIdStr);

        if (!sourceExists) {
            setFilterError(`Source entry ID ${sourceIdStr} not found in dataset '${currentActiveName || 'N/A'}.`);
            toast({
                variant: "destructive",
                title: "Filter Error",
                description: `Source entry ID ${sourceIdStr} does not exist in this dataset.`,
            });
            setDisplayedData([]);
            return;
        }

        if (targetIds.size > 0) {
             // Filter initialData based on targetIds (string comparison)
             const filteredResults = initialData.filter(entry => targetIds.has(entry.id));
             setDisplayedData(filteredResults);
             toast({
               title: "Filter Applied",
               description: `Showing ${filteredResults.length} entries related to source ID ${sourceIdStr} in dataset '${currentActiveName || 'N/A'}'.`,
             });
        } else {
             setFilterError(`No relationships found originating from source ID ${sourceIdStr} in dataset '${currentActiveName || 'N/A'}.`);
             toast({
                variant: "default",
                title: "Filter Applied",
                description: `No entries related to source ID ${sourceIdStr} in this dataset.`,
             });
             setDisplayedData([]);
        }

      } catch (e) {
        console.error("Filtering failed:", e);
        const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred during filtering.";
        setFilterError(errorMessage);
        setDisplayedData([]);
        toast({
          variant: "destructive",
          title: "Filter Failed",
          description: errorMessage,
        });
      }
    });
  };

  const handleClearFilter = () => {
    setFilterSourceId('');
    setFilterError(null);
    setDisplayedData(initialData); // Reset to show all data for the current active dataset
    toast({
      title: "Filter Cleared",
      description: `Showing all data for dataset '${currentActiveName || 'N/A'}'.`,
    });
  };

    const isActionPending = isRefreshing || isFiltering || isSwitchingDataset;


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
           <div className="flex-grow">
                <CardTitle>Data Preview</CardTitle>
                <CardDescription className="mt-1 flex items-center gap-1">
                   <Database className="h-4 w-4 text-muted-foreground" />
                   <span>
                       Active Dataset: <span className="font-medium text-foreground">{currentActiveName || 'None Selected'}</span>.
                       View data and relationships below.
                   </span>
                 </CardDescription>
           </div>
           <div className="flex flex-shrink-0 gap-2 w-full sm:w-auto">
                 {/* Dataset Selector */}
                <Select
                    value={currentActiveName ?? ''}
                    onValueChange={handleDatasetChange}
                    disabled={isActionPending || allDatasetNames.length === 0}
                >
                    <SelectTrigger className="w-full sm:w-[180px]" aria-label="Select Dataset">
                        <SelectValue placeholder="Select Dataset" />
                    </SelectTrigger>
                    <SelectContent>
                        {allDatasetNames.length > 0 ? (
                             allDatasetNames.map((name) => (
                                <SelectItem key={name} value={name}>
                                    {name}
                                </SelectItem>
                            ))
                        ) : (
                             <SelectItem value="nodata" disabled>No datasets available</SelectItem>
                        )}
                    </SelectContent>
                </Select>

                 {/* Removed Visualization Dialog Trigger */}

                 {/* Refresh Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isActionPending || !currentActiveName}
                aria-label="Refresh Data"
                title="Refresh data for the current dataset"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
         {/* Filter Controls */}
         <div className="flex flex-col sm:flex-row items-end gap-2 p-4 border rounded-md bg-muted/50">
           <div className="flex-grow w-full sm:w-auto space-y-1">
             <Label htmlFor="filter-source-id">Filter by Relationships (Source ID)</Label>
             <Input
               id="filter-source-id"
               placeholder="Enter Source Entry ID"
               value={filterSourceId}
               onChange={(e) => setFilterSourceId(e.target.value)}
               disabled={isActionPending || !currentActiveName}
               className="bg-background"
             />
           </div>
           <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                <Button onClick={handleApplyFilter} disabled={isActionPending || !filterSourceId.trim() || !currentActiveName} className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  {isFiltering ? "Filtering..." : "Filter"}
                </Button>
                 <Button variant="outline" onClick={handleClearFilter} disabled={isActionPending || !currentActiveName || !filterSourceId.trim()} className="w-full sm:w-auto">
                  <X className="mr-2 h-4 w-4" />
                  Clear
                 </Button>
            </div>
         </div>

          {filterError && (
             <Alert variant="destructive">
               <AlertTitle>Filter Error</AlertTitle>
               <AlertDescription>{filterError}</AlertDescription>
             </Alert>
          )}

         {/* Data Table */}
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Loading Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !currentActiveName ? (
             <Alert>
               <AlertTitle>No Active Dataset</AlertTitle>
               <AlertDescription>Please select or create a dataset using the controls above or the upload form.</AlertDescription>
             </Alert>
        ) : (
          <DataPreviewTable data={displayedData} relationships={initialRelationships} />
        )}
        {isActionPending && <p className="text-muted-foreground text-sm mt-2">
            {isRefreshing ? 'Refreshing data...' : isFiltering ? 'Applying filter...' : isSwitchingDataset ? 'Switching dataset...' : ''}
        </p>}
      </CardContent>
    </Card>
  );
}
