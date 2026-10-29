const assert = require('assert');
const { answer } = require('./server');
assert.strictEqual(answer('Who built this?').source, 'Who built this?');
assert.strictEqual(answer('do I need an api key').source, 'Does it need an API key?');
assert.strictEqual(answer('xyzzy').source, null);
console.log('all tests passed');
