fetch(`http://127.0.0.1:${process.env.PORT || 3000}/api/health`, { signal: AbortSignal.timeout(4000) })
    .then(response => { process.exit(response.ok ? 0 : 1); })
    .catch(() => { process.exit(1); });
