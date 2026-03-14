
// src/components/data-detail-view.tsx
"use client";

import { useState, useTransition, useEffect, useMemo, useCallback } from 'react';
import type { DataEntry, RelationshipEntry } from '@/services/types'; // Updated import path
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  cleanDataAction,
  updateDataAction,
  addRelationshipAction,
  getRelationshipsAction,
  getDataByIdsAction // Import action to fetch multiple entries
} from '@/actions/data-actions';
import { Loader2, Save, Sparkles, Edit, XCircle, Plus, Columns3, CheckSquare } from 'lucide-react'; // Added Columns3, CheckSquare
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from 'next/link';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'; // Added ScrollArea

interface DataDetailViewProps {
  initialData: DataEntry;
  entryId: string; // Ensure entryId is always string
}

export function DataDetailView({ initialData, entryId }: DataDetailViewProps) {
  const [currentData, setCurrentData] = useState<DataEntry>(initialData);
  const [cleanedDataSuggestion, setCleanedDataSuggestion] = useState<DataEntry | null>(null);
  const [isCleaning, startCleaningTransition] = useTransition();
  const [isSaving, startSavingTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [editedJsonString, setEditedJsonString] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const { toast } = useToast();

  // --- Relationship State ---
  const [relationships, setRelationships] = useState<RelationshipEntry[]>([]);
  const [relatedData, setRelatedData] = useState<DataEntry[]>([]); // State to store full related data
  const [isLoadingRelationships, startLoadingRelationshipsTransition] = useTransition();
  const [isLoadingRelatedData, startLoadingRelatedDataTransition] = useTransition();
  const [relationshipError, setRelationshipError] = useState<string | null>(null);
  const [targetEntryId, setTargetEntryId] = useState<string>('');
  const [isAddingRelationship, startAddingRelationshipTransition] = useTransition();
  const [relatedHeaders, setRelatedHeaders] = useState<string[]>([]); // State for table headers
  const [isEditingHeaders, setIsEditingHeaders] = useState(false); // State for header editing mode
  const [tempHeaders, setTempHeaders] = useState<string[]>([]); // Temporary headers during edit
  // --- End Relationship State ---

  // --- Fetch Relationships ---
  const fetchRelationships = useCallback(() => {
     setRelationshipError(null);
     startLoadingRelationshipsTransition(async () => {
       try {
         // Pass string entryId to action
         const result = await getRelationshipsAction(entryId);
         if (result.success && Array.isArray(result.data)) {
           setRelationships(result.data);
           // Ensure target IDs are strings for getDataByIdsAction
           const targetIds = result.data.map((rel: RelationshipEntry) => String(rel.target_entry_id));
           if (targetIds.length > 0) {
               fetchRelatedData(targetIds);
           } else {
               setRelatedData([]);
               setRelatedHeaders([]);
           }
         } else {
           setRelationshipError(result.error || 'Failed to load relationships.');
           setRelationships([]);
           setRelatedData([]);
           setRelatedHeaders([]);
         }
       } catch (e) {
         const message = e instanceof Error ? e.message : 'An unexpected error occurred while fetching relationships.';
         setRelationshipError(message);
         setRelationships([]);
         setRelatedData([]);
         setRelatedHeaders([]);
       }
     });
   }, [entryId]); // Depend on string entryId

   // Initial fetch on component mount
   useEffect(() => {
       fetchRelationships();
   }, [fetchRelationships]);
   // --- End Fetch Relationships ---

   // --- Fetch Related Data ---
   // Expects an array of string IDs
   const fetchRelatedData = (targetIds: string[]) => {
       startLoadingRelatedDataTransition(async () => {
            try {
                // Pass string IDs to action
                const result = await getDataByIdsAction(targetIds);
                if (result.success && Array.isArray(result.data)) {
                    setRelatedData(result.data);
                    // Determine headers from the fetched related data
                    const allKeys = result.data.reduce((keys, entry) => {
                        Object.keys(entry).forEach(key => keys.add(key));
                        return keys;
                    }, new Set<string>());

                    let headers = Array.from(allKeys);
                    if (headers.includes('id')) {
                        headers = ['id', ...headers.filter(h => h !== 'id')];
                    }
                    // Simplify headers (optional, based on previous logic)
                     const simpleHeaders = headers.filter(header => {
                        if (result.data.length > 0 && result.data[0] && typeof result.data[0] === 'object') {
                             const firstValue = (result.data[0] as Record<string, unknown>)[header as string];
                             return typeof firstValue !== 'object' || firstValue === null;
                        }
                        return true;
                    }) as string[];
                    setRelatedHeaders(simpleHeaders);
                    setTempHeaders(simpleHeaders);

                } else {
                    setRelationshipError(result.error || 'Failed to load data for related entries.');
                    setRelatedData([]);
                    setRelatedHeaders([]);
                }
            } catch(e) {
                 const message = e instanceof Error ? e.message : 'An unexpected error occurred while fetching related data.';
                 setRelationshipError(message);
                 setRelatedData([]);
                 setRelatedHeaders([]);
            }
       });
   }
   // --- End Fetch Related Data ---

  const handleCleanData = () => {
    setError(null);
    setEditError(null);
    setCleanedDataSuggestion(null);
    startCleaningTransition(async () => {
      try {
        // Pass string entryId to action
        const result = await cleanDataAction(entryId);
        if (result.success && result.data) {
          setCleanedDataSuggestion(result.data as DataEntry);
          toast({
            title: 'Cleaning Suggestion Ready',
            description: 'AI has generated a cleaned version of the data.',
          });
        } else {
          setError(result.error || 'Failed to get cleaning suggestions.');
          toast({
            variant: 'destructive',
            title: 'Cleaning Error',
            description: result.error || 'Could not generate cleaning suggestions.',
          });
        }
      } catch (e) {
        console.error('Error calling cleanDataAction:', e);
        const message = e instanceof Error ? e.message : 'An unexpected error occurred.';
        setError(message);
        toast({
          variant: 'destructive',
          title: 'Cleaning Failed',
          description: message,
        });
      }
    });
  };

  const handleApplySuggestion = () => {
      if (!cleanedDataSuggestion) return;
      setError(null);
      setEditError(null);
      startSavingTransition(async () => {
        try {
            // Pass string entryId to action
            const result = await updateDataAction(entryId, cleanedDataSuggestion);
             if (result.success) {
                // Update local state - ensure ID remains a string
                setCurrentData({...cleanedDataSuggestion, id: entryId });
                setCleanedDataSuggestion(null);
                toast({
                    title: 'Success',
                    description: result.message || 'Data updated successfully.',
                });
                 fetchRelationships(); // Re-fetch relationships in case update affects related data display
            } else {
                 setError(result.error || 'Failed to update data.');
                 toast({
                    variant: 'destructive',
                    title: 'Update Error',
                    description: result.error || 'Could not save the cleaned data.',
                 });
            }
        } catch (e) {
             console.error('Error calling updateDataAction:', e);
             const message = e instanceof Error ? e.message : 'An unexpected error occurred.';
             setError(message);
             toast({
               variant: 'destructive',
               title: 'Update Failed',
               description: message,
             });
        }
      });
  };

  const handleSuggestionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      try {
          const updatedSuggestion = JSON.parse(event.target.value);
          setCleanedDataSuggestion(updatedSuggestion);
      } catch (e) {
          console.warn("Invalid JSON in suggestion textarea");
      }
  };

  // --- Manual Edit Handlers ---
  const handleEditClick = () => {
    setIsEditing(true);
    setEditedJsonString(JSON.stringify(currentData, null, 2));
    setEditError(null);
    setError(null);
    setCleanedDataSuggestion(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedJsonString('');
    setEditError(null);
  };

  const handleEditChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedJsonString(event.target.value);
    setEditError(null);
  };

  const handleSaveChanges = () => {
    setError(null);
    setEditError(null);
    let parsedData: Omit<DataEntry, 'id'>; // Expect data without id from textarea

    try {
        const rawParsed = JSON.parse(editedJsonString);
        if (typeof rawParsed !== 'object' || rawParsed === null || Array.isArray(rawParsed)) {
            throw new Error("Invalid data format. Must be a single JSON object.");
        }
        // Ensure the 'id' field is not present in the object to be saved by updateDataAction
        const { id, ...rest } = rawParsed;
        parsedData = rest;

    } catch (e) {
        const message = e instanceof Error ? e.message : "Invalid JSON format.";
        setEditError(message);
        toast({
            variant: 'destructive',
            title: 'Invalid Data',
            description: message,
        });
        return;
    }

    startSavingTransition(async () => {
        try {
            // Pass string entryId and data without id to action
            const result = await updateDataAction(entryId, parsedData);
            if (result.success) {
                // Update local state with the saved data, preserving the string ID
                setCurrentData({ ...parsedData, id: entryId });
                setIsEditing(false);
                toast({
                    title: 'Success',
                    description: result.message || 'Data updated successfully.',
                });
                 fetchRelationships(); // Re-fetch relationships after manual save
            } else {
                setError(result.error || 'Failed to update data.');
                toast({
                    variant: 'destructive',
                    title: 'Update Error',
                    description: result.error || 'Could not save the changes.',
                });
            }
        } catch (e) {
            console.error('Error calling updateDataAction:', e);
            const message = e instanceof Error ? e.message : 'An unexpected error occurred.';
            setError(message);
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: message,
            });
        }
    });
  };
  // --- End Manual Edit Handlers ---

   // --- Header Editing Handlers ---
   const handleEditHeadersClick = () => {
    setTempHeaders([...relatedHeaders]);
    setIsEditingHeaders(true);
  };

  const handleCancelHeaderEdit = () => {
    setIsEditingHeaders(false);
    setTempHeaders([]);
  };

  const handleHeaderInputChange = (index: number, value: string) => {
    const newTempHeaders = [...tempHeaders];
    newTempHeaders[index] = value;
    setTempHeaders(newTempHeaders);
  };

  const handleSaveHeaders = () => {
    setRelatedHeaders(tempHeaders);
    setIsEditingHeaders(false);
     toast({
      title: 'Headers Updated',
      description: 'Related data table headers have been updated for this view.',
    });
  };
  // --- End Header Editing Handlers ---

   // --- Relationship Handlers ---
   const handleAddRelationship = () => {
        const trimmedTargetId = targetEntryId.trim();
        if (!trimmedTargetId) {
            setRelationshipError('Target Entry ID cannot be empty.');
            toast({ variant: 'destructive', title: 'Missing Input', description: 'Please enter a Target Entry ID.' });
            return;
        }
        setRelationshipError(null);
        startAddingRelationshipTransition(async () => {
             try {
                 // Pass string IDs to action
                 const result = await addRelationshipAction(entryId, trimmedTargetId);
                 if (result.success && result.data) {
                     setTargetEntryId(''); // Clear input on success
                     toast({
                         title: 'Success',
                         description: result.message || 'Relationship added successfully.',
                     });
                     fetchRelationships(); // Re-fetch relationships and related data
                 } else {
                     setRelationshipError(result.error || 'Failed to add relationship.');
                     toast({
                         variant: 'destructive',
                         title: 'Relationship Error',
                         description: result.error || 'Could not add the relationship.',
                     });
                 }
             } catch (e) {
                  console.error('Error calling addRelationshipAction:', e);
                  const message = e instanceof Error ? e.message : 'An unexpected error occurred.';
                  setRelationshipError(message);
                  toast({
                     variant: 'destructive',
                     title: 'Relationship Failed',
                     description: message,
                  });
             }
        });
   };

   // Relationship deletion remains unimplemented
   const handleDeleteRelationship = (relationshipId: number | string) => {
        console.warn(`Delete relationship functionality not implemented yet (ID: ${relationshipId})`);
         toast({
            variant: 'default',
            title: 'Not Implemented',
            description: 'Deleting relationships is not yet supported.',
        });
   };
   // --- End Relationship Handlers ---


  const isActionPending = isCleaning || isSaving || isLoadingRelationships || isLoadingRelatedData || isAddingRelationship;

  return (
    <div className="space-y-6">
      {error && !isEditing && (
         <Alert variant="destructive">
           <AlertTitle>Error</AlertTitle>
           <AlertDescription>{error}</AlertDescription>
         </Alert>
      )}

        {/* Current Data Card */}
        <Card>
            <CardHeader>
                <CardTitle>Current Data</CardTitle>
                <CardDescription>
                    {isEditing ? "Edit the JSON data below (ID field will be ignored on save)." : "The data currently stored in the database."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                 {isEditing ? (
                    <div className="space-y-2">
                        <Label htmlFor="edit-data-textarea">Edit Data (JSON)</Label>
                        <Textarea
                            id="edit-data-textarea"
                            // Use displayData which includes the ID for editing context, but ID is removed before saving
                            value={editedJsonString || JSON.stringify({ ...currentData, id: entryId }, null, 2)}
                            onChange={handleEditChange}
                            className="min-h-[250px] font-mono text-sm"
                            disabled={isSaving}
                            aria-invalid={!!editError}
                            aria-describedby={editError ? "edit-error-desc" : undefined}
                        />
                        {editError && (
                            <p id="edit-error-desc" className="text-sm text-destructive">{editError}</p>
                        )}
                    </div>
                 ) : (
                    <pre className="p-4 bg-muted rounded-md overflow-auto text-sm">
                      {/* Display data including the ID */}
                      {JSON.stringify({ ...currentData, id: entryId }, null, 2)}
                    </pre>
                 )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                 {isEditing ? (
                    <div className="flex gap-2">
                        <Button onClick={handleSaveChanges} disabled={isSaving || !!editError}>
                           {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                           {isSaving ? 'Saving...' : 'Save Changes'}
                         </Button>
                         <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                             <XCircle className="mr-2 h-4 w-4"/> Cancel
                         </Button>
                    </div>
                 ) : (
                    <div className="flex gap-2">
                        <Button onClick={handleEditClick} disabled={isActionPending}>
                             <Edit className="mr-2 h-4 w-4" /> Edit
                         </Button>
                         <Button onClick={handleCleanData} disabled={isActionPending}>
                           {isCleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                           {isCleaning ? 'Cleaning...' : 'Clean Data with AI'}
                         </Button>
                    </div>
                 )}
            </CardFooter>
        </Card>


      {isCleaning && (
         <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="ml-2 text-muted-foreground">Generating cleaning suggestions...</p>
         </div>
      )}

      {/* AI Cleaning Suggestion Card */}
      {cleanedDataSuggestion && !isEditing && (
        <Card>
            <CardHeader>
                <CardTitle>AI Cleaning Suggestion</CardTitle>
                <CardDescription>Review and edit the suggestion below. Click Apply to save.</CardDescription>
            </CardHeader>
          <CardContent className="space-y-2">
             <Label htmlFor="suggestion-textarea">Suggested Cleaned Data (JSON)</Label>
             <Textarea
                id="suggestion-textarea"
               value={JSON.stringify(cleanedDataSuggestion, null, 2)}
               onChange={handleSuggestionChange}
               className="min-h-[200px] font-mono text-sm"
               disabled={isSaving}
             />
          </CardContent>
           <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCleanedDataSuggestion(null)} disabled={isSaving}>
                    Discard
                </Button>
                 <Button onClick={handleApplySuggestion} disabled={isSaving}>
                   {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                   {isSaving ? 'Applying...' : 'Apply Suggestion'}
                 </Button>
           </CardFooter>
        </Card>
      )}

      {/* Related Data Entries Card */}
      <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>Related Data Entries</CardTitle>
                    <CardDescription>Define relationships and view details of linked entries (Source ID: {entryId}).</CardDescription>
                </div>
                {relatedData.length > 0 && !isEditingHeaders && (
                     <Button variant="outline" size="sm" onClick={handleEditHeadersClick} disabled={isActionPending}>
                        <Columns3 className="mr-2 h-4 w-4" /> Edit Headers
                     </Button>
                )}
                {isEditingHeaders && (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleCancelHeaderEdit}>
                           <XCircle className="mr-2 h-4 w-4"/> Cancel
                        </Button>
                         <Button size="sm" onClick={handleSaveHeaders}>
                           <CheckSquare className="mr-2 h-4 w-4"/> Save Headers
                        </Button>
                    </div>
                )}
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
             {relationshipError && (
                 <Alert variant="destructive">
                   <AlertTitle>Relationship Error</AlertTitle>
                   <AlertDescription>{relationshipError}</AlertDescription>
                 </Alert>
              )}

             {/* Add Relationship Form */}
             <div className="flex items-end gap-2">
                <div className="flex-grow space-y-1">
                    <Label htmlFor="target-entry-id">Target Entry ID</Label>
                    <Input
                        id="target-entry-id"
                        placeholder="Enter ID of related entry"
                        value={targetEntryId}
                        onChange={(e) => setTargetEntryId(e.target.value)}
                        disabled={isAddingRelationship || isActionPending}
                    />
                </div>
                 <Button onClick={handleAddRelationship} disabled={isAddingRelationship || isActionPending}>
                    {isAddingRelationship ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    {isAddingRelationship ? 'Adding...' : 'Add Relationship'}
                 </Button>
             </div>

             {/* Related Data Table */}
            <ScrollArea className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                        {isEditingHeaders ? (
                            tempHeaders.map((header, index) => (
                                <TableHead key={`edit-header-${index}`}>
                                    <Input
                                        value={header}
                                        onChange={(e) => handleHeaderInputChange(index, e.target.value)}
                                        className="h-8 text-sm"
                                        placeholder="Header Name"
                                    />
                                </TableHead>
                            ))
                        ) : (
                            relatedHeaders.map((header) => (
                                <TableHead key={header} className="whitespace-nowrap">
                                    {/* Capitalize header */}
                                    {header.charAt(0).toUpperCase() + header.slice(1)}
                                </TableHead>
                            ))
                        )}
                        {!isEditingHeaders && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(isLoadingRelationships || isLoadingRelatedData) ? (
                       <TableRow>
                            <TableCell colSpan={relatedHeaders.length + 1} className="h-24 text-center">
                                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                <p className="mt-2 text-muted-foreground">Loading related data...</p>
                            </TableCell>
                        </TableRow>
                    ) : relatedData.length > 0 ? (
                      // Ensure relatedData has string IDs before mapping
                      relatedData.map((entry) => (
                        <TableRow key={entry.id}>
                           {relatedHeaders.map((header) => (
                               <TableCell key={`${entry.id}-${header}`} className="whitespace-nowrap max-w-[200px] truncate">
                                    {typeof entry[header] === 'object' && entry[header] !== null
                                     ? JSON.stringify(entry[header])
                                     : String(entry[header] ?? '')}
                                </TableCell>
                            ))}
                           <TableCell className="text-right">
                               <Button variant="ghost" size="sm" asChild>
                                  {/* Link uses string ID */}
                                  <Link href={`/data/${entry.id}`} target="_blank" rel="noopener noreferrer">
                                    View
                                  </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                      ))
                    ) : relationships.length > 0 ? (
                        <TableRow>
                             <TableCell colSpan={relatedHeaders.length + 1} className="h-24 text-center text-muted-foreground">
                                Related entry data not found or failed to load.
                             </TableCell>
                        </TableRow>
                     ) : (
                      <TableRow>
                        <TableCell colSpan={relatedHeaders.length + 1} className="h-24 text-center">
                          No relationships defined for this entry yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
