// /js/perf-flags.js
// Feature flags for safe perf tweaks. All default to true.
// Toggle to false if any regression is observed.
window.__PERF_FLAGS = {
  passiveListeners: true   // Step 1 only: passive event listeners
};
