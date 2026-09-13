"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { SearchController } = require("./search-controller");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

test("only the latest search owns rows, loading, and error; retry uses its keyword", async () => {
  const requests = [];
  const fetchRows = (keyword) => {
    const pending = deferred();
    requests.push({ keyword, ...pending });
    return pending.promise;
  };
  const controller = new SearchController(fetchRows);

  const oldSearch = controller.search("旧");
  const newSearch = controller.search("新");
  assert.deepEqual(
    requests.map(({ keyword }) => keyword),
    ["旧", "新"],
  );

  requests[1].resolve(["N"]);
  await newSearch;
  assert.deepEqual(controller.getState(), {
    keyword: "新",
    rows: ["N"],
    loading: false,
    error: null,
  });

  requests[0].reject(new Error("old failed"));
  await oldSearch;
  assert.deepEqual(controller.getState(), {
    keyword: "新",
    rows: ["N"],
    loading: false,
    error: null,
  });

  const retry = controller.retry();
  assert.equal(requests[2].keyword, "新");
  requests[2].resolve(["N2"]);
  await retry;
  assert.deepEqual(controller.getState(), {
    keyword: "新",
    rows: ["N2"],
    loading: false,
    error: null,
  });
});
