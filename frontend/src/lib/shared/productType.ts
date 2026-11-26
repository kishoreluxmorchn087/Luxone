const PRODUCT_TYPE_LABELS: Record<string, string> = {
  software: "Software",
  service: "Service",
  addon: "Add-on",
  bundle: "Bundle",
};

export function formatProductType(value: unknown): string {
  const text = String(value ?? "");
  return PRODUCT_TYPE_LABELS[text.trim().toLowerCase()] || text;
}
