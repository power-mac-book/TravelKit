import { notFound } from 'next/navigation';
import Link from 'next/link';

interface Page {
  id: number;
  slug: string;
  title: string;
  content: string;
  meta_title: string;
  meta_description: string;
  is_published: boolean;
  created_at: string;
  updated_at: string | null;
}

interface PageProps {
  params: {
    slug: string;
  };
}

async function getPage(slug: string): Promise<Page | null> {
  try {
    const response = await fetch(`http://localhost:8000/api/v1/pages/${slug}`, {
      cache: 'no-store', // Always fetch fresh data for dynamic content
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch page: ${response.status}`);
    }
    
    const page = await response.json();
    return page;
  } catch (error) {
    console.error('Error fetching page:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const page = await getPage(params.slug);
  
  if (!page) {
    return {
      title: 'Page Not Found',
      description: 'The requested page could not be found.',
    };
  }

  return {
    title: page.meta_title || page.title,
    description: page.meta_description,
  };
}

export default async function DynamicPage({ params }: PageProps) {
  const page = await getPage(params.slug);

  if (!page || !page.is_published) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header Navigation */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors">
              <span>←</span>
              <span className="text-xl font-bold">TravelKit</span>
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                Home
              </Link>
              <Link href="/destinations" className="text-gray-600 hover:text-gray-900 transition-colors">
                Destinations
              </Link>
              <Link href="/how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors">
                How It Works
              </Link>
              <Link href="/express-interest" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                Express Interest
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            <li>
              <Link href="/" className="hover:text-blue-600 transition-colors">
                Home
              </Link>
            </li>
            <li className="flex items-center">
              <span className="mx-2">/</span>
              <span className="text-gray-900">{page.title}</span>
            </li>
          </ol>
        </nav>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-8 lg:p-12">
            <header className="mb-8">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                {page.title}
              </h1>
              {page.updated_at && (
                <p className="text-sm text-gray-500 flex items-center">
                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Last updated: {new Date(page.updated_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              )}
            </header>
            
            <article 
              className="prose prose-lg prose-blue max-w-none
                prose-headings:text-gray-900 prose-headings:font-bold
                prose-h1:text-3xl prose-h2:text-2xl prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2
                prose-p:text-gray-700 prose-p:leading-relaxed
                prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                prose-strong:text-gray-900
                prose-ul:text-gray-700 prose-ol:text-gray-700
                prose-li:marker:text-blue-600"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
            
            {/* Back to Home CTA */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="text-center">
                <p className="text-gray-600 mb-4">Ready to start your travel journey?</p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link 
                    href="/destinations" 
                    className="inline-flex items-center justify-center px-6 py-3 border border-blue-600 text-blue-600 font-medium rounded-md hover:bg-blue-50 transition-colors"
                  >
                    Browse Destinations
                  </Link>
                  <Link 
                    href="/express-interest" 
                    className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Express Interest
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <span className="text-2xl font-bold">TravelKit</span>
            </div>
            <p className="text-gray-400 mb-6">Travel together, save together</p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <Link href="/privacy-policy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms-of-service" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/contact-us" className="hover:text-white transition-colors">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Generate static paths for known pages at build time
export async function generateStaticParams() {
  try {
    const response = await fetch('http://localhost:8000/api/v1/pages/', {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error('Failed to fetch pages for static generation');
      return [];
    }
    
    const pages: Page[] = await response.json();
    
    return pages
      .filter(page => page.is_published)
      .map(page => ({
        slug: page.slug,
      }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}