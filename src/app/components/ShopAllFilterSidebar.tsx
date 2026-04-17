import { useEffect, useState } from "react";
import AccordionItem from "@/app/components/AccordionItem";
import { StarIcon } from "@heroicons/react/20/solid";
import { useAuth } from "@/app/context/Auth";
import axios from "axios";
import { Product } from "../../../types";
import ReactSlider from "react-slider";
export interface ShopAllFilterSidebarProps {
  products: Product[];
  setFilteredProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  selectedSort: { sortFunc: (a: Product, b: Product) => number };
}

const ShopAllFilterSidebar: React.FC<ShopAllFilterSidebarProps> = ({
  products,
  setFilteredProducts,
  selectedSort,
}) => {
  const auth = useAuth();

  const [categories, setCategories] = useState<{ _id: string; name: string }[]>(
    []
  );
  const [openSections, setOpenSections] = useState({
    categories: true,
    price: true,
    discount: true,
    ratings: true,
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [sliderValues, setSliderValues] = useState<[number, number]>([
    0, 10000,
  ]);
  const [discountValues, setDiscountValues] = useState<[number, number]>([
    0, 100,
  ]);

 

  useEffect(() => {
     const getCategories = () => {
       axios
         .get(`${auth.ip}get/product/category`)
         .then((response) => {
           if (response.data.status === 201) {
             setCategories(response.data.productCategories);
           } else {
             console.error(response.data.message);
           }
         })
         .catch((error) => console.error("Error fetching categories:", error));
     };

    getCategories();
  }, [auth.ip]);

  const toggleSection = (section: string) => {
    setOpenSections((prevOpenSections) => ({
      ...prevOpenSections,
      [section as keyof typeof prevOpenSections]:
        !prevOpenSections[section as keyof typeof prevOpenSections],
    }));
  };

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories((prevSelected) =>
      prevSelected.includes(categoryName)
        ? prevSelected.filter((name) => name !== categoryName)
        : [...prevSelected, categoryName]
    );
  };

  const toggleRating = (rating: number) => {
    setSelectedRatings((prevSelected) =>
      prevSelected.includes(rating)
        ? prevSelected.filter((r) => r !== rating)
        : [...prevSelected, rating]
    );
  };

useEffect(() => {
  const filtered = products.filter((product) => {
    const productCategories = product.category
      .split(",")
      .map((cat) => cat.trim());
    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.some((category) =>
        productCategories.includes(category)
      );
    const matchesPriceRange =
      product.minSalePrice >= sliderValues[0] &&
      product.minSalePrice <= sliderValues[1];
    const discountPercentage = Math.round(
      ((product.minPrice - product.minSalePrice) / product.minPrice) * 100
    );
    const matchesDiscountRange =
      discountPercentage >= discountValues[0] &&
      discountPercentage <= discountValues[1];
    const averageRating = Math.round((product.averageRating ?? 0) * 10) / 10;
    const matchesRating =
      selectedRatings.length === 0 ||
      selectedRatings.includes(Math.floor(averageRating));

    return (
      matchesCategory &&
      matchesPriceRange &&
      matchesDiscountRange &&
      matchesRating
    );
  });
  const sorted = [...filtered].sort(selectedSort.sortFunc);
  setFilteredProducts(sorted);
}, [
  selectedCategories,
  sliderValues,
  discountValues,
  selectedRatings,
  products,
  selectedSort,
  setFilteredProducts,
]);


  return (
    <>
      <AccordionItem
        title="Categories"
        isOpen={openSections.categories}
        onClick={() => toggleSection("categories")}
      >
        {categories.map((category) => (
          <div className="mb-2" key={category._id}>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-4 w-4 text-gray-400 focus:ring-0 rounded-sm"
                onChange={() => toggleCategory(category.name)}
                checked={selectedCategories.includes(category.name)}
              />
              <span className="ml-2 text-gray-800">{category.name}</span>
            </label>
          </div>
        ))}
      </AccordionItem>

      <AccordionItem
        title="Price"
        isOpen={openSections.price}
        onClick={() => toggleSection("price")}
      >
        <div className="relative w-full my-10">
          <ReactSlider
            className="w-full h-2 bg-primary rounded-lg"
            thumbClassName="relative w-4 h-4 bg-white rounded-full shadow-lg cursor-pointer border-2 border-gray-400 top-[-4px]"
            trackClassName="bg-gray-700 rounded-lg"
            value={sliderValues}
            min={0}
            max={10000}
            onChange={(newValues) => setSliderValues(newValues)}
            renderTrack={({ key, ...trackProps }) => (
              <div key={key} {...trackProps} />
            )}
            renderThumb={({ key, ...thumbProps }, state) => (
              <div key={key} {...thumbProps}>
                <div
                  className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-sm text-gray-700"
                  style={{ minWidth: "35px" }}
                >
                  £{state.valueNow}
                </div>
              </div>
            )}
          />
        </div>
      </AccordionItem>

      <AccordionItem
        title="Discount"
        isOpen={openSections.discount}
        onClick={() => toggleSection("discount")}
      >
        <div className="relative w-full my-5">
          <ReactSlider
            className="w-full h-2 bg-primary rounded-full"
            thumbClassName="relative w-4 h-4 bg-white border-2 border-gray-400 rounded-full shadow cursor-pointer top-[-4px]"
            trackClassName="bg-gray-700 rounded-full"
            value={discountValues}
            min={0}
            max={100}
            onChange={(newValues) => setDiscountValues(newValues)}
            renderTrack={({ key, ...trackProps }) => (
              <div key={key} {...trackProps} />
            )}
            renderThumb={({ key, ...thumbProps }, state) => (
              <div key={key} {...thumbProps}>
                <div
                  className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-700"
                  style={{ minWidth: "30px" }}
                >
                  {state.valueNow}%
                </div>
              </div>
            )}
          />
        </div>
      </AccordionItem>

      <AccordionItem
        title="Ratings"
        isOpen={openSections.ratings}
        onClick={() => toggleSection("ratings")}
      >
        {[5, 4, 3, 2, 1].map((rating) => (
          <div className="mb-2" key={rating}>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-4 w-4 text-gray-400 focus:ring-0 rounded-sm"
                onChange={() => toggleRating(rating)}
                checked={selectedRatings.includes(rating)}
              />
              <span className="py-1 ms-2 text-sm font-regular text-yellow-400 mr-1 flex flex-row items-center">
                {[...Array(5)].map((_, index) => (
                  <StarIcon
                    key={index}
                    className={`h-4 w-4 flex-shrink-0 ${
                      index < rating ? "text-amber-300" : "text-gray-300"
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </span>
              <span className="ml-2 text-gray-800">({rating} Stars)</span>
            </label>
          </div>
        ))}
      </AccordionItem>
    </>
  );
};
export default ShopAllFilterSidebar;
