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


// sleep(4) 까지 호출
it('promise all test', async () => {
  try {
    await Promise.all([
      sleep(1),
      sleep(2),
      sleepThrow(3),
      sleep(4)
    ]);
  } catch (e) {
    console.log(e);
  }
})
