const { it, describe, before, beforeEach, after, afterEach } = require("node:test");
const assert = require("node:assert");

describe('some describe', () => {
  before(() => {
    console.log("before");
  })

  beforeEach(() => {
    console.log("beforeEach");
  })

  after(() => {
    console.log("after");
  })

  afterEach(() => {
    console.log("afterEach");
  })

  it("some test case", async () => {
    console.log("some test case");
    assert.equal(1, 1);
  })
})
