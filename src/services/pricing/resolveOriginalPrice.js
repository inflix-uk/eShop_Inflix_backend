function resolveOriginalPrice(product) {
  const directPrice = Number(product?.price);
  if (Number.isFinite(directPrice) && directPrice > 0) return directPrice;

  const variants = Array.isArray(product?.variantValues) ? product.variantValues : [];
  for (const v of variants) {
    const sale = Number(v?.salePrice);
    if (Number.isFinite(sale) && sale > 0) return sale;
    const regular = Number(v?.Price);
    if (Number.isFinite(regular) && regular > 0) return regular;
  }

  const minSale = Number(product?.minSalePrice);
  if (Number.isFinite(minSale) && minSale > 0) return minSale;
  const minPrice = Number(product?.minPrice);
  if (Number.isFinite(minPrice) && minPrice > 0) return minPrice;

  return 0;
}

function variantOriginalUnit(variant) {
  const sale = Number(variant?.salePrice);
  if (Number.isFinite(sale) && sale > 0) return sale;
  const list = Number(variant?.Price);
  if (Number.isFinite(list) && list > 0) return list;
  return 0;
}

module.exports = {
  resolveOriginalPrice,
  variantOriginalUnit,
};
