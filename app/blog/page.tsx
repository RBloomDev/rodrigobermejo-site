import Link from 'next/link';
import { getSortedPostsData } from '@/lib/posts';
import { SectionHeader } from '@/components/ui/SectionHeader';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Metadata } from 'next';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

export const metadata: Metadata = {
  title: 'Blog | Rodrigo Bermejo',
  description: 'Artículos sobre automatización, productividad y sistemas de negocio.',
};

export default function BlogIndex() {
  const allPostsData = getSortedPostsData();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow py-24 bg-gray-50">
        <div className="container mx-auto px-6 max-w-4xl">
          <SectionHeader
            eyebrow="Blog"
            title="Insights de Automatización"
            subtitle="Guías tácticas y reflexiones sobre cómo operar negocios digitales eficientes."
            className="mb-16"
          />

          <div className="grid gap-8">
            {allPostsData.map(({ id, date, title, excerpt }) => (
              <article key={id} className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                <div className="mb-2 text-sm text-gray-500 font-medium font-body flex items-center gap-2">
                   <span className="w-1 h-1 rounded-full bg-accent-teal"></span>
                   <time dateTime={date}>{format(parseISO(date), 'd LLLL, yyyy', { locale: es })}</time>
                </div>
                <Link href={`/blog/${id}`} className="block group-hover:text-primary-blue transition-colors">
                  <h2 className="text-2xl font-heading font-bold mb-3 text-gray-900">{title}</h2>
                </Link>
                <p className="text-gray-600 font-body mb-4 leading-relaxed">
                  {excerpt}
                </p>
                <Link href={`/blog/${id}`} className="text-primary-blue font-semibold hover:text-accent-teal transition-colors inline-flex items-center">
                  Leer artículo
                  <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
