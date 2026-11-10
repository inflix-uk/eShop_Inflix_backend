const test = require("node:test");
const assert = require("node:assert/strict");
const { findSubcategory } = require("../subcategoryLookup");

const categories = [
  {
    name: "Car-Fragrance",
    slug: "car-fragrance",
    subCategory: ["Hanging", "Vent-Clip"],
  },
  {
    name: "Home-Fragrances",
    slug: "home-fragrances",
    subCategory: ["Reed-Diffuser"],
  },
];

test("finds a subcategory under its parent", () => {
  const hanging = findSubcategory(categories, "hanging", "car-fragrance");
  assert.equal(hanging?.name, "Hanging");
  assert.equal(hanging?.index, 0);

  const reed = findSubcategory(categories, "reed-diffuser", "Home-Fragrances");
  assert.equal(reed?.name, "Reed-Diffuser");
});

test("unknown slugs and the wrong parent are misses", () => {
  assert.equal(findSubcategory(categories, "xyz-test", "car-fragrance"), null);
  assert.equal(findSubcategory(categories, "hanging", "home-fragrances"), null);
  assert.equal(findSubcategory(categories, "vent-clip", "not-a-category"), null);
});
