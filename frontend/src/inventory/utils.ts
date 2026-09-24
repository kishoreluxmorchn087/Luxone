import type { InventoryLineItem } from "./types";

export function emptyLineItem(): InventoryLineItem {
  return {
    product: "",
    quantity: 1,
    listPrice: "",
    amount: "",
    discount: "",
    tax: "",
    total: 0,
    rowDescription: "",
  };
}

export function recalculateLineItem(
  item: InventoryLineItem,
  changedField?: keyof InventoryLineItem
): InventoryLineItem {
  const quantityNum = Number(item.quantity || 0);
  const discountNum = Number(item.discount || 0);
  const taxNum = Number(item.tax || 0);

  let amountNum: number;
  let listPrice = item.listPrice;

  if (changedField === "amount") {
    amountNum = Number(item.amount || 0);
    listPrice =
      quantityNum > 0
        ? Number((amountNum / quantityNum).toFixed(4))
        : item.amount === ""
        ? ""
        : amountNum;
  } else {
    const listPriceNum = Number(item.listPrice || 0);
    amountNum = quantityNum * listPriceNum;
  }

  const total = amountNum - discountNum + taxNum;

  return {
    ...item,
    listPrice,
    amount:
      changedField === "amount"
        ? item.amount
        : amountNum === 0 && (item.listPrice === "" || item.quantity === "")
        ? ""
        : amountNum,
    total,
  };
}

export function recalculateDocument(items: InventoryLineItem[], adjustment: number | string = 0) {
  const normalized = items.map((item) => recalculateLineItem(item));
  const subtotal = normalized.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const discount = normalized.reduce((sum, item) => sum + Number(item.discount || 0), 0);
  const tax = normalized.reduce((sum, item) => sum + Number(item.tax || 0), 0);
  const grandTotal = subtotal - discount + tax + Number(adjustment || 0);
  return {
    items: normalized,
    subtotal,
    discount,
    tax,
    adjustment: adjustment === "" ? "" : Number(adjustment || 0),
    grandTotal,
  };
}

export function formatMoney(value: number | string) {
  return `Rs. ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

