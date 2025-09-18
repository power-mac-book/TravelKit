import { notFound } from 'next/navigation';

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {page.title}
            </h1>
            {page.updated_at && (
              <p className="text-sm text-gray-500">
                Last updated: {new Date(page.updated_at).toLocaleDateString()}
              </p>
            )}
          </header>
          
          <article 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
          
          <footer className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>© 2025 TravelKit. All rights reserved.</span>
              <div className="flex space-x-4">
                <a href="/privacy-policy" className="hover:text-gray-700">Privacy Policy</a>
                <a href="/terms-of-service" className="hover:text-gray-700">Terms of Service</a>
                <a href="/contact-us" className="hover:text-gray-700">Contact Us</a>
              </div>
            </div>
          </footer>
        </div>
      </div>
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