import { useEffect, useState } from "react";
import AccordionItem from "./AccordionItem";
import Slider from "react-slider";
import { StarIcon } from "@heroicons/react/20/solid";

interface FilterSidebarProps {
    products: any[]; // Array of product objects
    setFilteredProducts: React.Dispatch<React.SetStateAction<any[]>>; // Function to update filtered products
    selectedSort: { sortFunc: (a: any, b: any) => number }; // Sort function for products
    id: string; // ID used for filtering
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
    products,
    setFilteredProducts,
    selectedSort,
    id,
}) => {
    //   const auth = useAuth();
    const [openSections, setOpenSections] = useState({
        subcategories: true,
        price: true,
        discount: true,
        ratings: true,
    });
    const [selectedRatings, setSelectedRatings] = useState < number[] > ([]);
    const [sliderValues, setSliderValues] = useState < [number, number] > ([
        0, 10000,
    ]);
    const [discountValues, setDiscountValues] = useState < [number, number] > ([
        0, 100,
    ]);

    const toggleSection = (section: string) => {
        setOpenSections((prevOpenSections) => ({
            ...prevOpenSections,
            [section as keyof typeof prevOpenSections]: !prevOpenSections[section as keyof typeof prevOpenSections],
        }));
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
            // Filter by price range
            const matchesPriceRange =
                product.minSalePrice >= sliderValues[0] &&
                product.minSalePrice <= sliderValues[1];

            // Calculate discount percentage
            const discountPercentage = Math.round(
                ((product.minPrice - product.minSalePrice) / product.minPrice) * 100
            );
            const matchesDiscountRange =
                discountPercentage >= discountValues[0] &&
                discountPercentage <= discountValues[1];

            // Filter by ratings
            const averageRating = product.averageRating;
            const matchesRating =
                selectedRatings.length === 0 ||
                selectedRatings.includes(Math.floor(averageRating));

            return (
                matchesPriceRange &&
                matchesDiscountRange &&
                matchesRating
            );
        });

        // Apply sorting based on the selected sort option
        const sorted = [...filtered].sort(selectedSort.sortFunc);
        setFilteredProducts(sorted);
    }, [
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
                title="Price"
                isOpen={openSections.price}
                onClick={() => toggleSection("price")}
            >
                <div className="relative w-full my-10">
                    <Slider
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
                    <Slider
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
                                        className={`h-4 w-4 flex-shrink-0 ${index < rating ? "text-amber-300" : "text-gray-300"
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

export default FilterSidebar;
