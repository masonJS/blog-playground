const { it } = require('node:test');
const assert = require('node:assert');

function sleep(sec) {
  const start = performance.now();
  return new Promise(resolve => {
    setTimeout(resolve, sec * 1000);
  }).then(() => {
    console.log(`sleep: ${sec}s, realTime: ${performance.now() - start}`)
  })
}

async function timer(promise, sec) {
  let timer;

  const result = await Promise.race([
    promise,
    new Promise(resolve => {
      timer = setTimeout(() => resolve('timeout'), sec * 1000);
    })
  ])

  if(result === 'timeout') {
    throw new Error('timout error')
  }

  return result;
}


it('promise race fail', async () => {
  await timer(sleep(1), 1)
})

it('promise race success', async () => {
  try {
    await timer(sleep(1), 0.5);

    assert.fail('not reach');
  } catch(e) {
    assert.equal(e.message, 'timout error')
  }
})

