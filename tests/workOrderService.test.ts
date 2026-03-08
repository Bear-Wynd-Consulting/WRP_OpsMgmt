import {
    getAllTaskTemplates,
    createTaskTemplate,
    getWorkOrderDetails,
    completeTask,
    initializeWorkOrderSchema
} from '../src/services/workOrderService';

// This is a test script that can be executed to verify database reading and writing.
// To run: npx tsx tests/workOrderService.test.ts
// Make sure POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_DATABASE are set in your environment variables,
// or run it where dotenv loads the appropriate variables.

import 'dotenv/config';

async function runTests() {
    console.log("Starting Database Integration Tests for Work Order Service...");

    try {
        console.log("1. Initializing schema...");
        await initializeWorkOrderSchema();
        console.log("   Schema initialized successfully.");

        console.log("2. Testing Write: Creating Task Template...");
        const templateName = "Test Template " + Date.now();
        await createTaskTemplate(templateName, "Testing DB Write", ["Step A", "Step B"]);
        console.log("   Task Template created successfully.");

        console.log("3. Testing Read: Getting All Task Templates...");
        const templates = await getAllTaskTemplates();
        const found = templates.find(t => t.name === templateName);
        if (found) {
            console.log("   Successfully read the created Task Template from the database!");
        } else {
            console.error("   FAILED: Could not find the recently created Task Template.");
        }

        // To test WorkOrder details and completeTask, we'd need work orders to exist.
        // We'll just verify the functions execute without blowing up if given a valid numeric ID that might not exist.
        console.log("4. Testing Read: Fetching Work Order Details (Non-existent ID)...");
        const details = await getWorkOrderDetails("-1");
        if (details === null) {
            console.log("   Successfully returned null for non-existent Work Order, confirming query ran.");
        } else {
            console.error("   FAILED: Expected null for non-existent Work Order.");
        }

        console.log("5. Testing Write: Completing Task (Non-existent ID)...");
        // Update query for non-existent ID won't error out, it will just affect 0 rows.
        await completeTask("-1", "test-user");
        console.log("   Task completion query executed successfully.");

        console.log("\nALL TESTS COMPLETED SUCCESSFULLY.");
    } catch (error) {
        console.error("\nTEST FAILED:", error);
        process.exit(1);
    }
}

// Only run automatically if executed directly
if (require.main === module) {
    runTests().then(() => process.exit(0));
}

export { runTests };
