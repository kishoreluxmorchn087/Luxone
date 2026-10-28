import assert from "node:assert/strict";
import test from "node:test";
import { sortRecords } from "../src/lib/shared/crmHelpers.ts";
import { getInventorySortConfig } from "../src/inventory/config.ts";

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

test("Inventory sort fields are limited to each module's configured columns", () => {
  const expectedFields = {
    vendors: ["Vendor Name", "Email", "Phone", "Website", "Vendor Owner"],
    products: ["Product Name", "SKU", "Type", "Billing Cycle", "Vendor", "Category", "Unit Price", "Deployment"],
    "price-books": ["Price Book Name", "Owner", "Status", "Pricing Model", "Updated At"],
    quotes: ["Subject", "Quote Stage", "Account", "Contact", "Valid Until", "Grand Total"],
    "sales-orders": ["Subject", "Status", "Account", "Contact", "Due Date", "Grand Total"],
    "purchase-orders": ["Subject", "Vendor", "PO Number", "Status", "Due Date", "Grand Total"],
    invoices: ["Subject", "Status", "Account", "Invoice Date", "Due Date", "Grand Total"],
    configurator: ["Name", "Target Module", "Layout", "Subform", "Lookup", "Status"],
  };

  for (const [moduleKey, fields] of Object.entries(expectedFields)) {
    const { sortFields, sortFieldKeyMap } = getInventorySortConfig(moduleKey);

    assert.deepEqual(sortFields, ["None", ...fields], `${moduleKey} sort fields`);
    assert.deepEqual(
      Object.keys(sortFieldKeyMap),
      fields,
      `${moduleKey} sort field mappings`
    );

    for (const field of fields) {
      const key = sortFieldKeyMap[field];
      assert.ok(key, `${moduleKey} ${field} has a record key`);

      const rows = [{ [key]: "Zulu" }, { [key]: "Alpha" }];
      assert.deepEqual(
        sortRecords(rows, key, "asc").map((row) => row[key]),
        ["Alpha", "Zulu"],
        `${moduleKey} ${field} sorts ascending`
      );
      assert.deepEqual(
        sortRecords(rows, key, "desc").map((row) => row[key]),
        ["Zulu", "Alpha"],
        `${moduleKey} ${field} sorts descending`
      );
    }
  }
});
