const CLOSE_EVERY_MS = 100;
let lastConnectionClosed = 0;

interface BaseLogLine {
    startedAtMs: number;
    completedAtMs: number;
}

type LogLine = BaseLogLine &
    ({ failed: true } | { failed: false; worker_id: string });

let requests_per_second = 10;
let requestsCompleted = 0;
let requestsStarted = 0;

const LOG_LINES: LogLine[] = [];

function addLogLine(logLine: LogLine) {
    LOG_LINES.push(logLine);
}

// Write LOG_LINES to disk every 1 second
setInterval(async () => {
    await Deno.writeTextFile(
        "./results.json",
        JSON.stringify(LOG_LINES, null, 2),
    );
}, 1000);

interface RequestsPerSecondPhase {
    durationSeconds: number;
    requestsPerSecond: number;
}

// Keep roughly same workload as in concurrency-based benchmark.
// fib(40) -> fib(38) means 1/4 of the work, as it's exponential.
// 1 concurrent req ~ 2 req/s using 500ms of avg latency
// Overall multiplier around 8; make it 7 just in case
const MULTIPLIER = 7;

const REQUESTS_PER_SECOND_SCHEDULE: RequestsPerSecondPhase[] = [
    { durationSeconds: 0, requestsPerSecond: 5 * MULTIPLIER },
    { durationSeconds: 60 * 7, requestsPerSecond: 5 * MULTIPLIER },
    { durationSeconds: 60 * 3, requestsPerSecond: 30 * MULTIPLIER },
    { durationSeconds: 60 * 6, requestsPerSecond: 30 * MULTIPLIER },
    { durationSeconds: 60 * 5, requestsPerSecond: 70 * MULTIPLIER },
    { durationSeconds: 60 * 6, requestsPerSecond: 70 * MULTIPLIER },
    { durationSeconds: 60 * 5, requestsPerSecond: 20 * MULTIPLIER },
    { durationSeconds: 60 * 6, requestsPerSecond: 20 * MULTIPLIER },
    { durationSeconds: 60 * 5, requestsPerSecond: 20 * MULTIPLIER },
    { durationSeconds: 60 * 5, requestsPerSecond: 70 * MULTIPLIER },
    { durationSeconds: 60 * 6, requestsPerSecond: 30 * MULTIPLIER },
    { durationSeconds: 60 * 6, requestsPerSecond: 5 * MULTIPLIER },
];

// Update requests per second based on schedule
const scheduleStartTime = Date.now();
setInterval(() => {
    const elapsedSeconds = (Date.now() - scheduleStartTime) / 1000;
    let cumulativeSeconds = 0;

    for (let i = 0; i < REQUESTS_PER_SECOND_SCHEDULE.length; i++) {
        const phase = REQUESTS_PER_SECOND_SCHEDULE[i];
        const phaseStartTime = cumulativeSeconds;
        const phaseEndTime = cumulativeSeconds + phase.durationSeconds;

        if (elapsedSeconds < phaseEndTime) {
            if (i === 0) {
                // First phase: use the phase's requests per second directly
                requests_per_second = phase.requestsPerSecond;
            } else {
                // Interpolate between previous phase and current phase
                const prevPhase = REQUESTS_PER_SECOND_SCHEDULE[i - 1];
                const t =
                    (elapsedSeconds - phaseStartTime) / phase.durationSeconds;
                requests_per_second = Math.round(
                    prevPhase.requestsPerSecond +
                        (phase.requestsPerSecond -
                            prevPhase.requestsPerSecond) *
                            t,
                );
            }
            break;
        }

        cumulativeSeconds = phaseEndTime;
    }

    // Exit if all phases are complete
    const totalDuration = REQUESTS_PER_SECOND_SCHEDULE.reduce(
        (sum, phase) => sum + phase.durationSeconds,
        0,
    );
    if (elapsedSeconds >= totalDuration) {
        console.log("\nAll scheduled phases complete. Exiting...");
        Deno.exit(0);
    }
}, 1000);

// TUI - Print stats every second
setInterval(() => {
    const now = performance.now();
    const oneSecondAgo = now - 1000;

    // Filter to only requests completed in the last second
    const recentRequests: LogLine[] = [];
    for (let i = LOG_LINES.length - 1; i >= 0; i--) {
        if (LOG_LINES[i].completedAtMs >= oneSecondAgo) {
            recentRequests.push(LOG_LINES[i]);
        } else {
            break; // Stop once we hit older entries
        }
    }

    const requestsPerSecond = recentRequests.length;
    const successfulRequests = recentRequests.filter((line) => !line.failed);
    const successRate =
        recentRequests.length > 0
            ? (successfulRequests.length / recentRequests.length) * 100
            : 0;

    const latencies = successfulRequests.map(
        (line) => line.completedAtMs - line.startedAtMs,
    );
    const avgLatency =
        latencies.length > 0
            ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
            : 0;

    // Clear console and print stats
    console.clear();
    console.log("=".repeat(50));
    console.log("  LOAD TEST METRICS - LAST SECOND");
    console.log("=".repeat(50));
    console.log(`  Requests/sec:    ${requestsPerSecond}`);
    console.log(`  Avg Latency:     ${avgLatency.toFixed(2)} ms`);
    console.log(`  Success Rate:    ${successRate.toFixed(2)}%`);
    console.log(`  Total Completed: ${requestsCompleted}`);
    console.log(`  Target Req/s:    ${requests_per_second} (adjustable)`);
    console.log("=".repeat(50));
    console.log("\nPress '+' to increase, '-' to decrease limit");
}, 1000);

async function fetchWithTiming(
    pathParam: number,
    _requestId: number,
): Promise<void> {
    const startTime = performance.now();
    try {
        // Every once in a while close connections to pick up new nodes from the load balancer
        const shouldClose = startTime - lastConnectionClosed > CLOSE_EVERY_MS;
        if (shouldClose) {
            lastConnectionClosed = startTime;
        }
        const result = await fetch(`http://91.98.7.111/burn/${pathParam}`, {
            headers: shouldClose ? { Connection: "close" } : {},
        });

        const body = await result.json();

        const endTime = performance.now();
        addLogLine({
            startedAtMs: startTime,
            completedAtMs: endTime,
            failed: false,
            worker_id: body.worker_id,
        });
    } catch (_error) {
        const endTime = performance.now();
        addLogLine({
            startedAtMs: startTime,
            completedAtMs: endTime,
            failed: true,
        });
    }
}

await new Promise<void>((_resolve) => {
    // Scheduler that thinks in requests per second
    // If we want 100 req/s, we need to execute one every 10ms
    function scheduler() {
        if (requests_per_second <= 0) return;

        const intervalMs = 1000 / requests_per_second;

        const requestId = requestsStarted++;
        fetchWithTiming(38, requestId).then(() => {
            requestsCompleted++;
        });

        setTimeout(scheduler, intervalMs);
    }

    // Start the scheduler
    scheduler();
});

export {};
