async function fetchWithTiming(
    pathParam: number,
    requestId: number,
): Promise<number> {
    const startTime = performance.now();
    try {
        // Every once in a while close connections to pick up new nodes from the load balancer
        await fetch(`http://91.98.7.111/burn/${pathParam}`, {
            headers: Math.random() < 0.01 ? { Connection: "close" } : {},
        });

        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(
            `Request ${requestId} started at ${startTime}, ended at ${endTime}, duration: ${duration}ms`,
        );
        return duration;
    } catch (_error) {
        const endTime = performance.now();
        console.log(
            `Request ${requestId} started at ${startTime}, ended at ${endTime}, failed`,
        );
        return -1;
    }
}

const CONCURRENT_LIMIT = 150;
const TOTAL_REQUESTS = 1000000;
let requestsCompleted = 0;
let requestsStarted = 0;

const results: number[] = [];

await new Promise<void>((resolve) => {
    function scheduleRequest() {
        if (requestsStarted >= TOTAL_REQUESTS) {
            return;
        }

        const requestId = requestsStarted++;
        fetchWithTiming(40, requestId).then((duration) => {
            results.push(duration);
            requestsCompleted++;

            if (requestsCompleted === TOTAL_REQUESTS) {
                resolve();
            } else {
                scheduleRequest();
            }
        });
    }

    // Start initial batch of concurrent requests
    for (let i = 0; i < CONCURRENT_LIMIT; i++) {
        scheduleRequest();
    }
});

console.log(results);

export {};
