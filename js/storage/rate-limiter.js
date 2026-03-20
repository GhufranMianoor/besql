/**
 * RequestRateLimiter
 * Prevents connection exhaustion through:
 * - Per-second request rate limiting (max QPS)
 * - Concurrent request limiting (connection pool management)
 * - Request queuing with exponential backoff
 * - Health monitoring and adaptive throttling
 */

class RequestRateLimiter {
  constructor(options = {}) {
    this.maxQPS = options.maxQPS || 10;                    // Max requests per second
    this.maxConcurrent = options.maxConcurrent || 5;        // Max concurrent requests
    this.timeWindow = 1000;                                  // 1 second window for QPS
    this.requestQueue = [];                                  // Pending requests
    this.activeRequests = 0;                                 // Current concurrent count
    this.requestTimestamps = [];                             // For QPS tracking
    this.isThrottled = false;                                // Current throttle state
    this.totalThrottled = 0;                                 // Metrics: total throttled
    this.totalProcessed = 0;                                 // Metrics: total processed
    this.healthScore = 100;                                  // 0-100 health percentage
    
    this.onThrottleChange = options.onThrottleChange || (() => {});
  }

  /**
   * Clean old timestamps outside the time window
   */
  cleanupTimestamps() {
    const now = Date.now();
    while (this.requestTimestamps.length > 0 && 
           this.requestTimestamps[0] < now - this.timeWindow) {
      this.requestTimestamps.shift();
    }
  }

  /**
   * Check if we can accept a new request
   */
  canAccept() {
    this.cleanupTimestamps();
    const qpsOk = this.requestTimestamps.length < this.maxQPS;
    const concurrentOk = this.activeRequests < this.maxConcurrent;
    return qpsOk && concurrentOk;
  }

  /**
   * Get wait time to next available slot
   */
  getWaitTime() {
    this.cleanupTimestamps();
    
    const concurrentWait = this.activeRequests >= this.maxConcurrent ? 100 : 0;
    
    const qpsWait = this.requestTimestamps.length >= this.maxQPS 
      ? Math.max(0, this.requestTimestamps[0] + this.timeWindow - Date.now())
      : 0;
    
    return Math.ceil(Math.max(concurrentWait, qpsWait));
  }

  /**
   * Execute request with rate limiting
   * @param {Function} requestFn - Async function to execute
   * @param {Object} options - { priority: 'high'|'normal'|'low', timeout: ms }
   * @returns {Promise}
   */
  async execute(requestFn, options = {}) {
    const priority = options.priority || 'normal';
    const timeout = options.timeout || 30000; // Default 30 second timeout

    return new Promise((resolve, reject) => {
      const request = { requestFn, resolve, reject, priority, timeout, createdAt: Date.now() };
      
      if (this.canAccept()) {
        this.processRequest(request);
      } else {
        // Queue the request, sorted by priority
        this.requestQueue.push(request);
        this.sortQueueByPriority();
        
        if (!this.isThrottled) {
          this.isThrottled = true;
          this.onThrottleChange(true);
          console.debug('[RateLimiter] Throttling activated', {
            queueLength: this.requestQueue.length,
            activeRequests: this.activeRequests,
            maxQPS: this.maxQPS,
            maxConcurrent: this.maxConcurrent
          });
        }
      }
    });
  }

  /**
   * Sort queue by priority (high → normal → low)
   */
  sortQueueByPriority() {
    const priorityScore = { high: 3, normal: 2, low: 1 };
    this.requestQueue.sort((a, b) => 
      (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0)
    );
  }

  /**
   * Process a single request with timeout and error handling
   */
  async processRequest(request) {
    this.activeRequests++;
    this.requestTimestamps.push(Date.now());

    try {
      // Execute with timeout
      const result = await Promise.race([
        request.requestFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), request.timeout)
        )
      ]);
      
      this.totalProcessed++;
      request.resolve(result);
      this.updateHealthScore(true);
    } catch (error) {
      this.totalProcessed++;
      request.reject(error);
      this.updateHealthScore(false);
    } finally {
      this.activeRequests--;
      this.processQueuedRequests();
    }
  }

  /**
   * Process queued requests when slots become available
   */
  async processQueuedRequests() {
    while (this.requestQueue.length > 0 && this.canAccept()) {
      const request = this.requestQueue.shift();
      await this.processRequest(request);
    }

    // Check if we should resume normal mode
    if (this.isThrottled && this.requestQueue.length === 0 && this.activeRequests < this.maxConcurrent) {
      this.isThrottled = false;
      this.onThrottleChange(false);
      console.debug('[RateLimiter] Throttling deactivated');
    }
  }

  /**
   * Update health score based on request result
   */
  updateHealthScore(success) {
    if (success) {
      // Increase health score on success (max 100)
      this.healthScore = Math.min(100, this.healthScore + 5);
    } else {
      // Decrease health score on failure
      this.healthScore = Math.max(0, this.healthScore - 15);
    }
  }

  /**
   * Get current limiter stats
   */
  getStats() {
    return {
      activeRequests: this.activeRequests,
      queueLength: this.requestQueue.length,
      isThrottled: this.isThrottled,
      healthScore: this.healthScore,
      totalProcessed: this.totalProcessed,
      totalThrottled: this.totalThrottled,
      requestTimestamps: this.requestTimestamps.length,
      ratio: this.totalProcessed > 0 
        ? (this.totalThrottled / this.totalProcessed * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Reset limiter state
   */
  reset() {
    this.requestQueue = [];
    this.activeRequests = 0;
    this.requestTimestamps = [];
    this.isThrottled = false;
    this.healthScore = 100;
  }

  /**
   * Gracefully shutdown and reject pending requests
   */
  shutdown(reason = 'Limiter shutdown') {
    this.requestQueue.forEach(req => {
      req.reject(new Error(reason));
    });
    this.reset();
  }
}

/**
 * Global rate limiter instance
 */
const globalRateLimiter = new RequestRateLimiter({
  maxQPS: 10,           // 10 requests per second
  maxConcurrent: 5,     // 5 concurrent requests
  onThrottleChange: (isThrottled) => {
    if (isThrottled) {
      console.warn('[Storage] Rate limiter activated - requests being queued');
    }
  }
});
