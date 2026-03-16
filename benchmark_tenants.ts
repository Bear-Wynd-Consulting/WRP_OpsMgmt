import { fetchTenants } from './src/services/workOrderActions';

async function runBenchmark() {
    console.log("Starting benchmark...");
    const iterations = 100;

    // Warmup
    for (let i = 0; i < 5; i++) {
        await fetchTenants();
    }

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        await fetchTenants();
    }
    const end = performance.now();

    const totalTime = end - start;
    const avgTime = totalTime / iterations;

    console.log(`Executed ${iterations} iterations.`);
    console.log(`Total time: ${totalTime.toFixed(2)} ms`);
    console.log(`Average time per call: ${avgTime.toFixed(2)} ms`);

    process.exit(0);
}

runBenchmark().catch(console.error);
