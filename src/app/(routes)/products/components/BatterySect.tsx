import React from "react";
import { RadioGroup, Radio } from "@headlessui/react";
// const RadioGroup = dynamic(
//   () => import("@headlessui/react").then((mod) => mod.RadioGroup),
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

export default function BatterySect({
  batteryStatus,
  setOpenBattery,
  selectedBatteryOption,
  handleBatteryOptionChange,
  batteryOptions,
}: {
  batteryStatus: boolean;
  setOpenBattery: (value: boolean) => void;
  selectedBatteryOption: string;
  handleBatteryOptionChange: (value: string) => void;
  batteryOptions: { name: string; value: string }[];
}) {
  function classNames(
    ...classes: (string | undefined | null | false)[]
  ): string {
    return classes.filter(Boolean).join(" ");
  }

  return (
    <div className="flex flex-col justify-start items-start">
      {batteryStatus && (
        <fieldset key="battery-options" className="w-full">
          <div className="flex items-center justify-between w-full">
            <legend className="text-sm font-semibold leading-6 text-gray-900">
              Battery
            </legend>
            <button
              className="text-sm font-medium text-green-600 hover:text-green-500 hover:underline"
              onClick={() => setOpenBattery(true)}
            >
              See Guide
            </button>
          </div>
          <RadioGroup
            value={selectedBatteryOption}
            onChange={handleBatteryOptionChange}
            className="mt-2 grid gap-y-6 grid-cols-3 gap-x-4"
          >
            {batteryOptions.map((option) => (
              <Radio
                key={option.value}
                value={option.value}
                className={({ checked }: { checked: boolean }) =>
                  classNames(
                    checked
                      ? "border-green-600 ring-1 ring-green-600 bg-[#e7f0ea] opacity"
                      : "",
                    "relative flex cursor-pointer rounded-lg border px-4 py-3 shadow-sm focus:outline-none hover:bg-gray-50"
                  )
                }
              >
                {({ checked }) => (
                  <div className="flex flex-col w-full">
                    <span
                      className={classNames(
                        checked ? "text-green-600" : "text-gray-900",
                        "block text-sm font-medium"
                      )}
                    >
                      {option.name}
                    </span>
                    <div className="flex justify-end items-center">
                      <span
                        className={classNames(
                          checked ? "text-green-600" : "text-gray-900",
                          "block text-sm font-medium"
                        )}
                      >
                        {option.value}
                      </span>
                    </div>
                  </div>
                )}
              </Radio>
            ))}
          </RadioGroup>
        </fieldset>
      )}
    </div>
  );
}
