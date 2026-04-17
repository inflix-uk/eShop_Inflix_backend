interface SectionProps {
  title: string;
  paragraphs: string[];
}

const Section: React.FC<SectionProps> = ({ title, paragraphs }) => (
  <section className="mb-8">
    <h2 className="text-2xl font-bold mb-4">{title}</h2>
    {paragraphs.map((paragraph, index) => (
      <p key={index} className="mb-4">
        {paragraph}
      </p>
    ))}
  </section>
);

export default Section;
