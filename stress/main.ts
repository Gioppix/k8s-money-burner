const CLOSE_EVERY_MS = 100;
let lastConnectionClosed = 0;

interface BaseLogLine {
    startedAtMs: number;
    completedAtMs: number;
}

type LogLine = BaseLogLine &
    ({ failed: true } | { failed: false; worker_id: string });

let concurrent_limit = 10;
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

interface ConcurrentLimitPhase {
    durationSeconds: number;
    concurrentLimit: number;
}

const CONCURRENT_LIMIT_SCHEDULE: ConcurrentLimitPhase[] = [
    { durationSeconds: 0, concurrentLimit: 5 },
    { durationSeconds: 60 * 7, concurrentLimit: 5 },
    { durationSeconds: 60 * 3, concurrentLimit: 30 },
    { durationSeconds: 60 * 6, concurrentLimit: 30 },
    { durationSeconds: 60 * 5, concurrentLimit: 70 },
    { durationSeconds: 60 * 6, concurrentLimit: 70 },
    { durationSeconds: 60 * 5, concurrentLimit: 20 },
    { durationSeconds: 60 * 6, concurrentLimit: 20 },
    { durationSeconds: 60 * 5, concurrentLimit: 20 },
    { durationSeconds: 60 * 5, concurrentLimit: 70 },
    { durationSeconds: 60 * 6, concurrentLimit: 30 },
    { durationSeconds: 60 * 6, concurrentLimit: 5 },
];

// Update concurrent limit based on schedule
const scheduleStartTime = Date.now();
setInterval(() => {
    const elapsedSeconds = (Date.now() - scheduleStartTime) / 1000;
    let cumulativeSeconds = 0;

    for (let i = 0; i < CONCURRENT_LIMIT_SCHEDULE.length; i++) {
        const phase = CONCURRENT_LIMIT_SCHEDULE[i];
        const phaseStartTime = cumulativeSeconds;
        const phaseEndTime = cumulativeSeconds + phase.durationSeconds;

        if (elapsedSeconds < phaseEndTime) {
            if (i === 0) {
                // First phase: use the phase's concurrent limit directly
                concurrent_limit = phase.concurrentLimit;
            } else {
                // Interpolate between previous phase and current phase
                const prevPhase = CONCURRENT_LIMIT_SCHEDULE[i - 1];
                const t =
                    (elapsedSeconds - phaseStartTime) / phase.durationSeconds;
                concurrent_limit = Math.round(
                    prevPhase.concurrentLimit +
                        (phase.concurrentLimit - prevPhase.concurrentLimit) * t,
                );
            }
            break;
        }

        cumulativeSeconds = phaseEndTime;
    }

    // Exit if all phases are complete
    const totalDuration = CONCURRENT_LIMIT_SCHEDULE.reduce(
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
    const recentRequests = [];
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
    console.log(`  Concurrent Limit: ${concurrent_limit} (adjustable)`);
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
    let activeRequests = 0;

    function scheduler() {
        while (activeRequests < concurrent_limit) {
            activeRequests++;
            const requestId = requestsStarted++;
            fetchWithTiming(40, requestId).then(() => {
                requestsCompleted++;
                activeRequests--;
                scheduler();
            });
        }
    }

    // Run scheduler periodically
    setInterval(() => {
        scheduler();
    }, 100);
});

console.log();

export {};
