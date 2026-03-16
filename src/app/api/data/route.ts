
// src/app/api/data/route.ts
import { NextResponse } from 'next/server';

// This API route is no longer the primary way to upload data,
// as the frontend now uses Server Actions (uploadDataAction, updateDataAction, createNewDatasetAction)
// which interact with the active dataset managed by the database service.
// Keep the file for potential future API needs or remove if definitely unused.

// Example: Optional GET handler (if needed later)
export async function GET() {
  // Implementation for fetching data via API (if ever needed)
  // Currently, data fetching is done via Server Components and Server Actions.
  return NextResponse.json({ message: 'GET method not implemented. Data access via Server Actions.' });
}

// Remove the POST handler as it's replaced by Server Actions
// export async function POST(request: NextRequest) {
//   // ... previous POST logic ...
// }
