/**
 * httpSinkTransport.js
 *
 * A winston transport that sends logs in batches to a cloud logging platform
 * over HTTPS (for example Better Stack). It is written so that the platform can
 * never hurt the API:
 *
 *   - Logs are buffered and sent every couple of seconds, not once per request.
 *   - A failed or slow send is dropped after a 5 second timeout. It is never
 *     thrown, so a logging outage cannot crash the API or slow a response.
 *   - The buffer has a size cap; when the platform is down the oldest entries
 *     are discarded instead of using up memory.
 *   - The console transport keeps working whatever happens here.
 *
 * Each entry is sent as { dt, level, message, ...fields }. "dt" is the timestamp
 * field that Better Stack reads; other platforms may need a different name.
 */

const Transport = require('winston-transport');

const FLUSH_INTERVAL_MS = 2000;
const MAX_BATCH = 50;
const MAX_BUFFER = 500;
const REQUEST_TIMEOUT_MS = 5000;

class HttpSinkTransport extends Transport {
  constructor(options) {
    super(options);
    this.url = options.url;
    this.token = options.token;
    this.flushIntervalMs = options.flushIntervalMs || FLUSH_INTERVAL_MS;
    this.buffer = [];
    this.timer = null;
    this.sending = false;
    this.warned = false;
  }

  log(info, callback) {
    setImmediate(() => this.emit('logged', info));

    const { timestamp, level, message, ...fields } = info;
    if (this.buffer.length >= MAX_BUFFER) this.buffer.shift();
    this.buffer.push({ dt: timestamp, level, message, ...fields });

    if (this.buffer.length >= MAX_BATCH) this.flush();
    else this.schedule();

    callback();
  }

  schedule() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, this.flushIntervalMs);
    this.timer.unref(); // a pending timer must not keep the process alive
  }

  async flush() {
    if (this.sending || this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, MAX_BATCH);
    this.sending = true;

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(batch),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`the platform answered ${response.status}`);
      this.warned = false;
    } catch (err) {
      // the batch is dropped; say so once, then stay quiet until it recovers
      if (!this.warned) {
        this.warned = true;
        process.stderr.write(`Log platform not reachable (${err.message}). Logs continue on the console.\n`);
      }
    } finally {
      this.sending = false;
      if (this.buffer.length > 0) this.schedule();
    }
  }
}

module.exports = HttpSinkTransport;
