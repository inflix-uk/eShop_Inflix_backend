import Section from "@/app/components/Section";

interface SectionData {
  title: string;
  paragraphs: string[];
}

const TextSection: React.FC = () => {
  const sections: SectionData[] = [
    {
      title: "Buy refurbished phones in the UK",
      paragraphs: [
        "Choose a refurbished phone at a fraction of the cost of a new one! We have the best brands, styles, and colors in devices in new condition, however, it should have its usual packaging slightly open so you can grab them at low cost. This is your best place to order and collect all devices, all of which come with a 1-year guarantee, with the company to ensure you have top quality assurance.",
        "Avoid splash out on expensive new handsets when we have refurbished phones starting at affordable prices, ultimately benefiting from low IT prices. We also have great bargains on tablet devices, especially when compared to their original prices. Disability friendly and with discounts, we have the top brands of refurbished phones and other gadgets to get the best value for money.",
        "Great for switching off without paying premium rates. Visit our website for the best deals and bargain for a friendly customer care representative who will match your perfect phone for high-end results. A market popular globally and in the UK - by choosing the right refurbished phone, all gadgets have electronics accessories you can add, ideal for when you are mobile.",
        "Let us assure you that your gadget has been refurbished using the original parts. You get a fully functional, nearly new device at an incredibly low cost. In fact, we take pride in our professional technicians who deploy top-grade equipment.",
      ],
    },
    {
      title: "Refurbished tablets for sale, wearables, game consoles, and more",
      paragraphs: [
        "We have amazing tablet deals. Laptops are amongst those we have checked out for using the latest consoles, and powerful processing units to replace their manufacturers' components to ensure you get a first-rate mobile phone. In fact, just like the best second-hand refurbished devices, these devices have all the needed combination of enhanced technology friendly features for their particular models, with prices starting from low to high.",
        "You can choose from various tablets, smartwatches, and other needed gadgets available. We are continuously checking these out to save you money and ensure a guaranteed repair where there are faults or damage.",
        "Visit us to select the latest variety of used, yet in-demand mobile phones, we recondition gadgets that are tested thoroughly to ensure they are fully functional and reliable. Contact us for your particular needs and obtain highly quality prices to get an affordable device on demand.",
      ],
    },
    {
      title:
        "Get a refurbished mobile phone in the UK to intensify planet-saving efforts",
      paragraphs: [
        "We provide a service whereby you can get the highest quality new handset, tablet, or other necessary tech you require is typically less expensive for you than not considering it from other phone providers. For a cheaper solution, you can select the best tablet, laptop, and more that meets your needs.",
        "The choice is yours. It may be a game console where you simply don’t like any you have seen so far, but are interested in at low-key buying a cheaper model, get in touch, and we will match the perfect model to suit your requirements.",
        "Contact us for further needed information and to discuss the type of refurbished phones, tablets, laptops, and more to help support your green gadget lifestyle.",
      ],
    },
    {
      title: "Refurbished electronics in the UK that Work Like New",
      paragraphs: [
        "Start saving by purchasing the best electronics, you can get high-quality, cheap gadgets to help you save money wherever you live by shopping from our leading brands who have combined the latest technology for a better environment. Whether you are getting phone calls and need the latest equipment available, or simply looking for a good value in your next mobile gadget purchase.",
        "Choose from a refurbished mobile phone, gaming console, tablet, or laptop. All available to help you save hundreds of pounds. You get 1-year warranty as standard, even with the top brands. Now get in touch with a representative to get your next device.",
        "We are pleased to match those who require refurbished and discounted devices so you are not overcharged when it comes to carrying out an electronic devices' repair service.",
        "We have affordable smartwatches, tablets, gaming consoles, and more devices that are top of their class. Each of them has been completely rechecked to its factory settings. That’s right, get the best models available, and get the highest assurance available.",
      ],
    },
    {
      title:
        "Fast delivery and stress-free returns for cheap refurbished electronics",
      paragraphs: [
        "With Avistar, getting what you want is simple and affordable. Whether it is a package with fast dispatch speeds or a game console, we are able to deliver shipping for tech products at unbeatable prices. For instant purchases practically, you can buy refurbished items from us fast and simple.",
        "Our 1-year warranty is included.",
        "You get your electronic device to be delivered anywhere in the UK. It’s fast. It is often done within 1-3 days (special delivery) or by 2-5 days (standard delivery). We have the right process so you can sit back, relax, and wait for your delivery. Returns can be done within a month.",
        "We hope you enjoyed our service and ensure repairs and replacements are available within a few months warranty (depending on the item). We are the perfect place of trust if your electronic device needs changing.",
        "Choose affordability and trust, and place inquiries into goods purchased via Avistar. We are an online refurbished electronics store that helps keep up with the latest technological trends.",
      ],
    },
  ];

  return (
    <>
      {sections.map((section, index) => (
        <Section
          key={index}
          title={section.title}
          paragraphs={section.paragraphs}
        />
      ))}
    </>
  );
};

export default TextSection;
