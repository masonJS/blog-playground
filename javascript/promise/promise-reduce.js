const { it } = require('node:test');

function sleep(sec) {
  const start = performance.now();
  return new Promise(resolve => {
    setTimeout(resolve, sec * 1000);
  }).then(() => {
    console.log(`sleep: ${sec}s, realTime: ${performance.now() - start}`)
  })
}

function sleepThrow(sec) {
  const start = performance.now();
  return new Promise(resolve => {
    setTimeout(resolve, sec * 1000);
  }).then(() => {
    console.log(`sleep: ${sec}s, realTime: ${performance.now() - start}`)
    throw new Error('sleep error')
  })
}

it('reduce & promise sync test', async () => {
  // given
  const promises = [sleep(1), sleep(2), sleepThrow(3)];

  // when
  try {
    await promises
      .reduce((promise, func) => {
          return promise.then(async () => await func)
        },
        Promise.resolve()
      );
  } catch(e) {
    console.log(e);
  }
})

