const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const HttpSinkTransport = require('../src/utils/httpSinkTransport');

function entry(message, extra = {}) {
  return { timestamp: '2026-11-09T10:00:00.000Z', level: 'info', message, ...extra };
}

test('logs are sent in one batch with the bearer token and the dt field', async () => {
  const received = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      received.push({ auth: req.headers.authorization, body: JSON.parse(body) });
      res.end('ok');
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const sink = new HttpSinkTransport({ url: `http://127.0.0.1:${server.address().port}/`, token: 'test-token' });
  sink.log(entry('login_success', { userId: '1' }), () => {});
  sink.log(entry('booking_created'), () => {});
  await sink.flush();
  server.close();

  assert.equal(received.length, 1);
  assert.equal(received[0].auth, 'Bearer test-token');
  assert.equal(received[0].body.length, 2);
  assert.deepEqual(received[0].body[0], { dt: '2026-11-09T10:00:00.000Z', level: 'info', message: 'login_success', userId: '1' });
});

test('an unreachable platform never throws and never blocks logging', async () => {
  // nothing listens on port 1
  const sink = new HttpSinkTransport({ url: 'http://127.0.0.1:1/', token: 'x' });
  let called = false;
  sink.log(entry('login_failed'), () => { called = true; });
  assert.equal(called, true); // the callback ran straight away
  await assert.doesNotReject(() => sink.flush());
});

test('the buffer is capped so an outage cannot use up memory', () => {
  const sink = new HttpSinkTransport({ url: 'http://127.0.0.1:1/', token: 'x', flushIntervalMs: 60_000 });
  sink.flush = async () => {}; // stop batches draining the buffer
  for (let i = 0; i < 700; i += 1) sink.log(entry(`event_${i}`), () => {});
  assert.equal(sink.buffer.length, 500);
  assert.equal(sink.buffer[0].message, 'event_200'); // the oldest were dropped
  clearTimeout(sink.timer);
});
