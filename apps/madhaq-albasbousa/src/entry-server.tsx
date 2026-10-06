import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';

export const render = () =>
  renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );

import { PRODUCTS } from './config/menu';
import { store } from './config/store';

/** schema.org data for search engines, generated from the same menu the page uses. */
export const structuredData = () =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Bakery',
    name: store.nameAr,
    alternateName: store.nameEn,
    telephone: `+${store.whatsappNumber}`,
    foundingDate: String(store.established),
    address: { '@type': 'PostalAddress', addressLocality: store.city, addressCountry: 'LY' },
    servesCuisine: 'حلويات شرقية',
    priceRange: '$$',
    hasMenu: {
      '@type': 'Menu',
      hasMenuItem: PRODUCTS.map((p) => ({
        '@type': 'MenuItem',
        name: p.nameAr,
        description: p.description,
        offers: p.variants.map((v) => ({
          '@type': 'Offer',
          name: `${p.nameAr} — ${v.nameAr}`,
          price: v.price,
          priceCurrency: 'LYD',
        })),
      })),
    },
  }).replace(/</g, '\\u003c');
