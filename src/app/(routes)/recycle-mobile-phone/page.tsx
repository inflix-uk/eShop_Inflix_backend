import Nav from "@/app/components/navbar/Nav";
import TopBar from "@/app/topbar/page";
import Link from "next/link";
import Image from "next/image";
import bulkrecycle from "@/app/assets/bulkrecycle.png";
import React from "react";
import { Metadata } from "next";

async function getMetaData() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(
      `${apiUrl}/get/static-meta-page/path/${encodeURIComponent("/recycle-mobile-phone")}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch (error) {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const metaData = await getMetaData();

  if (!metaData) {
    return {
      title: "Recycle Mobile Phone | Zextons Tech Store",
      description: "Recycle your old mobile phone with Zextons Tech Store",
      robots: "index, follow",
    };
  }

  return {
    title: metaData.titleTag,
    description: metaData.metaDescription,
    keywords: metaData.metaKeywords,
    robots: "index, follow",
    openGraph: {
      siteName: "Zextons",
      title: metaData.titleTag,
      url: "https://zextons.co.uk/recycle-mobile-phone",
      description: metaData.metaDescription,
      type: "website",
      images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@ZextonsTechStore",
      title: metaData.titleTag,
      description: metaData.metaDescription,
      images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
    },
    alternates: {
      canonical: "https://zextons.co.uk/recycle-mobile-phone",
      languages: { "en-gb": "https://zextons.co.uk/recycle-mobile-phone" },
    },
  };
}

export default async function BulkRecycling() {
  const metaData = await getMetaData();

  return (
    <>
      {metaData?.metaSchemas?.map((schema: string, index: number) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schema }}
        />
      ))}
      <nav aria-label="Top">
        <TopBar />
        <Nav />
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <nav className="mb-4 text-sm text-gray-600">
          <Link href={"/"} className="hover:underline">
            Home
          </Link>
          <span className="mx-2">»</span>
          <Link href="/bulk-recycling" className="hover:underline">
            Bulk
          </Link>
        </nav>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h1 className="text-3xl font-bold text-green-700 mb-4">
              Sell in Bulk
            </h1>
            <h2 className="text-xl font-semibold mb-4">
              Trade Prices for Businesses looking to sell their unwanted or used
              mobile phones, tablets, laptops, and other IT Equipment.
            </h2>
            <p className="mb-4">
              Are you a business and willing to recycle your 10 or more mobile
              phones or other electronic items?{" "}
              <a
                href="mailto:sell@zextons.co.uk"
                className="text-primary underline"
              >
                Contact us!
              </a>{" "}
              We can arrange to collect your unused items right from your
              doorsteps or get one of the recyclers who is paying the most price
              for your devices to contact you directly. Simply let us know by
              email at{" "}
              <Link
                href="mailto:sell@zextons.co.uk"
                className="text-primary underline"
              >
                sell@zextons.co.uk
              </Link>{" "}
              or fill in the form below to provide details of any items such as
              Mobile phones that you wish to recycle, enter your business /
              personal details in the email/form and one of our sales team
              members will contact you to explain, discuss, quote & advice on
              how to prepare your order.
            </p>
            <p>
              If you have less than 10 devices to sell, go over to our{" "}
              <a
                // href="https://sell.zextons.co.uk/"
                className="text-primary underline"
              >
                buy-back website
              </a>{" "}
              for instant price quotes.
            </p>
          </div>
          <div className="flex justify-center items-center">
            <Image
              src={bulkrecycle}
              alt="Cultural Economy"
              className="w-full max-w-sm"
            />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-primary text-center my-6">
          FILL IN THE FORM
        </h2>
        <form action="#" method="POST" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block font-medium">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Your Name"
                className="mt-1 block w-full border border-gray-300 focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 rounded-md shadow-sm p-2"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block font-medium">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Email"
                className="mt-1 block w-full border border-gray-300 focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 rounded-md shadow-sm p-2"
                required
              />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block font-medium">Subject</label>
              <input
                type="text"
                id="subject"
                name="subject"
                placeholder="Subject"
                className="mt-1 block w-full border border-gray-300 focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 rounded-md shadow-sm p-2"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block font-medium">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder="Phone Number"
                className="mt-1 block w-full border border-gray-300 focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 rounded-md shadow-sm p-2"
                required
              />
            </div>
          </div>
          <div>
            <label className="block font-medium">Organization/Company</label>
            <input
              type="text"
              id="organization"
              name="organization"
              placeholder="Organization/Company"
              className="mt-1 block w-full border border-gray-300 focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label className="block font-medium">Message</label>
            <textarea
              id="message"
              name="message"
              placeholder="Message"
              className="mt-1 block w-full border border-gray-300 focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 rounded-md shadow-sm p-2 h-32"
              required
            ></textarea>
          </div>
          <div className="flex justify-center">
            <button
              type="submit"
              className="bg-primary text-white font-bold py-2 px-4 rounded-md"
            >
              SEND
            </button>
          </div>
        </form>
      </div>
      </>
  );
}
