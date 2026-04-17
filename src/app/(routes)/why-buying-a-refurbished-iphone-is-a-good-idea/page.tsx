import React from 'react'
import Link from 'next/link';
import Image from 'next/image';
import refurbishedbanner from '@/app/assets/refurbishedbanner.png';
import refurbishedphones from '@/app/assets/redurbishedphoes.png';
import TopBar from '@/app/topbar/page';
import Nav from "@/app/components/navbar/Nav";
export default function RefurbishedPhones() {
  return (
    <>
      <header className="relative">
        <nav aria-label="Top">
          <TopBar />
          <Nav />
        </nav>
      </header>
      <div className="max-w-7xl mx-auto p-6">
        <nav className="mb-4 text-sm text-gray-600">
          <Link href={"/"} className="hover:underline">
            Home
          </Link>
          <span className="mx-2">»</span>
          <span className="hover:underline text-gray-800">
            Why buying a refurbished iPhone is a good idea?
          </span>
        </nav>
        <h1 className="text-3xl mb-4">
          Why buying a refurbished iPhone is a good idea?
        </h1>
        <p className="text-xs text-primary font-bold mb-6 mt-10">Tech</p>
        <p className="text-xs text-gray-500 mb-6">AUGUST 19, 2022</p>
        <div>
          <Image
            src={refurbishedbanner}
            alt="Refurbished iPhone"
            className="mb-4 w-full h-auto rounded-lg"
          />
        </div>
        <h1 className="text-3xl font-bold my-6">
          Why buying a refurbished iPhone is a good idea.
        </h1>
        <p className="text-gray-700 mb-6">
          Looking for a top-tier smartphone without the flagship price tag? Look
          no further than refurbished iPhones. Flagship phone prices can soar
          past £1,000, leaving many budget-conscious buyers looking elsewhere.
          While Android offers excellent options, for those set on the Apple
          ecosystem, iPhones present a fantastic alternative.
        </p>
        <p className="text-gray-700 mb-6">
          Contrary to popular belief, refurbished iPhones are not damaged or
          inferior. These iPhones undergo rigorous testing and refurbishment
          processes, ensuring they function like new. In many cases, you can
          find a near-mint condition iPhone at a significantly reduced price.
        </p>
        <p className="text-gray-700 mb-6">
          Intrigued by the possibility of a top-of-the-line iPhone without
          breaking the bank? Read on to discover everything you need to know
          about buying a refurbished iPhone!
        </p>

        <h2 className="text-3xl font-bold mb-4">
          What are refurbished iPhones?
        </h2>
        <div className="flex flex-col md:flex-row md:space-x-6 items-center">
          <div className="mb-4 md:mb-0">
            <Image
              src={refurbishedphones}
              alt="Refurbished iPhones"
              className="w-80 h-80 rounded-lg "
            />
          </div>
          <div className="flex-1">
            <p className="text-gray-700 mb-4">
              Refurbished iPhone: Get Like-New Quality at a Fraction of the Cost
            </p>
            <p className="text-gray-700 mb-4">
              Looking for a top-tier iPhone without the hefty price tag of the
              latest model? Consider a high-quality refurbished iPhone!
            </p>
            <p className="text-gray-700 mb-4">
              These pre-owned iPhones are more than just used phones. They
              undergo a meticulous refurbishment process by reputable retailers,
              ensuring they function flawlessly. This often includes phones
              returned by users who simply wanted to upgrade or those within the
              return window. We Buyback iPhones and other models, giving them a
              second life as fantastic iPhones.
            </p>
            <p className="text-gray-700 mb-4">
              Regardless of the reason for refurbishment, each refurbished
              iPhone goes through rigorous testing, inspection, and repairs to
              bring it back to like-new condition. You can be confident that
              your iPhone will function just as perfectly as a brand-new device,
              at a significantly lower cost.
            </p>
          </div>
        </div>
        <h2 className="text-3xl font-bold my-4">
          Should I buy a refurbished iPhone?
        </h2>
        <p className="text-gray-700 mb-4">
          Yes, looking for an Apple certified refurbished iPhone? While brand
          new iPhones can be expensive, you can still experience Apple’s
          cutting-edge technology at a great price by opting for a reconditioned
          model. Explore our wide selection of Apple certified refurbished
          iPhones to see just how much you can save! These refurbished iPhones
          are virtually indistinguishable from brand new, offering incredible
          value.
        </p>
        <p className="text-gray-700 mb-4">
          But it’s not just about savings! Choosing an Apple certified
          refurbished iPhone is a great way to help the environment. The typical
          smartphone emits a staggering 80 kg of carbon dioxide over its
          lifetime. By opting for a pre-owned device instead of a brand new one,
          you can significantly reduce your environmental impact. In addition,
          purchasing a refurbished phone helps combat the growing problem of
          electronic waste.
        </p>
        <p className="text-gray-700 mb-4">
          And that’s not all! Every time you buy a refurbished iPhone from us,
          we plant a tree in your honor. Make the smart choice – choose an Apple
          certified refurbished iPhone and save money, help the environment, and
          even plant a tree!
        </p>
      </div>
      </>
  );
}
