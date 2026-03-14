
// src/components/data-upload-confirmation-dialog.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DataEntry } from "@/services/types"; // Import type
import { uploadDataAction, updateDataAction, createNewDatasetAction } from "@/actions/data-actions"; // Use createNewDatasetAction
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Save, PlusCircle, Edit, FilePlus2 } from "lucide-react";

interface DataUploadConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: DataEntry | DataEntry[] | null; // Data can be single entry or array
  onProcessingChange: (isProcessing: boolean) => void;
  allDatasetNames: string[]; // Added prop to receive existing names
}

type UploadAction = "addNew" | "amend" | "createNew";

export function DataUploadConfirmationDialog({
  isOpen,
  onClose,
  data,
  onProcessingChange,
  allDatasetNames, // Use the prop
}: DataUploadConfirmationDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [actionType, setActionType] = useState<UploadAction>("addNew");
  const [amendTargetId, setAmendTargetId] = useState<string>(""); // Amend target ID is a string
  const [newDatasetName, setNewDatasetName] = useState<string>(""); // State for new dataset name
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens or data changes
  useEffect(() => {
    if (isOpen) {
      setActionType("addNew");
      setAmendTargetId("");
      setNewDatasetName(""); // Reset new dataset name
      setError(null);
    }
  }, [isOpen]);


  const handleConfirm = () => {
    if (!data) {
      setError("No data to process.");
      return;
    }

    setError(null); // Clear previous errors

    // Validation for 'amend' action
    if (actionType === "amend") {
      if (!amendTargetId.trim()) {
          setError("Target Entry ID is required to amend data.");
          toast({ variant: "destructive", title: "Error", description: "Target Entry ID cannot be empty." });
          return;
      }
      if (Array.isArray(data)) {
          setError("Amending data requires uploading a single JSON object, not an array.");
          toast({ variant: "destructive", title: "Error", description: "Cannot amend with an array." });
          return;
      }
      // Ensure the uploaded data object doesn't contain an 'id' field itself for amendment
       if (data && typeof data === 'object' && 'id' in data) {
            setError("Uploaded data for amend action should not contain an 'id' field. The target ID is specified separately.");
            toast({ variant: "destructive", title: "Error", description: "Remove 'id' field from the JSON data for amend." });
            return;
       }
    }

    // Validation for 'createNew' action
    if (actionType === "createNew") {
        const trimmedName = newDatasetName.trim();
        if (!trimmedName) {
            setError("New Data Set Name is required.");
            toast({ variant: "destructive", title: "Error", description: "Please enter a name for the new data set." });
            return;
        }
        // Basic validation for potentially problematic characters (optional)
        if (/[^a-zA-Z0-9-_ ]/.test(trimmedName)) {
             setError("Dataset name contains invalid characters. Use letters, numbers, spaces, hyphens, or underscores.");
             toast({ variant: "destructive", title: "Invalid Name", description: "Dataset name has invalid characters." });
             return;
        }
         // Check if name already exists (case-insensitive check for robustness)
         // Allow replacement by removing this check, as createOrReplaceDataset handles it
         // if (allDatasetNames.some(name => name.toLowerCase() === trimmedName.toLowerCase())) {
         //    setError(`A data set named "${trimmedName}" already exists. Please choose a different name or amend existing data.`);
         //    toast({ variant: "destructive", title: "Name Exists", description: `Data set "${trimmedName}" already exists.` });
         //    return;
         // }
    }

    onProcessingChange(true); // Signal parent that processing started

    startTransition(async () => {
      let result: { success: boolean; message?: string; error?: string };

      try {
        if (actionType === "addNew") {
          console.log("Dialog: Calling uploadDataAction (Add New to active dataset)");
          // Prepare data for addNew - ensuring string IDs if present
          const dataToSend = Array.isArray(data)
            ? data.map(entry => {
                const { id, ...rest } = entry;
                return (id ? { id: String(id), ...rest } : rest) as DataEntry;
              })
            : (() => {
                const { id, ...rest } = data;
                return (id ? { id: String(id), ...rest } : rest) as DataEntry;
              })();
          result = await uploadDataAction(dataToSend); // Adds/updates in the currently active dataset
        } else if (actionType === "amend"){
          console.log(`Dialog: Calling updateDataAction (Amend ID: ${amendTargetId.trim()} in active dataset)`);
          // Data for amend should not have 'id', pass the target ID separately
          result = await updateDataAction(amendTargetId.trim(), data as Omit<DataEntry, 'id'>);
        } else { // actionType === "createNew"
            // Prepare data, ensuring string IDs if present, or generating new ones
            const dataArray = Array.isArray(data) ? data : [data];
            const processedData = dataArray.map(entry => {
                const { id, ...rest } = entry;
                return (id ? { id: String(id), ...rest } : rest) as DataEntry;
            });
            const datasetName = newDatasetName.trim();
            console.log(`Dialog: Calling createNewDatasetAction (Create/Replace: ${datasetName})`);
            result = await createNewDatasetAction(datasetName, processedData); // Creates/replaces and sets as active
        }

        if (result.success) {
          toast({
            title: "Success",
            description: result.message || "Data processed successfully.",
          });
          router.refresh(); // Refresh to show changes (e.g., new active dataset, updated preview)
          onClose(); // Close the dialog on success
        } else {
          setError(result.error || "Failed to process data.");
          toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "An unknown error occurred.",
          });
        }
      } catch (err) {
        console.error("Error during confirmation:", err);
        const message = err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(message);
        toast({
          variant: "destructive",
          title: "Processing Error",
          description: message,
        });
      } finally {
         onProcessingChange(false); // Signal parent that processing finished
      }
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        onClose();
    }
  };

  const getConfirmButtonLabel = () => {
    if (isPending) return "Processing...";
    switch (actionType) {
        case "addNew": return "Confirm Add/Update in Active Set"; // Updated label
        case "amend": return "Confirm Amend in Active Set"; // Updated label
        case "createNew": return "Confirm Create/Replace Set"; // Updated label
        default: return "Confirm";
    }
  }

    const getConfirmButtonIcon = () => {
    if (isPending) return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
    switch (actionType) {
        case "addNew": return <PlusCircle className="mr-2 h-4 w-4" />;
        case "amend": return <Edit className="mr-2 h-4 w-4" />;
        case "createNew": return <FilePlus2 className="mr-2 h-4 w-4" />;
        default: return <Save className="mr-2 h-4 w-4" />;
    }
  }

  const isConfirmDisabled = () => {
     if (isPending || !data) return true;
     if (actionType === 'amend' && (!amendTargetId.trim() || Array.isArray(data) || (data && typeof data === 'object' && 'id' in data) )) return true; // Disable if amending array or if data has ID
     if (actionType === 'createNew' && !newDatasetName.trim()) return true; // Disable if name is empty
     return false;
  }


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Confirm Data Upload</DialogTitle>
          <DialogDescription>
            Review the data and choose how to save it.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow border rounded-md p-4 my-4 bg-muted/50 overflow-auto">
             <Label>Uploaded Data Preview (JSON)</Label>
             <pre className="mt-2 text-xs font-mono whitespace-pre-wrap break-words">
                {data ? JSON.stringify(data, null, 2) : "No data loaded."}
             </pre>
        </ScrollArea>

        <div className="space-y-4">
          <RadioGroup
            value={actionType}
            onValueChange={(value: string) => setActionType(value as UploadAction)}
            className="flex flex-col space-y-1"
            disabled={isPending}
          >
            {/* Add New Option */}
            <div className="flex items-center space-x-3 space-y-0">
              <RadioGroupItem value="addNew" id="r1" />
              <Label htmlFor="r1" className="font-normal cursor-pointer flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-green-600" /> Add/Update in Active Set
              </Label>
            </div>
             <p className="text-xs text-muted-foreground pl-8">Adds new entries or updates existing entries (based on ID) in the current data set.</p>

            {/* Amend Option */}
            <div className="flex items-center space-x-3 space-y-0 mt-2">
              <RadioGroupItem value="amend" id="r2" />
              <Label htmlFor="r2" className="font-normal cursor-pointer flex items-center gap-2">
                 <Edit className="h-4 w-4 text-blue-600" /> Amend Specific Entry
              </Label>
            </div>
            <p className="text-xs text-muted-foreground pl-8">Replaces the data of a specific entry ID in the active data set (requires single object upload, without an 'id' field in the JSON).</p>


            {/* Create New Option */}
            <div className="flex items-center space-x-3 space-y-0 mt-2">
              <RadioGroupItem value="createNew" id="r3" />
              <Label htmlFor="r3" className="font-normal cursor-pointer flex items-center gap-2">
                 <FilePlus2 className="h-4 w-4 text-orange-600" /> Create/Replace Data Set
              </Label>
            </div>
             <p className="text-xs text-muted-foreground pl-8">Creates a new data set with the uploaded data or replaces an existing one with the same name. Sets it as active.</p>
          </RadioGroup>

           {/* Conditional Inputs */}
           <div className="pl-8 space-y-3">
               {actionType === "amend" && (
                 <div className="grid w-full max-w-sm items-center gap-1.5">
                   <Label htmlFor="amend-id">Target Entry ID to Amend</Label>
                   <Input
                     id="amend-id"
                     type="text"
                     placeholder="Enter the ID of the entry to replace"
                     value={amendTargetId}
                     onChange={(e) => setAmendTargetId(e.target.value)}
                     disabled={isPending}
                     className="bg-background"
                   />
                  {(data && typeof data === 'object' && 'id' in data && !Array.isArray(data)) && (
                       <p className="text-xs text-destructive">Remove 'id' field from JSON data when amending.</p>
                  )}
                  {Array.isArray(data) && (
                       <p className="text-xs text-destructive">Cannot amend with an array of objects.</p>
                  )}
                 </div>
               )}

               {actionType === "createNew" && (
                 <div className="grid w-full max-w-sm items-center gap-1.5">
                   <Label htmlFor="new-dataset-name">Data Set Name</Label>
                   <Input
                     id="new-dataset-name"
                     type="text"
                     placeholder="Enter name (will replace if exists)"
                     value={newDatasetName}
                     onChange={(e) => setNewDatasetName(e.target.value)}
                     disabled={isPending}
                     className="bg-background"
                     aria-describedby="new-dataset-name-desc"
                   />
                   <p id="new-dataset-name-desc" className="text-xs text-muted-foreground">
                     Allowed: letters, numbers, space, -, _
                   </p>
                    {allDatasetNames.some(name => name.toLowerCase() === newDatasetName.trim().toLowerCase()) && (
                         <p className="text-xs text-orange-600">Note: A data set with this name exists and will be replaced.</p>
                     )}
                 </div>
               )}
           </div>


          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleConfirm} disabled={isConfirmDisabled()}>
             {getConfirmButtonIcon()}
            {getConfirmButtonLabel()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
