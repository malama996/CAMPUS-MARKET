/**
 * Circuit Breaker — prevents cascading failures when a downstream service is unhealthy.
 * States: CLOSED (normal) → OPEN (failing, reject fast) → HALF_OPEN (test recovery)
 */
export class CircuitBreaker {
  constructor({ name, failureThreshold = 5, successThreshold = 2, timeout = 30000 } = {}) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.successThreshold = successThreshold;
    this.timeout = timeout;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }

  async fire(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new CircuitOpenError(`Circuit ${this.name} is OPEN — rejecting request`);
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      throw err;
    }
  }

  _onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
        console.log(`[CircuitBreaker] ${this.name} → CLOSED`);
      }
    }
  }

  _onFailure() {
    this.failureCount++;
    this.successCount = 0;
    if (this.failureCount >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.warn(`[CircuitBreaker] ${this.name} → OPEN (next attempt in ${this.timeout / 1000}s)`);
    }
  }

  get isOpen() { return this.state === 'OPEN'; }
  get isClosed() { return this.state === 'CLOSED'; }
}

export class CircuitOpenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CircuitOpenError';
    this.status = 503;
  }
}
