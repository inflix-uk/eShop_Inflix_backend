import React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import O2 from "@/app/assets/O2.png";
import Vodafone from "@/app/assets/Vodafone.png";
import ThreeSim from "@/app/assets/3.png";
import EE from "@/app/assets/EE.png";
import { RadioGroup, Label, Radio, Description } from "@headlessui/react";
// const RadioGroup = dynamic(
//   () => import("@headlessui/react").then((mod) => mod.RadioGroup),
//   {
//     ssr: false,
//   }
// );
// const RadioGroupLabel = dynamic(
//   () => import("@headlessui/react").then((mod) => mod.RadioGroup.Label),
//   {
//     ssr: false,
//   }
// );
// const RadioGroupOption = dynamic(
//   () => import("@headlessui/react").then((mod) => mod.RadioGroup.Option),
//   {
//     ssr: false,
//   }
// );
// const RadioGroupDescription = dynamic(
//   () => import("@headlessui/react").then((mod) => mod.RadioGroup.Description),
//   {
//     ssr: false,
//   }
// );
export default function SimOptions({
  product,
  setNotIncluded,
  selectedSim,
  setSelectedSim,
}: {
  product: any;
  setNotIncluded: (value: boolean) => void;
  selectedSim: string;
  setSelectedSim: (value: string) => void;
}) {
  const freesimOptions = [
    { name: "O2", image: O2 },
    { name: "Vodafone", image: Vodafone },
    { name: "EE", image: EE },
    { name: "Three", image: ThreeSim },
  ];
  function classNames(
    ...classes: (string | undefined | null | false)[]
  ): string {
    return classes.filter(Boolean).join(" ");
  }
  return (
    <>
      {product?.seeAccessoriesWeDontNeed && (
        <button
          className="hover:cursor-pointer underline text-sm font-medium text-start leading-6 text-gray-900"
          onClick={() => setNotIncluded(true)}
        >
          {`See accessories we don't include`}
        </button>
      )}
      {product?.comes_With?.freeSim && (
        <div className="flex flex-col justify-start gap-3">
          <div className="">
            <RadioGroup value={selectedSim} onChange={setSelectedSim}>
              <Label className="block text-sm font-medium text-gray-700 mb-3">
                Choose Your Free SIM (Optional):
              </Label>
              <div className="mt-1 flex justify-between items-center max-w-xs">
                {freesimOptions.map((option) => (
                  <Radio
                    key={option.name}
                    value={option.name}
                    className={({
                      checked
                    }: {
                      checked: boolean;
                    }) =>
                      classNames(
                        checked
                          ? "border-primary ring-1 ring-primary bg-[#e7f0ea] opacity  relative z-10 overflow-hidden capitalize "
                          : "shadow-2xl border border-gray-200",
                        "relative flex rounded-lg  px-2 py-1 shadow-sm focus:outline-none z-10 capitalize"
                      )
                    }
                  >
                    {({ checked }) => (
                      <label
                        className={`flex items-center gap-2${
                          checked ? "bg-blue-100" : "bg-white"
                        }`}
                      >
                        <Description
                          as="div"
                          className="flex items-center"
                        >
                          <Image
                            src={option.image}
                            alt={`${option.name} SIM`}
                            className="h-10 w-10"
                          />
                        </Description>
                      </label>
                    )}
                  </Radio>
                ))}
              </div>
            </RadioGroup>
          </div>
        </div>
      )}
    </>
  );
}
