export type ItemSortOption = "price-desc" | "price-asc" | "item-code";

interface SortFields {
  item_code: string;
  price: number | null;
}

export function sortByPriceOrItemCode<T>(
  values: readonly T[],
  sort: ItemSortOption,
  getFields: (value: T) => SortFields,
): T[] {
  return [...values].sort((left, right) => {
    const leftFields = getFields(left);
    const rightFields = getFields(right);

    if (sort === "item-code") {
      return leftFields.item_code.localeCompare(rightFields.item_code);
    }

    if (leftFields.price === null) return rightFields.price === null ? leftFields.item_code.localeCompare(rightFields.item_code) : 1;
    if (rightFields.price === null) return -1;

    const priceOrder = sort === "price-desc"
      ? rightFields.price - leftFields.price
      : leftFields.price - rightFields.price;
    return priceOrder || leftFields.item_code.localeCompare(rightFields.item_code);
  });
}