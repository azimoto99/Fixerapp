import express from 'express';
import { db } from './db';
import { jobs, users, enterpriseBusinesses } from '../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = express.Router();

interface SitemapUrl {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

const generateSitemapXml = (urls: SitemapUrl[]): string => {
  const urlTags = urls.map(({ url, lastmod, changefreq, priority }) => {
    const lastmodTag = lastmod ? `    <lastmod>${lastmod}</lastmod>` : '';
    const changefreqTag = changefreq ? `    <changefreq>${changefreq}</changefreq>` : '';
    const priorityTag = priority !== undefined ? `    <priority>${priority}</priority>` : '';
    
    return `  <url>
    <loc>${url}</loc>${lastmodTag}${changefreqTag}${priorityTag}
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlTags}
</urlset>`;
};

router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const now = new Date().toISOString().split('T')[0];
    
    const urls: SitemapUrl[] = [];

    // Static pages
    urls.push(
      {
        url: baseUrl,
        lastmod: now,
        changefreq: 'daily',
        priority: 1.0
      },
      {
        url: `${baseUrl}/explore`,
        lastmod: now,
        changefreq: 'hourly',
        priority: 0.9
      },
      {
        url: `${baseUrl}/auth`,
        lastmod: now,
        changefreq: 'monthly',
        priority: 0.6
      },
      {
        url: `${baseUrl}/business-register`,
        lastmod: now,
        changefreq: 'monthly',
        priority: 0.7
      }
    );

    // Active job listings (only open jobs for SEO)
    const activeJobs = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        updatedAt: jobs.updatedAt,
        createdAt: jobs.createdAt
      })
      .from(jobs)
      .where(eq(jobs.status, 'open'))
      .orderBy(desc(jobs.createdAt))
      .limit(1000); // Limit to prevent huge sitemaps

    activeJobs.forEach(job => {
      urls.push({
        url: `${baseUrl}/jobs/${job.id}`,
        lastmod: (job.updatedAt || job.createdAt).toISOString().split('T')[0],
        changefreq: 'daily',
        priority: 0.8
      });
    });

    // Business profiles (for enterprise accounts)
    const businesses = await db
      .select({
        id: enterpriseBusinesses.id,
        name: enterpriseBusinesses.name,
        updatedAt: enterpriseBusinesses.updatedAt,
        createdAt: enterpriseBusinesses.createdAt
      })
      .from(enterpriseBusinesses)
      .orderBy(desc(enterpriseBusinesses.createdAt))
      .limit(500);

    businesses.forEach(business => {
      urls.push({
        url: `${baseUrl}/business/${business.id}`,
        lastmod: (business.updatedAt || business.createdAt).toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: 0.7
      });
    });

    // Public user profiles (workers with completed profiles)
    const publicProfiles = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        updatedAt: users.updatedAt,
        createdAt: users.createdAt
      })
      .from(users)
      .where(
        and(
          eq(users.accountType, 'worker'),
          // Only include profiles that are somewhat complete
          // You might want to add more criteria here
        )
      )
      .orderBy(desc(users.createdAt))
      .limit(200); // Limit worker profiles

    publicProfiles.forEach(profile => {
      if (profile.firstName && profile.lastName) {
        urls.push({
          url: `${baseUrl}/profile/${profile.id}`,
          lastmod: (profile.updatedAt || profile.createdAt).toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: 0.6
        });
      }
    });

    const sitemapXml = generateSitemapXml(urls);
    
    res.set({
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });
    
    res.send(sitemapXml);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Robots.txt endpoint
router.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  
  const robotsTxt = `User-agent: *
Allow: /
Allow: /explore
Allow: /auth
Allow: /business-register
Allow: /jobs/*
Allow: /business/*
Allow: /profile/*

Disallow: /admin*
Disallow: /api/*
Disallow: /payment*
Disallow: /wallet*
Disallow: /notifications*
Disallow: /enterprise-dashboard*
Disallow: /poster-dashboard*
Disallow: /stripe*
Disallow: /transactions*

Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay for polite crawling
Crawl-delay: 1`;

  res.set({
    'Content-Type': 'text/plain',
    'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
  });
  
  res.send(robotsTxt);
});

export default router;