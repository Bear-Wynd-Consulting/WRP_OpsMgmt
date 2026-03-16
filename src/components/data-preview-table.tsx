
// src/components/data-preview-table.tsx
"use client";

import type { DataEntry, RelationshipEntry } from "@/services/types"; // Updated import path
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";

interface DataPreviewTableProps {
  data: DataEntry[]; // Expects DataEntry with string id
  relationships: RelationshipEntry[]; // Expects RelationshipEntry with string ids
}

export function DataPreviewTable({ data, relationships }: DataPreviewTableProps) {
  // Derive headers, ensuring 'id' is handled correctly
  const allKeys = data.reduce((keys, entry) => {
    // Use Object.keys on the entry itself (which includes 'id')
    Object.keys(entry).forEach(key => keys.add(key));
    return keys;
  }, new Set<string>());

  let headers = Array.from(allKeys);
  // Ensure 'id' comes first if present
  if (headers.includes('id')) {
    headers = ['id', ...headers.filter(h => h !== 'id')];
  }
  // Simplify headers (optional, based on previous logic)
  const simpleHeaders = headers.filter(header => {
      if (data.length > 0 && data[0] && typeof data[0] === 'object') {
        const firstValue = data[0][header];
        // Keep simple types or null, filter out complex objects/arrays
        return typeof firstValue !== 'object' || firstValue === null;
      }
      return true; // Keep if no data to check type
  });

  // Define display headers including the new 'Relationships' column
  const displayHeaders = ['id', 'Relationships', ...simpleHeaders.filter(h => h !== 'id'), 'Actions'];

  // Helper to get target IDs for a given source ID (all as strings)
  const getRelatedTargetIds = (entryId: string): string[] => {
    return relationships
      .filter(rel => rel.source_entry_id === entryId)
      .map(rel => rel.target_entry_id); // target_entry_id is already a string
  };

  return (
    <ScrollArea className="rounded-md border w-full">
      <Table className="min-w-full">
        <TableCaption>
          {data.length === 0 ? "No data available matching the current criteria." : "A preview of the current data. Click 'View / Clean' to see details."}
        </TableCaption>
        <TableHeader>
          <TableRow>
            {displayHeaders.map((header) => (
              <TableHead key={header} className="whitespace-nowrap sticky top-0 bg-background z-10">
                {/* Capitalize header, handle 'ID' case */}
                {header === 'id' ? 'ID' : (header.charAt(0).toUpperCase() + header.slice(1))}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((entry, index) => {
               // entry.id is guaranteed to be a string by the type
               const relatedIds = getRelatedTargetIds(entry.id);
               return (
                 <TableRow key={entry.id}>
                   {/* ID Column */}
                   <TableCell className="whitespace-nowrap max-w-[150px] truncate font-medium">
                      {entry.id}
                   </TableCell>
                   {/* Relationships Column */}
                   <TableCell className="whitespace-nowrap max-w-[200px]">
                    {relatedIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {relatedIds.map(targetId => (
                          <Link key={targetId} href={`/data/${targetId}`} className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded hover:bg-accent hover:text-accent-foreground transition-colors">
                            {targetId}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">None</span>
                    )}
                   </TableCell>
                   {/* Data Columns (excluding ID) */}
                  {simpleHeaders.filter(h => h !== 'id').map((header) => (
                    <TableCell key={`${entry.id}-${header}`} className="whitespace-nowrap max-w-[200px] truncate">
                       {/* Access data using header key */}
                       {typeof entry[header] === 'object' && entry[header] !== null
                         ? JSON.stringify(entry[header]) // Stringify complex objects/arrays
                         : String(entry[header] ?? '')} {/* Handle null/undefined */}
                    </TableCell>
                  ))}
                  {/* Actions Column */}
                  <TableCell className="whitespace-nowrap text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/data/${entry.id}`}>
                        <Edit className="mr-1 h-3 w-3" /> View / Clean
                      </Link>
                    </Button>
                  </TableCell>
                 </TableRow>
               );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={displayHeaders.length} className="h-24 text-center">
                No data to display matching the current filter or criteria.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
