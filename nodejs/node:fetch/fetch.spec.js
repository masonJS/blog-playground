const { it, describe, before, beforeEach, after, afterEach } = require("node:test");
const assert = require("node:assert");
const { WebClient } = require("./fetch");

describe('some describe', () => {
  before(() => {

  })

  beforeEach(() => {

  })

  after(() => {

  })

  afterEach(() => {

  })

  it("some test case", async () => {
    // given
    const url = 'https://jsonplaceholder.typicode.com/todos/1';

    // when
    const result  = await WebClient.create(url).get().retrieve()

    // then
    assert.strictEqual(result.userId, 1);
  })
})
