import { getPostData, getAllPostIds } from "@/lib/posts";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SubscriptionBlock } from "@/components/SubscriptionBlock";
import { Metadata } from "next";
import { parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

interface PostProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: PostProps): Promise<Metadata> {
  const { slug } = await params;
  const postData = await getPostData(slug);
  return {
    title: postData.title,
    description: postData.excerpt,
  };
}

export async function generateStaticParams() {
  const paths = getAllPostIds();
  return paths.map((path) => ({
    slug: path.params.slug,
  }));
}

export default async function Post({ params }: PostProps) {
  const { slug } = await params;
  const postData = await getPostData(slug);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow py-24 bg-white">
        <article className="container mx-auto px-6 max-w-3xl">
          {/* Header */}
          <header className="mb-10 text-center">
            <Link
              href="/blog"
              className="inline-block mb-8 text-sm font-semibold text-gray-500 hover:text-primary-blue transition-colors"
            >
              ← Volver al blog
            </Link>
            <div className="mb-4 text-sm text-accent-teal font-bold uppercase tracking-wider">
              {postData.author || "Rodrigo Bermejo"} •{" "}
              <time dateTime={postData.date}>
                {format(parseISO(postData.date), "d LLLL, yyyy", {
                  locale: es,
                })}
              </time>
            </div>
            <h1 className="text-3xl md:text-5xl font-heading font-bold text-gray-900 leading-tight mb-6">
              {postData.title}
            </h1>
            {postData.excerpt && (
              <p className="text-xl text-gray-500 font-body leading-relaxed max-w-2xl mx-auto italic">
                {postData.excerpt}
              </p>
            )}
            <hr className="mt-8 border-gray-100" />
          </header>

          {/* Content */}
          <div
            className="prose prose-lg prose-blue mx-auto prose-headings:font-heading prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-600 prose-p:font-body prose-blockquote:border-l-accent-teal prose-blockquote:text-gray-500 prose-blockquote:font-quote prose-blockquote:italic"
            dangerouslySetInnerHTML={{ __html: postData.contentHtml || "" }}
          />

          {/* Footer Call to Action - Replaced by Subscription Block */}
          <div className="mt-16 pt-8 border-t border-border-subtle">
            <SubscriptionBlock source="blog_post_footer" />
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/blog"
              className="text-brand-primary hover:text-brand-accent font-medium inline-flex items-center"
            >
              ← Volver al blog
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
