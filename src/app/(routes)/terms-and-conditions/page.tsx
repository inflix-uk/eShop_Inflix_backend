import Nav from "@/app/components/navbar/Nav";
import TopBar from "@/app/topbar/page";
import Link from "next/link";
import Image from "next/image";
import tc from "@/app/assets/t&c.png";
import React from "react";

export default function TermsandConditions() {
  return (
    <>
      <header className="relative">
        <TopBar />
        <Nav />
      </header>
      <div className="max-w-7xl mx-auto p-6">
        <nav className="mb-4 text-sm text-gray-600">
          <Link href={"/"} className="hover:underline">
            Home
          </Link>
          <span className="mx-2">»</span>
          <Link href="/terms-and-conditions" className="hover:underline">
            Terms and Conditions
          </Link>
        </nav>
        <div className="flex justify-between items-center bg-gray-200 p-5">
          <div className="text-primary">
            <span className="text-primary">Zextons</span> – Tech Store – 81 Bury
            New Road, Manchester, M8 8FX, United Kingdom
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
            src={tc}
            alt="Terms and Conditions Banner"
            className="w-full h-auto"
          />
        </div>

        <div className="prose max-w-none">
          <h1 className="text-3xl font-bold text-primary mb-6">
            📘 ZEXTONS – TERMS & CONDITIONS
          </h1>

          <p className="text-sm text-gray-600 mb-8">
            <strong>Last Updated:</strong> [20 Nov 2025]
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              1. Definitions and Interpretation
            </h2>
            <p className="mb-2">
              <strong>1.1</strong> In these Terms and Conditions
              (&quot;Terms&quot;), &quot;Zextons&quot;, &quot;we&quot;,
              &quot;us&quot;, and &quot;our&quot; refer to Zextons Limited,
              Company Number 10256988, VAT Number 379187051, whose trading
              address is 81 Bury New Road, Manchester, M8 8FX, United Kingdom.
            </p>
            <p className="mb-2">
              <strong>1.2</strong> &quot;Customer&quot;, &quot;you&quot;, and
              &quot;your&quot; refer to any person placing an order through
              Zextons.co.uk or collecting goods via an authorised collection
              point.
            </p>
            <p className="mb-2">
              <strong>1.3</strong> &quot;Device&quot; refers to any mobile
              phone, tablet, accessory, or electronic product supplied by
              Zextons.
            </p>
            <p className="mb-2">
              <strong>1.4</strong> &quot;Brand New Device&quot; means a device
              that is unused, unopened, and sealed in original manufacturer
              packaging.
            </p>
            <p className="mb-2">
              <strong>1.5</strong> &quot;Refurbished Device&quot; means a
              pre-owned device that has undergone professional testing,
              cleaning, grading, and data wiping, supplied in Excellent, Good,
              or Fair condition.
            </p>
            <p className="mb-2">
              <strong>1.6</strong> &quot;User Damage&quot; means any damage
              caused by accident, misuse, neglect, liquid exposure, bending,
              force, modification, unauthorised repair or tampering of any kind.
            </p>
            <p className="mb-2">
              <strong>1.7</strong> &quot;RMA&quot; refers to a Return
              Merchandise Authorisation number issued by Zextons for approved
              returns.
            </p>
            <p className="mb-2">
              <strong>1.8</strong> References to laws include the Consumer
              Rights Act 2015, Consumer Contracts Regulations 2013, and any
              subsequent amendments.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              2. Contractual Relationship
            </h2>
            <p className="mb-2">
              <strong>2.1</strong> These Terms govern the sale and supply of
              Products from Zextons to the Customer.
            </p>
            <p className="mb-2">
              <strong>2.2</strong> By placing an order, you confirm that you
              have read, understood, and agreed to these Terms, along with the:
            </p>
            <ul className="list-disc list-inside ml-4 mb-2">
              <li>Return & Refund Policy</li>
              <li>Warranty Policy</li>
              <li>Shipping Policy</li>
              <li>Payment Policy</li>
            </ul>
            <p className="mb-2">
              <strong>2.3</strong> These Terms constitute the entire agreement
              between the parties and supersede all prior discussions or
              representations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              3. Account Creation and Customer Obligations
            </h2>
            <p className="mb-2">
              <strong>3.1</strong> Zextons does not permit guest checkout. A
              registered customer account is required to place an order.
            </p>
            <p className="mb-2">
              <strong>3.2</strong> You are responsible for ensuring that all
              account information is accurate and kept up to date.
            </p>
            <p className="mb-2">
              <strong>3.3</strong> You must maintain the confidentiality of your
              login credentials. Zextons accepts no liability for unauthorised
              access resulting from customer negligence.
            </p>
            <p className="mb-2">
              <strong>3.4</strong> You warrant that you are at least 18 years
              old and legally capable of entering into binding contracts.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              4. Product Information and Description Accuracy
            </h2>
            <p className="mb-2">
              <strong>4.1</strong> Zextons endeavours to describe and display
              products as accurately as possible. However, minor variations may
              occur due to manufacturer changes, lighting, screen differences,
              or cosmetic tolerances.
            </p>
            <p className="mb-2">
              <strong>4.2</strong> Refurbished Devices are graded based on
              cosmetic condition only; all functional components are tested and
              fully operational.
            </p>
            <p className="mb-2">
              <strong>4.3</strong> Battery health for refurbished devices is
              guaranteed to meet functional performance standards but may not
              reflect brand-new capacity.
            </p>
            <p className="mb-2">
              <strong>4.4</strong> Zextons shall not be held liable for minor
              variations that do not materially affect device performance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              5. Brand New Devices
            </h2>
            <p className="mb-2">
              <strong>5.1</strong> Brand New Devices are supplied sealed in
              original packaging.
            </p>
            <p className="mb-2">
              <strong>5.2</strong> Such devices carry a 12-month manufacturer
              warranty, or where unavailable, a 12-month Zextons warranty of
              equivalent protection.
            </p>
            <p className="mb-2">
              <strong>5.3</strong> Opening or unsealing a brand new device
              removes its &quot;brand new&quot; status; returned opened items
              will be subject to restocking fees under Section 17.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              6. Refurbished Devices
            </h2>
            <p className="mb-2">
              <strong>6.1</strong> Refurbished Devices undergo comprehensive
              diagnostics, cleaning, sanitisation, data wiping, and full
              functional testing.
            </p>
            <p className="mb-2">
              <strong>6.2</strong> All refurbished devices include an 18-month
              Zextons Warranty covering hardware and manufacturing defects.
            </p>
            <p className="mb-2">
              <strong>6.3</strong> Refurbished grades:
            </p>
            <ul className="list-disc list-inside ml-4 mb-2">
              <li>Excellent: Near-new condition</li>
              <li>Good: Light signs of use</li>
              <li>Fair: Noticeable wear, but fully functional</li>
            </ul>
            <p className="mb-2">
              <strong>6.4</strong> Cosmetic imperfections do not constitute
              defects under warranty.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              7. Prices and Payment
            </h2>
            <p className="mb-2">
              <strong>7.1</strong> Prices include VAT and are subject to change
              without notice.
            </p>
            <p className="mb-2">
              <strong>7.2</strong> Zextons accepts the following payment
              methods:
            </p>
            <ul className="list-disc list-inside ml-4 mb-2">
              <li>Visa, Mastercard, Maestro</li>
              <li>American Express</li>
              <li>PayPal</li>
              <li>PayPal Pay-in-3</li>
              <li>Klarna</li>
              <li>Clearpay</li>
              <li>Apple Pay</li>
              <li>Google Pay</li>
            </ul>
            <p className="mb-2">
              <strong>7.3</strong> Payment is taken immediately upon checkout.
            </p>
            <p className="mb-2">
              <strong>7.4</strong> Orders may be cancelled or held for security
              review if flagged as high-risk.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              8. Payment Partner Terms
            </h2>
            <p className="mb-2">
              <strong>8.1</strong> Customers using instalment/credit services
              are bound by their respective agreements:
            </p>
            <ul className="list-disc list-inside ml-4 mb-2">
              <li>
                Klarna Terms:{" "}
                <a
                  href="https://www.klarna.com/uk/terms-and-conditions/"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://www.klarna.com/uk/terms-and-conditions/
                </a>
              </li>
              <li>
                Clearpay Terms:{" "}
                <a
                  href="https://www.clearpay.co.uk/en-GB/terms-of-service"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://www.clearpay.co.uk/en-GB/terms-of-service
                </a>
              </li>
              <li>
                PayPal Pay-in-3:{" "}
                <a
                  href="https://www.paypal.com/uk/webapps/mpp/paypal-payin3/terms"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://www.paypal.com/uk/webapps/mpp/paypal-payin3/terms
                </a>
              </li>
            </ul>
            <p className="mb-2">
              <strong>8.2</strong> Zextons is not responsible for decisions,
              approvals, or refusals made by external financial providers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              9. Fraud Screening and Verification
            </h2>
            <p className="mb-2">
              <strong>9.1</strong> Zextons operates advanced fraud screening to
              protect customers and the business.
            </p>
            <p className="mb-2">
              <strong>9.2</strong> Zextons may request, at its sole discretion:
            </p>
            <ul className="list-disc list-inside ml-4 mb-2">
              <li>Government-issued photo ID</li>
              <li>Proof of address</li>
              <li>Proof of card ownership</li>
              <li>A live selfie match</li>
              <li>Additional verification documents</li>
            </ul>
            <p className="mb-2">
              <strong>9.3</strong> Failure to comply with verification requests
              may result in order cancellation.
            </p>
            <p className="mb-2">
              <strong>9.4</strong> Suspicious or fraudulent orders will be
              reported to relevant authorities and payment processors.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              10. Order Acceptance
            </h2>
            <p className="mb-2">
              <strong>10.1</strong> Order confirmation does not constitute
              acceptance. Zextons reserves the right to refuse or cancel any
              order prior to dispatch.
            </p>
            <p className="mb-2">
              <strong>10.2</strong> Acceptance occurs only when Zextons
              dispatches the item.
            </p>
            <p className="mb-2">
              <strong>10.3</strong> Zextons is not liable for errors in
              customer-supplied information including address or contact
              details.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              11. Dispatch and Delivery
            </h2>
            <p className="mb-2">
              <strong>11.1</strong> Orders placed before 3 PM (Mon–Fri) are
              dispatched the same working day.
            </p>
            <p className="mb-2">
              <strong>11.2</strong> Standard delivery is estimated at 1–3
              working days.
            </p>
            <p className="mb-2">
              <strong>11.3</strong> Next-day delivery is available for an
              additional fee.
            </p>
            <p className="mb-2">
              <strong>11.4</strong> Delivery times are estimates and not
              guaranteed.
            </p>
            <p className="mb-2">
              <strong>11.5</strong> Zextons is not liable for delays caused by
              couriers.
            </p>
            <p className="mb-2">
              <strong>11.6</strong> Risk in the goods passes to the customer
              once delivery is confirmed by the courier.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              12. Lost, Delayed, and Missing Parcels
            </h2>
            <p className="mb-2">
              <strong>12.1</strong> A parcel is considered lost only after 15
              working days have passed from dispatch.
            </p>
            <p className="mb-2">
              <strong>12.2</strong> Claims for &quot;delivered but not
              received&quot; must be submitted within 10 days of tracking
              confirmation.
            </p>
            <p className="mb-2">
              <strong>12.3</strong> Courier investigations must conclude before
              any refund or replacement is issued.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              13. Collection Points
            </h2>
            <p className="mb-2">
              <strong>13.1</strong> Collection is available at:
            </p>
            <ul className="list-disc list-inside ml-4 mb-2">
              <li>Manchester</li>
              <li>St Helens</li>
            </ul>
            <p className="mb-2">
              <strong>13.2</strong> Orders must be placed online prior to
              collection.
            </p>
            <p className="mb-2">
              <strong>13.3</strong> Customers must contact Zextons to confirm
              stock.
            </p>
            <p className="mb-2">
              <strong>13.4</strong> Zextons may require ID for collection
              verification.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              14. Cancellation Rights (Consumer Contracts Regulations)
            </h2>
            <p className="mb-2">
              <strong>14.1</strong> Customers have a legal right to cancel an
              order within 14 days of receipt, subject to conditions of goods
              remaining unused.
            </p>
            <p className="mb-2">
              <strong>14.2</strong> Opening or activating brand new devices
              reduces their value and restocking fees may apply.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              15. Return & Refund Policy (General)
            </h2>
            <p className="mb-2">
              <strong>15.1</strong> Customers may return items within 30 days of
              delivery.
            </p>
            <p className="mb-2">
              <strong>15.2</strong> Items must be:
            </p>
            <ul className="list-disc list-inside ml-4 mb-2">
              <li>Returned in original condition</li>
              <li>Fully reset</li>
              <li>Unlocked</li>
              <li>Free from User Damage</li>
              <li>Include all accessories</li>
            </ul>
            <p className="mb-2">
              <strong>15.3</strong> Return postage for change-of-mind returns is
              paid by the customer.
            </p>
            <p className="mb-2">
              <strong>15.4</strong> Refunds are processed within 3–5 working
              days of inspection.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              16. Return Conditions for Brand New Products
            </h2>
            <p className="mb-2">
              <strong>16.1</strong> Brand New Devices returned opened, unsealed,
              or activated are no longer considered new.
            </p>
            <p className="mb-2">
              <strong>16.2</strong> A 25% restocking fee is applied to such
              returns.
            </p>
            <p className="mb-2">
              <strong>16.3</strong> Missing accessories will incur additional
              deductions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              17. Faulty Returns
            </h2>
            <p className="mb-2">
              <strong>17.1</strong> Customers must contact Zextons before
              returning a faulty device.
            </p>
            <p className="mb-2">
              <strong>17.2</strong> Zextons will troubleshoot the issue remotely
              first.
            </p>
            <p className="mb-2">
              <strong>17.3</strong> Devices must pass IMEI and condition checks
              before refund or replacement is approved.
            </p>
            <p className="mb-2">
              <strong>17.4</strong> &quot;No Fault Found&quot; returns will be
              returned to the customer.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              18. Warranty Policy
            </h2>
            <p className="mb-2">
              <strong>18.1</strong> Brand New Devices: 12-month warranty.
              Refurbished Devices: 18-month Zextons warranty.
            </p>
            <p className="mb-2">
              <strong>18.2</strong> Warranty covers manufacturing or hardware
              faults only.
            </p>
            <p className="mb-2">
              <strong>18.3</strong> Warranty does NOT cover:
            </p>
            <ul className="list-disc list-inside ml-4 mb-2">
              <li>Cracked screens</li>
              <li>Liquid damage</li>
              <li>Accidental damage</li>
              <li>Battery ageing</li>
              <li>Cosmetic wear</li>
              <li>Third-party repairs</li>
              <li>Software issues</li>
              <li>Tampering</li>
            </ul>
            <p className="mb-2">
              <strong>18.4</strong> Warranty claims require:
            </p>
            <ul className="list-disc list-inside ml-4 mb-2">
              <li>Order number</li>
              <li>IMEI</li>
              <li>Photo/video evidence</li>
              <li>Full diagnostics inspection</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              19. IMEI & Serial Number Recording
            </h2>
            <p className="mb-2">
              <strong>19.1</strong> Zextons logs IMEI/serial numbers for all
              devices prior to dispatch.
            </p>
            <p className="mb-2">
              <strong>19.2</strong> Returned devices must match the original
              IMEI.
            </p>
            <p className="mb-2">
              <strong>19.3</strong> Mismatched devices will be treated as
              attempted fraud.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              20. Anti-Fraud Protections
            </h2>
            <p className="mb-2">
              <strong>20.1</strong> Zextons video-records all return inspections
              and unboxings for evidential purposes.
            </p>
            <p className="mb-2">
              <strong>20.2</strong> Fraudulent activities include, but are not
              limited to:
            </p>
            <ul className="list-disc list-inside ml-4 mb-2">
              <li>Device swapping</li>
              <li>Returning damaged devices claiming &quot;faulty&quot;</li>
              <li>Chargeback abuse</li>
              <li>Identity fraud</li>
              <li>Tampering to simulate faults</li>
            </ul>
            <p className="mb-2">
              <strong>20.3</strong> Zextons reserves the right to pursue legal
              action against fraudulent customers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              21. Device Tampering and Unauthorised Repairs
            </h2>
            <p className="mb-2">
              <strong>21.1</strong> Devices showing evidence of:
            </p>
            <ul className="list-disc list-inside ml-4 mb-2">
              <li>Opening</li>
              <li>Internal modification</li>
              <li>Third-party repair</li>
              <li>Component removal</li>
              <li>Rooting or jailbreaking</li>
            </ul>
            <p className="mb-2">
              …will have warranty and refund rights voided.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              22. &quot;No Fault Found&quot; Procedure
            </h2>
            <p className="mb-2">
              <strong>22.1</strong> Devices undergo full diagnostics including:
            </p>
            <ul className="list-disc list-inside ml-4 mb-2">
              <li>IMEI reading</li>
              <li>Hardware testing</li>
              <li>Battery analysis</li>
              <li>Sensor testing</li>
              <li>Software integrity checks</li>
            </ul>
            <p className="mb-2">
              <strong>22.2</strong> If no manufacturing defect is found:
            </p>
            <ul className="list-disc list-inside ml-4 mb-2">
              <li>Return request is rejected</li>
              <li>Device is sent back</li>
              <li>Customer may be charged for return delivery</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              23. Chargeback and Dispute Resolution
            </h2>
            <p className="mb-2">
              <strong>23.1</strong> Customers must contact Zextons before
              opening any chargeback.
            </p>
            <p className="mb-2">
              <strong>23.2</strong> Zextons will provide banks with:
            </p>
            <ul className="list-disc list-inside ml-4 mb-2">
              <li>Proof of delivery</li>
              <li>IMEI logs</li>
              <li>Photographs and video evidence</li>
              <li>Diagnostic test results</li>
              <li>Customer communications</li>
              <li>Proof of policy acceptance</li>
            </ul>
            <p className="mb-2">
              <strong>23.3</strong> Abuse of the chargeback process may result
              in:
            </p>
            <ul className="list-disc list-inside ml-4 mb-2">
              <li>Permanent account bans</li>
              <li>Reporting to authorities</li>
              <li>Legal action</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              24. Customer Responsibilities
            </h2>
            <p className="mb-2">
              <strong>24.1</strong> Customers must take reasonable care of the
              device.
            </p>
            <p className="mb-2">
              <strong>24.2</strong> Customers must back up data before returning
              devices.
            </p>
            <p className="mb-2">
              <strong>24.3</strong> Devices must not be returned with locks such
              as iCloud or Google FRP enabled.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              25. Data and Privacy
            </h2>
            <p className="mb-2">
              <strong>25.1</strong> Zextons processes data in accordance with UK
              GDPR.
            </p>
            <p className="mb-2">
              <strong>25.2</strong> Data may be used for fraud prevention and
              verification.
            </p>
            <p className="mb-2">
              <strong>25.3</strong> Returned devices are securely wiped prior to
              testing.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              26. Liability Limitations
            </h2>
            <p className="mb-2">
              <strong>26.1</strong> Zextons is not liable for:
            </p>
            <ul className="list-disc list-inside ml-4 mb-2">
              <li>Loss of data</li>
              <li>Loss due to courier delays</li>
              <li>Consequential or indirect damages</li>
              <li>Interruption of service</li>
            </ul>
            <p className="mb-2">
              <strong>26.2</strong> Nothing in these Terms limits statutory
              consumer rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              27. Force Majeure
            </h2>
            <p className="mb-2">
              <strong>27.1</strong> Zextons shall not be liable for delays or
              failures caused by events outside its control, including:
            </p>
            <ul className="list-disc list-inside ml-4 mb-2">
              <li>Natural disasters</li>
              <li>Strikes</li>
              <li>Supply chain disruption</li>
              <li>System outages</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              28. Severability
            </h2>
            <p className="mb-2">
              <strong>28.1</strong> If any clause is deemed invalid, the
              remaining clauses remain enforceable.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              29. Variation of Terms
            </h2>
            <p className="mb-2">
              <strong>29.1</strong> Zextons may amend these Terms at any time.
            </p>
            <p className="mb-2">
              <strong>29.2</strong> Updated Terms will be published on the
              website.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              30. Governing Law and Jurisdiction
            </h2>
            <p className="mb-2">
              <strong>30.1</strong> These Terms are governed by the laws of
              England & Wales.
            </p>
            <p className="mb-2">
              <strong>30.2</strong> Any dispute shall be subject to the
              exclusive jurisdiction of English courts.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-4">
              31. Contact Information
            </h2>
            <p className="mb-4">
              📧{" "}
              <a
                href="mailto:hello@zextons.co.uk"
                className="text-primary hover:underline"
              >
                hello@zextons.co.uk
              </a>
            </p>
            <p className="mb-2">
              Zextons Tech Store
              <br />
              81 Bury New Road
              <br />
              Manchester
              <br />
              M8 8FX
              <br />
              United Kingdom
            </p>
          </section>
        </div>
      </div>
      </>
  );
}
