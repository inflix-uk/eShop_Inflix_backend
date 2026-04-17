import Nav from "@/app/components/navbar/Nav";
import TopBar from "@/app/topbar/page";
import React from "react";
import Link from "next/link";

export default function AboutZextons() {
  return (
    <div>
      <header className="relative">
        <TopBar />
        <Nav />
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-3xl font-bold mb-6 text-primary">
            About Zextons Tech Store
          </h1>
          <p className="text-xl mb-8 text-gray-700 font-medium">
            Your Trusted Source for Refurbished & New Tech in the UK
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-blue-600 mx-auto rounded-full"></div>
        </div>

        <div className="prose prose-lg max-w-none">
          {/* Introduction Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 mb-12 border border-blue-100">
            <p className="mb-6 text-gray-700 leading-relaxed">
              At Zextons, we believe everyone deserves access to premium
              technology — without overpaying or harming the planet. For over 15
              years, we&apos;ve been delivering refurbished and brand-new tech
              that combines quality, affordability, and sustainability. From
              smartphones and laptops to gaming consoles and accessories, we
              make it easy to find the perfect device that fits your lifestyle
              and budget.
            </p>
          </div>

          {/* Mission Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl">🌱</span>
              </div>
              <h2 className="text-3xl font-bold text-primary">
                Our Mission: Accessible, Affordable & Sustainable Technology
              </h2>
            </div>
            <p className="mb-6 text-gray-700 leading-relaxed">
              Technology is meant to empower, not burden. Our mission is to make
              top-tier devices accessible to everyone while reducing electronic
              waste and promoting a greener future.
            </p>
            <p className="mb-6 text-gray-700 leading-relaxed">
              Every refurbished product we sell helps extend a device&apos;s
              life cycle — cutting down e-waste and carbon emissions. Choosing
              refurbished isn&apos;t just a smart financial choice, it&apos;s a
              responsible environmental decision.
            </p>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
              <p className="mb-4 font-semibold text-gray-800">
                Learn more about why refurbished tech is worth it:
              </p>
              <Link
                href="/why-buying-a-refurbished-iphone-is-a-good-idea"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
              >
                👉 Why Buying Refurbished iPhone is a Good Idea?
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </Link>
            </div>
          </div>

          {/* Products & Services Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl">📱</span>
              </div>
              <h2 className="text-3xl font-bold text-primary">
                Our Products & Services
              </h2>
            </div>
            <p className="mb-8 text-gray-700 leading-relaxed">
              We cater to both{" "}
              <strong className="text-primary">individual customers</strong> and{" "}
              <strong className="text-primary">business clients</strong>,
              offering a wide selection of technology to suit every need.
            </p>

            {/* Product Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Link
                href="/shopall"
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 hover:shadow-md transition-all duration-200 hover:border-blue-300"
              >
                <h3 className="text-xl font-semibold text-primary mb-3 flex items-center">
                  <span className="mr-2">📱</span>
                  Refurbished & New Phones
                </h3>
                <p className="text-gray-700">
                  iPhones, Samsung, and all major brands.
                </p>
              </Link>
              <Link
                href="/categories/laptops-and-macbooks"
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 hover:shadow-md transition-all duration-200 hover:border-purple-300"
              >
                <h3 className="text-xl font-semibold text-primary mb-3 flex items-center">
                  <span className="mr-2">💻</span>
                  Laptops & Macbooks
                </h3>
                <p className="text-gray-700">
                  Perfect for work, school, and entertainment.
                </p>
              </Link>
              <Link
                href="/categories/accessories"
                className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6 border border-green-100 hover:shadow-md transition-all duration-200 hover:border-green-300"
              >
                <h3 className="text-xl font-semibold text-primary mb-3 flex items-center">
                  <span className="mr-2">⌚</span>
                  Accessories
                </h3>
                <p className="text-gray-700">Stay connected and stylish.</p>
              </Link>
              <Link
                href="/categories/game-consoles"
                className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-100 hover:shadow-md transition-all duration-200 hover:border-orange-300"
              >
                <h3 className="text-xl font-semibold text-primary mb-3 flex items-center">
                  <span className="mr-2">🎮</span>
                  Gaming Consoles
                </h3>
                <p className="text-gray-700">PlayStation, Xbox, and more.</p>
              </Link>
            </div>

            {/* Programs Section */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Looking for flexible payment options? Explore our programs:
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Link
                  href="/deals-and-discounts"
                  className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-blue-300"
                >
                  <span className="text-2xl mr-3">💳</span>
                  <span className="font-medium text-gray-800">
                    Buy Now Pay Later
                  </span>
                </Link>
                <Link
                  href="/recycle-mobile-phone"
                  className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-blue-300"
                >
                  <span className="text-2xl mr-3">♻️</span>
                  <span className="font-medium text-gray-800">
                    Sell My Mobile Phone
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Why Choose Zextons Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-gray-100">
            <div className="flex items-center mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl">⭐</span>
              </div>
              <h2 className="text-3xl font-bold text-primary">
                Why Choose Refurbished from Zextons
              </h2>
            </div>
            <p className="mb-8 text-gray-700 leading-relaxed">
              We&apos;re not just another tech store — we&apos;re your partner
              in sustainable innovation. Here&apos;s why customers trust us:
            </p>

            <div className="grid md:grid-cols-3 gap-8 mb-8">
              {/* Quality Assurance */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">🔍</span>
                </div>
                <h3 className="text-xl font-semibold mb-4 text-primary">
                  Quality Assurance
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Every device undergoes industry-leading testing using advanced
                  diagnostic tools to guarantee full functionality.
                </p>
              </div>

              {/* Transparent Grading */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">📊</span>
                </div>
                <h3 className="text-xl font-semibold mb-4 text-primary">
                  Transparent Grading
                </h3>
                <div className="space-y-2 mb-4">
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    Like New (Grade A)
                  </div>
                  <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                    Good (Grade B)
                  </div>
                  <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                    Fair (Grade C)
                  </div>
                </div>
                <p className="text-gray-700 text-sm">
                  All grades come with 18-month warranty and 30-day return
                  policy
                </p>
              </div>

              {/* Sustainable Impact */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">🌍</span>
                </div>
                <h3 className="text-xl font-semibold mb-4 text-primary">
                  Sustainable Impact
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Each refurbished device reduces electronic waste and helps
                  conserve valuable resources — it&apos;s good for your wallet
                  and the planet.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200 text-center">
              <p className="text-lg font-semibold text-gray-800 mb-4">
                Read what our happy customers say:
              </p>
              <Link
                href="/customer-reviews"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
              >
                👉 Customer Reviews
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </Link>
            </div>
          </div>

          {/* Quality Promise Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 mb-12 border border-blue-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl">🛡️</span>
              </div>
              <h2 className="text-3xl font-bold text-primary">
                Our Quality Promise
              </h2>
            </div>
            <p className="mb-8 text-gray-700 leading-relaxed">
              At Zextons, we go the extra mile to ensure every customer gets
              reliability, performance, and value.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-green-600 text-sm">✅</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">
                      Comprehensive Testing
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Every device passes through multiple hardware and software
                      checks.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-green-600 text-sm">✅</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">
                      Responsible Sourcing
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Devices come from verified buyback programs and trusted
                      suppliers.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-green-600 text-sm">✅</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">
                      Trusted Warranty
                    </h3>
                    <p className="text-gray-600 text-sm">
                      All purchases include an 18-month warranty and free
                      next-day delivery.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-green-600 text-sm">✅</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">
                      Eco Commitment
                    </h3>
                    <p className="text-gray-600 text-sm">
                      For every purchase, we plant a tree — because giving back
                      matters.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Care Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl">💬</span>
              </div>
              <h2 className="text-3xl font-bold text-primary">
                Customer Care That Cares
              </h2>
            </div>
            <p className="mb-8 text-gray-700 leading-relaxed">
              Our relationship doesn&apos;t end when you buy — it begins there.
              Our dedicated team is available to help before, during, and after
              your purchase.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Link
                href="/refund-and-return-policy"
                className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl hover:shadow-md transition-all duration-200 border border-blue-100 hover:border-blue-300"
              >
                <span className="text-2xl mr-3">↩️</span>
                <span className="font-medium text-gray-800">
                  Returns & Refund Policy
                </span>
              </Link>
              <Link
                href="/shipping-policy"
                className="flex items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl hover:shadow-md transition-all duration-200 border border-green-100 hover:border-green-300"
              >
                <span className="text-2xl mr-3">🚚</span>
                <span className="font-medium text-gray-800">
                  Shipping Policy
                </span>
              </Link>
              <Link
                href="/contact-us"
                className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl hover:shadow-md transition-all duration-200 border border-purple-100 hover:border-purple-300"
              >
                <span className="text-2xl mr-3">🆘</span>
                <span className="font-medium text-gray-800">
                  Zextons Help Center
                </span>
              </Link>
              <Link
                href="/faqs"
                className="flex items-center p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl hover:shadow-md transition-all duration-200 border border-orange-100 hover:border-orange-300"
              >
                <span className="text-2xl mr-3">❓</span>
                <span className="font-medium text-gray-800">FAQs</span>
              </Link>
            </div>
            <p className="text-center text-gray-600 font-medium">
              We aim to make every interaction smooth, transparent, and
              satisfying.
            </p>
          </div>

          {/* Bulk Recycling Section */}
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-8 mb-12 border border-emerald-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl">♻️</span>
              </div>
              <h2 className="text-3xl font-bold text-primary">
                Bulk Recycling & Trade Solutions
              </h2>
            </div>
            <p className="mb-6 text-gray-700 leading-relaxed">
              We proudly support{" "}
              <strong className="text-primary">
                businesses, schools, and organizations
              </strong>{" "}
              looking to recycle or upgrade tech responsibly.
            </p>
            <p className="mb-8 text-gray-700 leading-relaxed">
              Through our{" "}
              <strong className="text-primary">Bulk Recycling</strong> program, we
              help extend the life of old devices while offering value returns.
            </p>
            <div className="flex justify-center">
              <Link
                href="/recycle-mobile-phone"
                className="flex items-center justify-center p-6 bg-white rounded-xl hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-emerald-300 max-w-md w-full"
              >
                <span className="text-3xl mr-4">♻️</span>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    Bulk Recycling
                  </h3>
                  <p className="text-gray-600">Responsible tech disposal</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Community Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl">👥</span>
              </div>
              <h2 className="text-3xl font-bold text-primary">
                Join the Zextons Community
              </h2>
            </div>
            <p className="mb-8 text-gray-700 leading-relaxed">
              Be part of a movement that values{" "}
              <strong className="text-primary">
                smart choices, sustainability, and savings
              </strong>
              .
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  Have questions or need guidance?
                </h3>
                <Link
                  href="/contact-us"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                >
                  👉 Contact Us
                  <svg
                    className="w-4 h-4 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </Link>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  Stay updated with our latest offers
                </h3>
                <Link
                  href="/subscribe-newsletter"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                >
                  👉 Subscribe to Our Newsletter
                  <svg
                    className="w-4 h-4 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Final CTA Section */}
          <div className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-6">
              Experience the Zextons Difference
            </h2>
            <p className="text-xl mb-8 leading-relaxed">
              At Zextons, we&apos;re not just selling devices — we&apos;re
              building trust, empowering users, and shaping a sustainable tech
              future.
            </p>
            <p className="text-xl font-semibold">
              Discover the perfect balance of{" "}
              <strong>quality, affordability, and eco-responsibility</strong> —
              only at{" "}
              <Link
                href="/"
                className="text-yellow-300 hover:text-yellow-200 underline"
              >
                Zextons Tech Store
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
      </div>
  );
}
