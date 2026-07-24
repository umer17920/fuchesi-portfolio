import { ContactCta } from '@/components/home/ContactCta';
import { FeaturedWork } from '@/components/home/FeaturedWork';
import { Hero } from '@/components/home/Hero';
import { ProcessTeaser } from '@/components/home/ProcessTeaser';
import { ServicesOverview } from '@/components/home/ServicesOverview';
import { FaqSection } from '@/components/shared/FaqSection';
import { homeFaqs } from '@/lib/faqs';

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServicesOverview />
      <FeaturedWork />
      <ProcessTeaser />
      <FaqSection faqs={homeFaqs} heading="Questions we get asked" />
      <ContactCta />
    </>
  );
}
