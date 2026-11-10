const test = require("node:test");
const assert = require("node:assert/strict");
const { categorySitemapEntries } = require("../categorySitemapEntries");

test("includes category and subcategory paths", () => {
  const urls = categorySitemapEntries(
    [
      {
        name: "Car-Fragrance",
        slug: "car-fragrance",
        subCategory: ["Hanging", "Vent-Clip", "Hanging"],
        updatedAt: "2026-03-10T08:51:00.241Z",
      },
      {
        name: "Home-Fragrances",
        slug: "home-fragrances",
        subCategory: ["Reed-Diffuser"],
        updatedAt: "2026-03-09T09:15:24.739Z",
      },
    ],
    "https://aromadesire.com"
  );

  const locs = urls.map((entry) => entry.loc);
  assert.deepEqual(locs, [
    "https://aromadesire.com/categories/car-fragrance",
    "https://aromadesire.com/categories/car-fragrance/hanging",
    "https://aromadesire.com/categories/car-fragrance/vent-clip",
    "https://aromadesire.com/categories/home-fragrances",
    "https://aromadesire.com/categories/home-fragrances/reed-diffuser",
  ]);
  assert.equal(urls[1].priority, 0.7);
  assert.equal(urls[2].priority, 0.7);
  assert.equal(urls[4].priority, 0.7);
});
