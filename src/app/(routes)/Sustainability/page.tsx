"use client";
import Nav from "@/app/components/navbar/Nav";
import TopBar from "@/app/topbar/page";
import React, { useState } from "react";
import Link from "next/link";

export default function Sustainability() {
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const faqs = [
    {
      question:
        "1. Why should I choose refurbished devices instead of new ones?",
      answer:
        "Refurbished devices help reduce carbon emissions, minimize e-waste, and save you money — without compromising performance. At Zextons, every product is tested, cleaned, and backed by up to an 18-month warranty for peace of mind.",
    },
    {
      question: "2. Are refurbished phones truly sustainable?",
      answer:
        "Yes. Buying refurbished tech extends the life of electronic components and prevents harmful waste. It's one of the most effective ways to cut down the environmental footprint of technology.",
    },
    {
      question: "3. What happens to my old phone when I sell it to Zextons?",
      answer:
        "Your device is securely wiped, repaired, and either resold or responsibly recycled — ensuring zero waste and full data protection.",
    },
    {
      question: "4. How does Zextons ensure eco-friendly packaging?",
      answer:
        "We use recyclable, plastic-free materials and compact boxes to minimize carbon emissions during transport.",
    },
    {
      question: "5. How can I track Zextons' sustainability progress?",
      answer:
        "You can follow updates on our Sustainability Blog — where we regularly share progress reports, impact data, and green initiatives.",
    },
  ];

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
            Sustainability at Zextons
          </h1>
          <p className="text-xl mb-8 text-gray-700 font-medium">
            Giving Technology a Second Life — Responsibly
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-blue-600 mx-auto rounded-full"></div>
        </div>

        <div className="prose prose-lg max-w-none">
          {/* Introduction Section */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 mb-12 border border-green-100">
            <p className="mb-6 text-gray-700 leading-relaxed">
              At Zextons, sustainability isn&apos;t just a trend — it&apos;s our
              core mission. Every device we refurbish, every order we ship, and
              every customer we serve helps reduce electronic waste and build a
              greener future for the UK and beyond.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We believe that technology should empower lives without harming
              the planet — and through our eco-conscious refurbishment model,
              we&apos;re proving that innovation and sustainability can go hand
              in hand.
            </p>
          </div>

          {/* Green Mission Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl">♻️</span>
              </div>
              <h2 className="text-2xl font-bold text-primary">
                Our Green Mission: Redefining Tech Consumption
              </h2>
            </div>
            <p className="mb-6 text-gray-700 leading-relaxed">
              Each year, millions of phones, tablets, and laptops end up in
              landfills — many of them still functional. At Zextons, we&apos;re
              on a mission to break that waste cycle.
            </p>
            <p className="mb-8 text-gray-700 leading-relaxed">
              Our approach focuses on three simple but powerful steps:
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">🔍</span>
                </div>
                <h3 className="text-lg font-semibold mb-4 text-primary">
                  Recover
                </h3>
                <p className="text-gray-700">
                  We collect and buy pre-owned devices from across the UK.
                </p>
              </div>

              <div className="text-center bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">🔧</span>
                </div>
                <h3 className="text-lg font-semibold mb-4 text-primary">
                  Refurbish
                </h3>
                <p className="text-gray-700">
                  Our expert engineers inspect, repair, and restore every
                  product to peak performance.
                </p>
              </div>

              <div className="text-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">♻️</span>
                </div>
                <h3 className="text-lg font-semibold mb-4 text-primary">
                  Reuse
                </h3>
                <p className="text-gray-700">
                  We sell fully tested, high-quality refurbished devices at
                  affordable prices — giving technology a new life.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
              <p className="text-gray-700 leading-relaxed">
                This circular model means fewer new products need to be
                manufactured, saving energy, materials, and emissions every step
                of the way.
              </p>
            </div>
          </div>

          {/* Why Sustainability Matters Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl">🌱</span>
              </div>
              <h2 className="text-2xl font-bold text-primary">
                Why Sustainability Matters in Tech
              </h2>
            </div>
            <p className="mb-6 text-gray-700 leading-relaxed">
              Electronic waste (e-waste) is the fastest-growing waste stream in
              the world. According to the Global E-Waste Monitor, over 57
              million tonnes of e-waste were generated in 2024 — and only 17% of
              it was properly recycled.
            </p>
            <p className="mb-6 text-gray-700 leading-relaxed">
              When devices are discarded instead of reused, harmful materials
              like lead, mercury, and cadmium can leach into the environment,
              contaminating soil and water. On top of that, manufacturing new
              electronics consumes huge amounts of energy and resources.
            </p>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                By choosing refurbished tech from Zextons, you help:
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <span className="text-green-600 text-xl mr-3">✅</span>
                  <span className="text-gray-700">
                    Cut CO₂ emissions from new device production
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-600 text-xl mr-3">✅</span>
                  <span className="text-gray-700">
                    Reduce landfill waste and toxic pollution
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-600 text-xl mr-3">✅</span>
                  <span className="text-gray-700">
                    Preserve precious raw materials like lithium, gold, and
                    copper
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-600 text-xl mr-3">✅</span>
                  <span className="text-gray-700">
                    Support the UK&apos;s circular economy — keeping valuable
                    goods in use longer
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* How Zextons Makes a Difference Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl">💡</span>
              </div>
              <h2 className="text-2xl font-bold text-primary">
                How Zextons Makes a Difference
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <h3 className="text-lg font-semibold mb-4 text-primary flex items-center">
                  <span className="mr-2">🔧</span>
                  1. Eco-Friendly Refurbishment Process
                </h3>
                <p className="text-gray-700">
                  Every device undergoes comprehensive 70+ point testing to
                  ensure performance, safety, and reliability. We replace only
                  what&apos;s necessary, keeping waste to a minimum.
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                <h3 className="text-lg font-semibold mb-4 text-primary flex items-center">
                  <span className="mr-2">📦</span>
                  2. Sustainable Packaging
                </h3>
                <p className="text-gray-700">
                  Our packaging is 100% recyclable and made from FSC-certified
                  materials. We avoid single-use plastics wherever possible and
                  use compact boxes to reduce shipping impact.
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                <h3 className="text-lg font-semibold mb-4 text-primary flex items-center">
                  <span className="mr-2">⚡</span>
                  3. Energy-Efficient Operations
                </h3>
                <p className="text-gray-700">
                  Zextons&apos; facilities use energy-efficient equipment and
                  digital documentation systems to reduce paper use.
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-100">
                <h3 className="text-lg font-semibold mb-4 text-primary flex items-center">
                  <span className="mr-2">🌳</span>
                  4. Tree Planting with Every Order
                </h3>
                <p className="text-gray-700">
                  For every purchase made, Zextons contributes to tree planting
                  projects in the UK and overseas — turning your tech purchase
                  into an act of reforestation.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
              <h3 className="text-lg font-semibold mb-4 text-primary flex items-center">
                <span className="mr-2">🛡️</span>
                5. Long-Life Products
              </h3>
              <p className="text-gray-700">
                Each refurbished device comes with up to an 18-month warranty,
                encouraging long-term use and repair rather than replacement.
              </p>
            </div>
          </div>

          {/* Impact Metrics Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl">🌍</span>
              </div>
              <h2 className="text-2xl font-bold text-primary">
                Our Overall Impact
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 rounded-lg overflow-hidden">
                <thead className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                  <tr>
                    <th className="border border-gray-300 px-6 py-4 text-left font-semibold">
                      Sustainability Metric
                    </th>
                    <th className="border border-gray-300 px-6 py-4 text-center font-semibold">
                      Result (2024)
                    </th>
                    <th className="border border-gray-300 px-6 py-4 text-center font-semibold">
                      Target (2025)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-6 py-4 font-medium">
                      Devices Refurbished
                    </td>
                    <td className="border border-gray-300 px-6 py-4 text-center text-green-600 font-semibold">
                      48,000+
                    </td>
                    <td className="border border-gray-300 px-6 py-4 text-center text-blue-600 font-semibold">
                      75,000+
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-6 py-4 font-medium">
                      Estimated E-Waste Prevented
                    </td>
                    <td className="border border-gray-300 px-6 py-4 text-center text-green-600 font-semibold">
                      220+ tonnes
                    </td>
                    <td className="border border-gray-300 px-6 py-4 text-center text-blue-600 font-semibold">
                      300 tonnes
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-6 py-4 font-medium">
                      CO₂ Emissions Saved
                    </td>
                    <td className="border border-gray-300 px-6 py-4 text-center text-green-600 font-semibold">
                      420,000 kg
                    </td>
                    <td className="border border-gray-300 px-6 py-4 text-center text-blue-600 font-semibold">
                      600,000 kg
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-6 py-4 font-medium">
                      Trees Planted
                    </td>
                    <td className="border border-gray-300 px-6 py-4 text-center text-green-600 font-semibold">
                      5,000+
                    </td>
                    <td className="border border-gray-300 px-6 py-4 text-center text-blue-600 font-semibold">
                      10,000+
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-6 py-4 font-medium">
                      Recyclable Packaging Usage
                    </td>
                    <td className="border border-gray-300 px-6 py-4 text-center text-green-600 font-semibold">
                      98%
                    </td>
                    <td className="border border-gray-300 px-6 py-4 text-center text-blue-600 font-semibold">
                      100%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm text-gray-600 mt-4 italic">
              (Data based on internal sustainability reports and verified
              refurbishment outputs.)
            </p>
          </div>

          {/* Circular Economy Section */}
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-8 mb-12 border border-emerald-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl">🔁</span>
              </div>
              <h2 className="text-2xl font-bold text-primary">
                The Power of the Circular Economy
              </h2>
            </div>
            <p className="mb-6 text-gray-700 leading-relaxed">
              Instead of following the old &quot;make–use–discard&quot; model,
              Zextons champions a &quot;reuse–repair–recycle&quot; approach.
            </p>
            <p className="mb-6 text-gray-700 leading-relaxed">
              By refurbishing instead of replacing, we:
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="flex items-start">
                <span className="text-green-600 text-xl mr-3 mt-1">•</span>
                <span className="text-gray-700">
                  Keep valuable tech out of landfills
                </span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 text-xl mr-3 mt-1">•</span>
                <span className="text-gray-700">
                  Extend the life cycle of every device
                </span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 text-xl mr-3 mt-1">•</span>
                <span className="text-gray-700">
                  Reduce dependency on raw material mining
                </span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 text-xl mr-3 mt-1">•</span>
                <span className="text-gray-700">
                  Create affordable access to premium devices
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-emerald-200">
              <p className="text-gray-700 leading-relaxed font-medium">
                The result? A sustainable tech ecosystem that benefits both
                people and the planet.
              </p>
            </div>
          </div>

          {/* How You Can Help Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl">💬</span>
              </div>
              <h2 className="text-2xl font-bold text-primary">
                How You Can Help
              </h2>
            </div>
            <p className="mb-6 text-gray-700 leading-relaxed">
              You play a vital role in our sustainability mission. Here&apos;s
              how:
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">♻️</span>
                </div>
                <h3 className="text-lg font-semibold mb-4 text-primary">
                  Choose Refurbished
                </h3>
                <p className="text-gray-700">
                  Buy refurbished devices instead of new ones
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">🔄</span>
                </div>
                <h3 className="text-lg font-semibold mb-4 text-primary">
                  Recycle Responsibly
                </h3>
                <p className="text-gray-700">
                  Sell your old gadgets through Zextons&apos;
                  bulk recycling program
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">📢</span>
                </div>
                <h3 className="text-lg font-semibold mb-4 text-primary">
                  Spread Awareness
                </h3>
                <p className="text-gray-700">
                  Encourage your friends and family to go green with tech
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200 text-center">
              <p className="text-lg font-semibold text-gray-800">
                Small actions today create a massive impact tomorrow. Together,
                we can make sustainable technology the new normal in the UK.
              </p>
            </div>
          </div>

          {/* Certifications Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl">🌿</span>
              </div>
              <h2 className="text-2xl font-bold text-primary">
                Certifications & Partnerships
              </h2>
            </div>
            <p className="mb-6 text-gray-700 leading-relaxed">
              Zextons partners with trusted environmental organizations and
              refurbishing standards to ensure transparency and trust.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">🏆</span>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-primary">
                  ISO 9001:2015
                </h3>
                <p className="text-gray-700 text-sm">
                  Quality Management Certified
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">♻️</span>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-primary">
                  WEEE Compliant
                </h3>
                <p className="text-gray-700 text-sm">
                  Waste Electrical and Electronic Equipment Regulations
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">🌳</span>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-primary">
                  UK Reforestation
                </h3>
                <p className="text-gray-700 text-sm">
                  Supports UK Reforestation Projects through verified NGOs
                </p>
              </div>
            </div>
          </div>

          {/* Related Pages Section */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 mb-12 border border-indigo-100">
            <h2 className="text-2xl font-bold text-primary mb-6">
              🏷️ Related Pages
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <Link
                href="/about-zextons"
                className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-blue-300 group"
              >
                <span className="text-2xl mr-3 group-hover:scale-110 transition-transform duration-200">
                  ℹ️
                </span>
                <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors duration-200">
                  About Zextons
                </span>
              </Link>
              <Link
                href="/grading-guide"
                className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-blue-300 group"
              >
                <span className="text-2xl mr-3 group-hover:scale-110 transition-transform duration-200">
                  🔧
                </span>
                <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors duration-200">
                  Refurbishment Process
                </span>
              </Link>
              <Link
                href="/shopall"
                className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-blue-300 group"
              >
                <span className="text-2xl mr-3 group-hover:scale-110 transition-transform duration-200">
                  📱
                </span>
                <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors duration-200">
                  Shop Refurbished Phones
                </span>
              </Link>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white text-xl">❓</span>
              </div>
              <h2 className="text-2xl font-bold text-primary">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  <button
                    className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                    onClick={() => toggleAccordion(index)}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 pr-4">
                      {faq.question}
                    </h3>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        openAccordion === index ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {openAccordion === index && (
                    <div className="px-6 pb-4">
                      <p className="text-gray-700 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Final Thought Section */}
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-12 text-center text-white">
            <h2 className="text-2xl font-bold mb-6">💭 Final Thought</h2>
            <p className="text-xl= leading-relaxed">
              At Zextons, sustainability isn&apos;t just a statement — it&apos;s
              a promise.
            </p>
            <p className="text-lg= leading-relaxed">
              Every phone we repair, every laptop we restore, and every customer
              we serve contributes to a cleaner, greener planet.
            </p>
            <p className="text-lg font-semibold">
              Join us on our journey to make technology truly sustainable — one
              device at a time.
            </p>
          </div>
        </div>
      </div>
      </div>
  );
}
