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


it('promise allSettled test', async () => {
  try {
    const results = await Promise.allSettled([
      sleep(1),
      sleep(2),
      sleepThrow(3),
      sleep(4)
    ])

    if  (results.find(result => result.status === 'rejected')) {
      throw new Error('Promise.allSettled exist Error')
    }

  } catch (e) {
    console.log(e);
  }
})

