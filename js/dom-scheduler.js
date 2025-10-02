// DOM Scheduler - Forced Reflow Elimination
// Batches layout reads and writes to prevent layout thrashing

export function createRafScheduler() {
  let readQ = [];
  let writeQ = [];
  let scheduled = false;
  
  function flush() {
    scheduled = false;
    
    // READ phase - collect all layout measurements
    const rq = readQ;
    readQ = [];
    for (let i = 0; i < rq.length; i++) {
      rq[i]();
    }
    
    // WRITE phase - apply all style changes
    const wq = writeQ;
    writeQ = [];
    for (let i = 0; i < wq.length; i++) {
      wq[i]();
    }
  }
  
  function schedule() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(flush);
    }
  }
  
  return {
    read(fn) {
      readQ.push(fn);
      schedule();
    },
    write(fn) {
      writeQ.push(fn);
      schedule();
    }
  };
}

// Debounce utility for resize handlers
export const debounce = (fn, delay = 150) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// Throttle utility for scroll handlers
export const throttle = (fn, delay = 16) => {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
};
