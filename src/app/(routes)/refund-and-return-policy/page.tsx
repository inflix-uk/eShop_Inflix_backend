import Nav from "@/app/components/navbar/Nav";
// import TopBar from '@/app/topbar/page';
import Link from 'next/link';
import Image from 'next/image';
import rr from '@/app/assets/r&r.png';
import React from 'react'

export default function RefundAndReturnPolicy() {
  return (
    <>
      <header className="relative">
        {/* <TopBar /> */}
        <Nav />
      </header>
      <div className="max-w-7xl mx-auto p-6">
        <nav className="mb-4 text-sm text-gray-600">
          <Link href={"/"} className="hover:underline">
            Home
          </Link>
          <span className="mx-2">»</span>
          <Link href="/refund-and-return-policy" className="hover:underline">
            Refund & Return Policy
          </Link>
        </nav>
        <div className="flex justify-between items-center bg-gray-200 p-5">
          <div className="text-primary">
            <span className="text-primary">Zextons</span> – Tech Store – 27
            Church Street | St Helens | WA10 1AX
          </div>
          <div className="flex items-center space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1.2em"
              height="1.2em"
              viewBox="0 0 24 24"
            >
              <g fill="green">
                <path d="M22 7.535V17a3 3 0 0 1-2.824 2.995L19 20H5a3 3 0 0 1-2.995-2.824L2 17V7.535l9.445 6.297l.116.066a1 1 0 0 0 .878 0l.116-.066z" />
                <path d="M19 4c1.08 0 2.027.57 2.555 1.427L12 11.797l-9.555-6.37a3 3 0 0 1 2.354-1.42L5 4z" />
              </g>
            </svg>
            <a
              href="mailto:hello@zextons.co.uk"
              className="text-primary hover:underline"
            >
              hello@zextons.co.uk
            </a>
          </div>
        </div>
        <div className="mb-8">
          <Image
            src={rr}
            alt="Terms and Conditions Banner"
            className="w-full h-auto"
          />
        </div>
        <div className="p-6 bg-card text-card-foreground">
          <h1 className="text-3xl font-bold text-primary mb-4">
            Zextons’s Return and Refund Policy
          </h1>
          <p className="mb-4">
            This detailed return and refund policy supplements the general
            return information outlined in our Terms and Conditions.
          </p>
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              Visitor Comments
            </h2>
            <p>
              We accept returns for a full refund or exchange within 30 days of
              delivery. After 30 days, we are unfortunately unable to offer a
              full refund or exchange.
            </p>
          </section>
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              Eligibility for Return
            </h2>
            <p>
              To be eligible for a full refund or exchange, your item must meet
              the following criteria:
            </p>
            <ul className="mb-4 list-disc list-inside">
              <li>
                <strong>Unused: </strong> The item must be in the same unused
                condition as you received it. This means there should be no
                signs of wear or tear, scratches, or damage.
              </li>
              <li>
                <strong>Original Condition: </strong> The item must be returned
                in its original packaging with all included accessories (e.g.,
                chargers, manuals, etc.).
              </li>
              <li>
                <strong>Proof of Purchase: </strong> You must provide a valid
                receipt or proof of purchase to process your return.
              </li>
            </ul>
          </section>
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              Items Not Eligible for Return or Exchange
            </h2>
            <p>The following items are not eligible for return or exchange:</p>
            <ul className="mb-4 list-disc list-inside">
              <li>Items that have been used or show signs of use.</li>
              <li>
                Items that are damaged due to customer negligence (e.g.,
                dropping the phone, water damage).
              </li>
              <li>
                Items with missing parts (e.g., accessories, original packaging)
                not due to our error.
              </li>
              <li>Items returned more than 30 days after delivery.</li>
            </ul>
          </section>
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              Return Process
            </h2>
            <ul className="mb-4 list-disc list-inside">
              <li>
                <strong>
                  Request a Return Merchandise Authorization (RMA) Number:{" "}
                </strong>{" "}
                Contact our customer service team at{" "}
                <a
                  href="mailto:hello@zextons.co.uk"
                  className="text-primary hover:underline"
                >
                  hello@zextons.co.uk
                </a>{" "}
                to obtain an RMA number. This helps us track your return and
                expedite processing.
              </li>
              <li>
                <strong>Prepare Your Return: </strong> Carefully pack the item
                in its original packaging, ensuring all accessories are
                included.
              </li>
              <li>
                <strong>Ship Your Return</strong> : Send the phone to the
                following address using a trackable shipping method
                (recommended):
              </li>
            </ul>
            <p>Zextons Tech Store 27 Church Street St Helens WA10 1AX</p>
          </section>
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              Return Shipping Costs
            </h2>
            <p>
              You are responsible for all return shipping costs. We strongly
              recommend using a trackable service, as we cannot be held liable
              for lost or damaged returns.
            </p>
          </section>
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              Before You Return Your Device
            </h2>
            <p>
              To ensure a smooth return process, please take the following steps
              before sending your device back:
            </p>
            <ul className="mb-4 list-disc list-inside">
              <li>
                <strong>Remove all security and parental locks: </strong>This
                includes passwords, PINs, fingerprint scans, and any other
                security features that may prevent us from accessing the device.
              </li>
              <li>
                <strong>
                  Remove SIM Cards and Memory Cards (if applicable):{" "}
                </strong>
                Please back up any data on your SIM card or memory card before
                removing it.
              </li>
              <li>
                <strong>Sign Out of Your Cloud Accounts: </strong> Sign out of
                your iCloud, Samsung, or Google account associated with the
                device.
              </li>
              <li>
                <strong>Back Up and Erase Personal Data: </strong>Back up any
                important data on the device and then perform a factory reset to
                erase all personal information.
              </li>
            </ul>
          </section>
          <h1 className="text-3xl font-bold text-primary mb-4">
            Failure to follow these steps may delay the processing of your
            return.
          </h1>
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              Partial Refunds
            </h2>
            <p>
              In some cases, we may only offer a partial refund for the
              following reasons:
            </p>
            <ul className="mb-4 list-disc list-inside">
              <li>
                <strong>Device with Minor Signs of Use: </strong>If the device
                shows minor signs of use that do not affect functionality, we
                may deduct a small amount from your refund to account for
                depreciation.
              </li>
              <li>
                <strong>
                  Damaged or Missing Parts (Not Due to Our Error):{" "}
                </strong>
                If the device is damaged due to customer negligence or missing
                parts not caused by our error, we may deduct a prorated amount
                from your refund to reflect the diminished value of the item.
              </li>
            </ul>
          </section>
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              Processing Time
            </h2>
            <p>
              Once we receive your returned item and verify it meets the return
              criteria, we will process your refund or exchange within 5
              business days. You will receive a notification via email once your
              return is processed.
            </p>
          </section>
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">Refunds</h2>
            <p>
              {` Refunds will be issued to the original payment method used for the
              purchase. Please allow 3-5 business days for the refund to reflect
              in your account, depending on your bank's processing times. `}
            </p>
          </section>
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">Exchanges</h2>
            <p>
              If you are eligible for an exchange, we will ship the replacement
              item to you once we receive the returned item.
            </p>
          </section>
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">Contact Us</h2>
            <p>
              {` If you have any questions regarding our return and refund policy,
              please don't hesitate to contact us at `}
              <a
                href="mailto:hello@zextons.co.uk"
                className="text-primary hover:underline"
              >
                hello@zextons.co.uk
              </a>
              .
            </p>
          </section>
          <section className="mb-8 flex">
            <h2 className="text-2xl font-bold text-primary mb-4"></h2>
            <p className="flex">
              <strong>Please Note: </strong>
              {` 
               This detailed return and refund policy is subject to change
              without notice. We encourage you to review this policy
              periodically for any updates.`}
            </p>
          </section>
        </div>
      </div>
      </>
  );
}
