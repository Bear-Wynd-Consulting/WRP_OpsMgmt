'use client';

import React, { useState } from 'react';
import { testDbConnectionAction, DbConnectionTestResult } from '@/actions/db-test-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, AlertCircle, CheckCircle2 } from 'lucide-react';

export function DbConnectionTestWidget() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<DbConnectionTestResult | null>(null);

    const handleTestConnection = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await testDbConnectionAction();
            setResult(res);
        } catch (error: any) {
            setResult({
                success: false,
                message: 'An unexpected error occurred.',
                error: error.message || String(error)
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Database Connection Test
                </CardTitle>
                <CardDescription>
                    Verify the connection to the PostgreSQL database and view the public schema.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={handleTestConnection} disabled={loading}>
                    {loading ? 'Testing...' : 'Test Connection'}
                </Button>

                {result && (
                    <div className="space-y-4 mt-4">
                        <div className={`p-4 rounded-md flex items-start gap-3 ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                            {result.success ? (
                                <CheckCircle2 className="h-5 w-5 mt-0.5" />
                            ) : (
                                <AlertCircle className="h-5 w-5 mt-0.5" />
                            )}
                            <div>
                                <h4 className="font-semibold">{result.message}</h4>
                                {!result.success && result.error && (
                                    <p className="text-sm mt-1 font-mono break-all">{result.error}</p>
                                )}
                            </div>
                        </div>

                        {result.success && result.schema && result.schema.length > 0 && (
                            <div className="border rounded-md">
                                <ScrollArea className="h-[300px] w-full">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-secondary z-10">
                                            <TableRow>
                                                <TableHead>Table Name</TableHead>
                                                <TableHead>Column Name</TableHead>
                                                <TableHead>Data Type</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {result.schema.map((col, i) => (
                                                <TableRow key={`${col.table_name}-${col.column_name}-${i}`}>
                                                    <TableCell className="font-medium">{col.table_name}</TableCell>
                                                    <TableCell>{col.column_name}</TableCell>
                                                    <TableCell>{col.data_type}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>
                        )}

                        {result.success && result.schema && result.schema.length === 0 && (
                             <p className="text-sm text-muted-foreground italic">No tables found in the public schema.</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
