import assert from "node:assert/strict";
import test from "node:test";
import { sortRecords } from "../src/lib/shared/crmHelpers.ts";

test("sortRecords sorts strings alphabetically and handles empty values", () => {
  const vendors = [
    { vendorName: "Zenith" },
    { vendorName: null },
    { vendorName: "acme" },
    { vendorName: "Beta" },
  ];

  assert.deepEqual(
    sortRecords(vendors, "vendorName", "asc").map((vendor) => vendor.vendorName),
    [null, "acme", "Beta", "Zenith"]
  );
  assert.deepEqual(
    sortRecords(vendors, "vendorName", "desc").map((vendor) => vendor.vendorName),
    ["Zenith", "Beta", "acme", null]
  );
});

test("sortRecords sorts numeric values numerically in either direction", () => {
  const values = [{ amount: 10 }, { amount: 2 }, { amount: null }];

  assert.deepEqual(
    sortRecords(values, "amount", "asc").map((row) => row.amount),
    [null, 2, 10]
  );
  assert.deepEqual(
    sortRecords(values, "amount", "desc").map((row) => row.amount),
    [10, 2, null]
  );
});
