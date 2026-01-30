

# Plan: Add 17 New Twitter/X RSS Feeds to Redes Sociales

## Overview

Add 17 new Twitter/X RSS feeds to the social media section. These will be processed automatically by the existing `process-social-feeds` edge function.

---

## Changes Required

### File: `supabase/functions/process-social-feeds/constants.ts`

Add the following 17 new feed entries to the `SOCIAL_FEEDS` array:

**Personalities & Commentators (8):**
| Name | Twitter Handle | RSS URL |
|------|----------------|---------|
| José Maldonado | @pollomaldonado | `https://rss.app/feeds/v1.1/qRLcjlGP0sBy7xPq.json` |
| Chente Ydrach | @chenteydrach | `https://rss.app/feeds/v1.1/fXrfC9jIoNUNsiOa.json` |
| Rubén Sánchez | @RubenSanchezTW | `https://rss.app/feeds/v1.1/GdO241HnaVvxjkmw.json` |
| Luis Pabón-Roca | @LPabonRoca | `https://rss.app/feeds/v1.1/dS9iFS1hU3JCyuvd.json` |
| Luis Penchi | @LuisPenchi | `https://rss.app/feeds/v1.1/3dVkRdbpM1QQs7Ny.json` |
| Carlos Díaz Olivo | @carlosdiazolivo | `https://rss.app/feeds/v1.1/iZ02nNFKN24NQoNn.json` |
| Mayra López Mulero | @mlopezmulero | `https://rss.app/feeds/v1.1/9aJkVcMiWkam5tps.json` |
| Alexandra Lúgaro | @AlexandraLugaro | `https://rss.app/feeds/v1.1/dciisTvfDwDyebJ2.json` |

**TV Stations (4):**
| Name | Twitter Handle | RSS URL |
|------|----------------|---------|
| TelemundoPR | @TelemundoPR | `https://rss.app/feeds/v1.1/IrDq7SikyLhVD1Qz.json` |
| Telenoticias | @TelenoticiasPR | `https://rss.app/feeds/v1.1/BNiMvAFx21QYvNkK.json` |
| Wapa Televisión | @WapaTV | `https://rss.app/feeds/v1.1/5LcTkf3VyQq2vUfy.json` |
| NotiCentro | @NoticentroWAPA | `https://rss.app/feeds/v1.1/QzHIYWVJyBwAeZ9H.json` |

**News Outlets (5):**
| Name | Twitter Handle | RSS URL |
|------|----------------|---------|
| El Nuevo Día Twitter | @ElNuevoDia | `https://rss.app/feeds/v1.1/FRUTuiyw4IWhf3Dm.json` |
| Primera Hora | @primerahora | `https://rss.app/feeds/v1.1/aEuL8E6xmtNZqwEO.json` |
| El Vocero de Puerto Rico | @VoceroPR | `https://rss.app/feeds/v1.1/THVFITXdIfgtDSc4.json` |
| Centro de Periodismo Investigativo | @cpipr | `https://rss.app/feeds/v1.1/XjkGJg1firEfKy8L.json` |
| Sin Comillas | @Sincomillas | `https://rss.app/feeds/v1.1/S0SckdXolEUvQPiF.json` |

---

## Updated constants.ts

```typescript
// Social media feeds to process
export const SOCIAL_FEEDS = [
  // Existing feeds
  {
    url: "https://rss.app/feeds/v1.1/LQAaHOXtVRGhYhlc.json",
    name: "Jay Fonseca",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/zk9arb6A8VuE0TNe.json",
    name: "Jugando Pelota Dura",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/BB3hsnvn6hOHtwVS.json",
    name: "Molusco",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/MRcCrwF4ucCwL3Ps.json",
    name: "Benjamín Torres Gotay",
    platform: "twitter"
  },
  // New feeds - Personalities & Commentators
  {
    url: "https://rss.app/feeds/v1.1/qRLcjlGP0sBy7xPq.json",
    name: "José Maldonado",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/fXrfC9jIoNUNsiOa.json",
    name: "Chente Ydrach",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/GdO241HnaVvxjkmw.json",
    name: "Rubén Sánchez",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/dS9iFS1hU3JCyuvd.json",
    name: "Luis Pabón-Roca",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/3dVkRdbpM1QQs7Ny.json",
    name: "Luis Penchi",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/iZ02nNFKN24NQoNn.json",
    name: "Carlos Díaz Olivo",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/9aJkVcMiWkam5tps.json",
    name: "Mayra López Mulero",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/dciisTvfDwDyebJ2.json",
    name: "Alexandra Lúgaro",
    platform: "twitter"
  },
  // New feeds - TV Stations
  {
    url: "https://rss.app/feeds/v1.1/IrDq7SikyLhVD1Qz.json",
    name: "TelemundoPR",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/BNiMvAFx21QYvNkK.json",
    name: "Telenoticias",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/5LcTkf3VyQq2vUfy.json",
    name: "Wapa Televisión",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/QzHIYWVJyBwAeZ9H.json",
    name: "NotiCentro",
    platform: "twitter"
  },
  // New feeds - News Outlets
  {
    url: "https://rss.app/feeds/v1.1/FRUTuiyw4IWhf3Dm.json",
    name: "El Nuevo Día Twitter",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/aEuL8E6xmtNZqwEO.json",
    name: "Primera Hora",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/THVFITXdIfgtDSc4.json",
    name: "El Vocero de Puerto Rico",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/XjkGJg1firEfKy8L.json",
    name: "Centro de Periodismo Investigativo",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/S0SckdXolEUvQPiF.json",
    name: "Sin Comillas",
    platform: "twitter"
  }
];

// Number of posts to fetch per feed
export const POSTS_PER_FEED = 10;
```

---

## How It Works

The existing `process-social-feeds` edge function will automatically:

1. **Create feed sources** - For each new feed URL, it creates an entry in the `feed_sources` table with platform = "twitter"
2. **Fetch posts** - Downloads the latest 10 posts from each RSS.app JSON feed
3. **Insert articles** - Stores new posts in `news_articles` table (skips duplicates)
4. **Track status** - Updates `last_successful_fetch` and error counts

---

## Summary

| Metric | Value |
|--------|-------|
| Files to modify | 1 |
| New feeds added | 17 |
| Existing feeds | 4 |
| Total feeds after | 21 |
| Changes to other components | None |

---

## After Implementation

1. Deploy the `process-social-feeds` edge function
2. Trigger a refresh from the Redes Sociales page (or call the function directly)
3. All 17 new feeds will appear in the platform filters
4. Posts will be fetched and displayed in the feed

