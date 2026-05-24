import { faqItems, features } from '../data/siteData'
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_OG_IMAGE_WIDTH,
  DEFAULT_SITE_URL,
  DEFAULT_TITLE,
  SITE_LANGUAGE,
  SITE_NAME,
  absoluteUrl,
  ensureLeadingSlash,
  normalizeSiteUrl,
} from './constants.js'

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function createOrganization(siteUrl) {
  return {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: SITE_NAME,
    url: `${siteUrl}/`,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/favicon.svg', siteUrl),
    },
    sameAs: ['https://github.com/Sean990'],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'imgsgen@163.com',
        availableLanguage: ['zh-CN'],
      },
    ],
  }
}

function createWebSite(siteUrl) {
  return {
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    name: SITE_NAME,
    url: `${siteUrl}/`,
    inLanguage: SITE_LANGUAGE,
    description: DEFAULT_DESCRIPTION,
    publisher: { '@id': `${siteUrl}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/showcase?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

function createBreadcrumb(routeMeta, canonicalUrl, siteUrl) {
  const itemListElement = [
    {
      '@type': 'ListItem',
      position: 1,
      name: '首页',
      item: `${siteUrl}/`,
    },
  ]

  if (canonicalUrl !== `${siteUrl}/`) {
    itemListElement.push({
      '@type': 'ListItem',
      position: 2,
      name: cleanText(routeMeta?.breadcrumb || routeMeta?.title || DEFAULT_TITLE),
      item: canonicalUrl,
    })
  }

  return {
    '@type': 'BreadcrumbList',
    '@id': `${canonicalUrl}#breadcrumb`,
    itemListElement,
  }
}

function createWebPage(routeMeta, canonicalUrl, siteUrl, imageUrl) {
  const pageType = routeMeta?.pageType === 'WebApplication' ? 'WebPage' : routeMeta?.pageType || 'WebPage'
  return {
    '@type': pageType,
    '@id': `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: cleanText(routeMeta?.title || DEFAULT_TITLE),
    description: cleanText(routeMeta?.description || DEFAULT_DESCRIPTION),
    inLanguage: SITE_LANGUAGE,
    isPartOf: { '@id': `${siteUrl}/#website` },
    publisher: { '@id': `${siteUrl}/#organization` },
    breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: imageUrl,
      width: DEFAULT_OG_IMAGE_WIDTH,
      height: DEFAULT_OG_IMAGE_HEIGHT,
      caption: DEFAULT_OG_IMAGE_ALT,
    },
  }
}

function createWebApplication(routeMeta, canonicalUrl, siteUrl) {
  return {
    '@type': 'WebApplication',
    '@id': `${canonicalUrl}#web-application`,
    name: cleanText(routeMeta?.breadcrumb || SITE_NAME),
    url: canonicalUrl,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript',
    inLanguage: SITE_LANGUAGE,
    description: cleanText(routeMeta?.description || DEFAULT_DESCRIPTION),
    publisher: { '@id': `${siteUrl}/#organization` },
    featureList: features.map(([title]) => title),
  }
}

function createFaqPage(canonicalUrl) {
  return {
    '@type': 'FAQPage',
    '@id': `${canonicalUrl}#faq`,
    mainEntity: faqItems.map(([question, answer]) => ({
      '@type': 'Question',
      name: cleanText(question),
      acceptedAnswer: {
        '@type': 'Answer',
        text: cleanText(answer),
      },
    })),
  }
}

export function createRouteJsonLd(routeMeta = {}, routePath = '/', envSiteUrl = DEFAULT_SITE_URL) {
  const siteUrl = normalizeSiteUrl(envSiteUrl)
  const canonicalPath = ensureLeadingSlash(routeMeta.canonicalPath || routePath || '/')
  const canonicalUrl = absoluteUrl(canonicalPath, siteUrl)
  const imageUrl = absoluteUrl(routeMeta.image || DEFAULT_OG_IMAGE_PATH, siteUrl)
  const graph = [
    createOrganization(siteUrl),
    createWebSite(siteUrl),
    createWebPage(routeMeta, canonicalUrl, siteUrl, imageUrl),
    createBreadcrumb(routeMeta, canonicalUrl, siteUrl),
  ]

  if (canonicalPath === '/') {
    graph.push(createWebApplication(routeMeta, canonicalUrl, siteUrl), createFaqPage(canonicalUrl))
  } else if (routeMeta.pageType === 'WebApplication') {
    graph.push(createWebApplication(routeMeta, canonicalUrl, siteUrl))
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}

export function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
