interface JobPosting {
  id: number;
  title: string;
  description: string;
  budget: number;
  location_lat: number;
  location_lng: number;
  address?: string;
  created_at: string;
  updated_at?: string;
  poster_id: number;
  poster?: {
    first_name: string;
    last_name: string;
    business_name?: string;
  };
}

interface Business {
  id: number;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  location_lat?: number;
  location_lng?: number;
}

export const generateJobPostingStructuredData = (job: JobPosting) => {
  const baseUrl = window.location.origin;
  
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": job.title,
    "description": job.description,
    "datePosted": job.created_at,
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": job.address || "Location provided upon application",
        "addressCountry": "US"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": job.location_lat,
        "longitude": job.location_lng
      }
    },
    "hiringOrganization": {
      "@type": "Organization",
      "name": job.poster?.business_name || `${job.poster?.first_name} ${job.poster?.last_name}` || "Fixer",
      "url": baseUrl
    },
    "baseSalary": {
      "@type": "MonetaryAmount",
      "currency": "USD",
      "value": {
        "@type": "QuantitativeValue",
        "value": job.budget,
        "unitText": "Job"
      }
    },
    "employmentType": "CONTRACTOR",
    "workHours": "Flexible",
    "url": `${baseUrl}/jobs/${job.id}`,
    "applicationContact": {
      "@type": "ContactPoint",
      "contactType": "Application",
      "url": `${baseUrl}/jobs/${job.id}/apply`
    }
  };
};

export const generateLocalBusinessStructuredData = (business: Business) => {
  const baseUrl = window.location.origin;
  
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": business.name,
    "description": business.description || `${business.name} - Find skilled workers and post jobs on Fixer`,
    "url": business.website || `${baseUrl}/business/${business.id}`,
    "telephone": business.phone,
    "email": business.email,
    "address": business.address ? {
      "@type": "PostalAddress",
      "streetAddress": business.address,
      "addressCountry": "US"
    } : undefined,
    "geo": business.location_lat && business.location_lng ? {
      "@type": "GeoCoordinates",
      "latitude": business.location_lat,
      "longitude": business.location_lng
    } : undefined,
    "sameAs": business.website ? [business.website] : undefined
  };
};

export const generateWebsiteStructuredData = () => {
  const baseUrl = window.location.origin;
  
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Fixer",
    "description": "Connect with skilled workers and find local jobs. Fixer is the premier gig economy platform for getting things done.",
    "url": baseUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${baseUrl}/explore?search={search_term_string}`,
      "query-input": "required name=search_term_string"
    },
    "sameAs": [
      "https://twitter.com/FixerApp",
      "https://facebook.com/FixerApp",
      "https://linkedin.com/company/fixer-app"
    ]
  };
};

export const generateOrganizationStructuredData = () => {
  const baseUrl = window.location.origin;
  
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Fixer",
    "description": "Fixer connects people who need help with various tasks to skilled workers. Our platform makes it easy to find reliable help for any job, big or small.",
    "url": baseUrl,
    "logo": `${baseUrl}/fixer.png`,
    "foundingDate": "2024",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "US"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "email": "support@fixer.app"
    },
    "sameAs": [
      "https://twitter.com/FixerApp",
      "https://facebook.com/FixerApp",
      "https://linkedin.com/company/fixer-app"
    ]
  };
};

export const generateBreadcrumbStructuredData = (breadcrumbs: Array<{name: string, url: string}>) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.url
    }))
  };
};