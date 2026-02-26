{/* 
  * CITATION_START
  * Much of these configuration code are genrated using ClaudeAI
*/ }

module.exports = {
  // Desktop with fast network (your baseline)
  'desktop-fast': {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'desktop',
      throttling: {
        rttMs: 40,
        throughputKbps: 10 * 1024, // 10 Mbps
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 10 * 1024,
        uploadThroughputKbps: 10 * 1024,
      },
      screenEmulation: {
        mobile: false,
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        disabled: false,
      },
      emulatedUserAgent: false, // Use real desktop user agent
    },
  },

  // Desktop with medium network
  'desktop-medium': {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'desktop',
      throttling: {
        rttMs: 150,
        throughputKbps: 1.6 * 1024, // 1.6 Mbps (Fast 3G)
        cpuSlowdownMultiplier: 2,
        requestLatencyMs: 150,
        downloadThroughputKbps: 1.6 * 1024,
        uploadThroughputKbps: 750,
      },
      screenEmulation: {
        mobile: false,
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        disabled: false,
      },
    },
  },

  // Mobile with 4G
  'mobile-4g': {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'mobile',
      throttling: {
        rttMs: 150,
        throughputKbps: 1.6 * 1024, // 1.6 Mbps
        cpuSlowdownMultiplier: 4, // Simulate mobile CPU
        requestLatencyMs: 150,
        downloadThroughputKbps: 1.6 * 1024,
        uploadThroughputKbps: 750,
      },
      screenEmulation: {
        mobile: true,
        width: 412,
        height: 823,
        deviceScaleFactor: 2.625,
        disabled: false,
      },
    },
  },

  // Mobile with Slow 3G
  'mobile-slow-3g': {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'mobile',
      throttling: {
        rttMs: 400,
        throughputKbps: 400, // 400 Kbps
        cpuSlowdownMultiplier: 4,
        requestLatencyMs: 400,
        downloadThroughputKbps: 400,
        uploadThroughputKbps: 400,
      },
      screenEmulation: {
        mobile: true,
        width: 412,
        height: 823,
        deviceScaleFactor: 2.625,
        disabled: false,
      },
    },
  },

  // Low-end mobile with Slow 3G (worst case)
  'mobile-low-end': {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'mobile',
      throttling: {
        rttMs: 400,
        throughputKbps: 400,
        cpuSlowdownMultiplier: 6, // Very slow CPU
        requestLatencyMs: 400,
        downloadThroughputKbps: 400,
        uploadThroughputKbps: 400,
      },
      screenEmulation: {
        mobile: true,
        width: 412,
        height: 823,
        deviceScaleFactor: 2.625,
        disabled: false,
      },
    },
  },
};
{/* CITATION_END */ }
