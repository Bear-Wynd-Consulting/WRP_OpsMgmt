
// src/components/data-upload-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import Papa from "papaparse";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import type { DataEntry } from "@/services/types"; // Import DataEntry type
import { DataUploadConfirmationDialog } from "@/components/data-upload-confirmation-dialog";

// Extended schema to handle either JSON or CSV
const formSchema = z.object({
  jsonData: z.string().optional(),
  csvData: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DataUploadFormProps {
    allDatasetNames: string[]; // Receive all dataset names
}

export function DataUploadForm({ allDatasetNames }: DataUploadFormProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<DataEntry | DataEntry[] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("json");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jsonData: "",
      csvData: "",
    },
  });

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setParsedData(null);
    form.reset();
  };

  async function onSubmit(values: FormData) {
    setIsProcessing(true);
    setError(null);
    try {
      let data: DataEntry | DataEntry[];

      if (activeTab === "json") {
        if (!values.jsonData || values.jsonData.trim() === "") {
          throw new Error("JSON data cannot be empty.");
        }
        data = JSON.parse(values.jsonData);
        if (typeof data !== 'object' || data === null) {
          throw new Error("Parsed data is not a valid object or array.");
        }
      } else if (activeTab === "csv") {
        if (!values.csvData || values.csvData.trim() === "") {
          throw new Error("CSV data cannot be empty.");
        }
        const results = Papa.parse(values.csvData, { header: true, skipEmptyLines: true });
        if (results.errors && results.errors.length > 0) {
          console.error("CSV Parsing errors:", results.errors);
          throw new Error(`CSV parsing error on row ${results.errors[0].row}: ${results.errors[0].message}`);
        }
        data = results.data as DataEntry[];
      } else {
         throw new Error("Invalid input tab selected.");
      }

      console.log("Parsed data:", data);
      setParsedData(data);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Parsing or validation failed:", error);
      let errorMessage = "Invalid data format or structure.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Invalid Data",
        description: errorMessage,
      });
      setIsProcessing(false); // Stop processing on parse error
    }
  }

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="json" disabled={isProcessing || isDialogOpen}>JSON</TabsTrigger>
          <TabsTrigger value="csv" disabled={isProcessing || isDialogOpen}>CSV</TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <TabsContent value="json">
              <FormField
                control={form.control}
                name="jsonData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>JSON Data</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Enter your data in JSON format. E.g., {"name": "Example", "value": 123} or [{"name": "Item 1", "value": 10}, {"name": "Item 2", "value": 20}]'
                        className="min-h-[150px] font-mono text-sm"
                        {...field}
                        aria-describedby="jsonData-description"
                        aria-invalid={!!form.formState.errors.jsonData || !!error}
                        disabled={isProcessing || isDialogOpen}
                      />
                    </FormControl>
                    <p id="jsonData-description" className="text-sm text-muted-foreground">
                      Enter a single JSON object or an array of JSON objects.
                    </p>
                    <FormMessage />
                    {error && !form.formState.errors.jsonData && (
                        <p className="text-sm font-medium text-destructive">{error}</p>
                    )}
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="csv">
              <FormField
                control={form.control}
                name="csvData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CSV Data</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`id,name,value\n1,Item 1,10\n2,Item 2,20`}
                        className="min-h-[150px] font-mono text-sm"
                        {...field}
                        aria-describedby="csvData-description"
                        aria-invalid={!!form.formState.errors.csvData || !!error}
                        disabled={isProcessing || isDialogOpen}
                      />
                    </FormControl>
                    <p id="csvData-description" className="text-sm text-muted-foreground">
                      Enter CSV data with a header row.
                    </p>
                    <FormMessage />
                    {error && !form.formState.errors.csvData && (
                        <p className="text-sm font-medium text-destructive">{error}</p>
                    )}
                  </FormItem>
                )}
              />
            </TabsContent>

            <Button type="submit" disabled={isProcessing || isDialogOpen}>
              <Upload className="mr-2 h-4 w-4" />
              {isProcessing ? "Processing..." : isDialogOpen ? "Confirming..." : "Upload Data"}
            </Button>
          </form>
        </Form>
      </Tabs>

      {/* Render the confirmation dialog, passing dataset names */}
       <DataUploadConfirmationDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          data={parsedData}
          onProcessingChange={setIsProcessing}
          allDatasetNames={allDatasetNames} // Pass the list of names
       />
    </>
  );
}
