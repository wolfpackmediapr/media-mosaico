

# Plan: Add 20 New Twitter/X RSS Feeds to Redes Sociales

## Overview

Add 20 new Twitter/X RSS feeds to the social media section. Sin Comillas is already in the system, so it will be skipped.

---

## Changes Required

### File: `supabase/functions/process-social-feeds/constants.ts`

Add the following 20 new feed entries to the `SOCIAL_FEEDS` array:

**Commentators & Analysts (6):**
| Name | Twitter Handle | RSS URL |
|------|----------------|---------|
| Profesor Ángel Rosa | @ProfAngelRosa | `https://rss.app/feeds/v1.1/UREQ2nD662VvkWAE.json` |
| Luis Dávila Colón | @DAVILACOLON | `https://rss.app/feeds/v1.1/XDspEfNp1fHfK9pD.json` |
| Julio Rivera-Saniel | @riverasaniel | `https://rss.app/feeds/v1.1/z4IQPa7BfOpThJDJ.json` |
| Normando Valentín | @normandoh | `https://rss.app/feeds/v1.1/OP35fv2V2y5Mu1N5.json` |
| Yolanda Vélez Arcelay | @yovelezarcelay | `https://rss.app/feeds/v1.1/2AVbAbgRPMMeaeXd.json` |
| Rafael Lenín López | @LeninPR | `https://rss.app/feeds/v1.1/SRlB1utUeO3NSueg.json` |

**Journalists (6):**
| Name | Twitter Handle | RSS URL |
|------|----------------|---------|
| Valeria Collazo Cañizares | @ValeriaCollazoC | `https://rss.app/feeds/v1.1/zzXGELuKTZXUMHse.json` |
| Milly Méndez | @MillyMendezpr | `https://rss.app/feeds/v1.1/Nn6AunodvYd31v78.json` |
| Gary Rodríguez | @aergary | `https://rss.app/feeds/v1.1/ldoRFGE3OlIHtUjZ.json` |
| Tatiana Ortiz Ramírez | @ortizramirezt | `https://rss.app/feeds/v1.1/XvfG4iqDUQyRXPQl.json` |
| Omaya Sosa Pascual | @omayasosa | `https://rss.app/feeds/v1.1/D3lmeb303nJj8AHV.json` |
| Bianca Graulau | @bgraulau | `https://rss.app/feeds/v1.1/2MQtHpmYdKRYqIRe.json` |

**TV Stations (2):**
| Name | Twitter Handle | RSS URL |
|------|----------------|---------|
| TeleOnce Puerto Rico | @tele11PR | `https://rss.app/feeds/v1.1/yTAy61xHR8R8l5yI.json` |
| Las Noticias TeleOnce | @LasNoticiasT11 | `https://rss.app/feeds/v1.1/Ox4R1EFbXOIDX2D6.json` |

**News Outlets & Media (4):**
| Name | Twitter Handle | RSS URL |
|------|----------------|---------|
| El Calce | @elcalcePR | `https://rss.app/feeds/v1.1/zPmWqXqpuJZIKAxt.json` |
| News is my Business | @newsismybusines | `https://rss.app/feeds/v1.1/0L7aeRjOj90wuQvm.json` |
| Periódico El Oriental | @elorientalpr | `https://rss.app/feeds/v1.1/hFDSy2JvbJwjBYEN.json` |
| ROAM Puerto Rico | @roampuertorico | `https://rss.app/feeds/v1.1/h7PbLXbnrsLJhpQl.json` |

**Podcasts & Radio (2):**
| Name | Twitter Handle | RSS URL |
|------|----------------|---------|
| Puestos Pa'l Problema | @ElPodcastPPP | `https://rss.app/feeds/v1.1/jA3hnqyABmFxnvYu.json` |
| WALO Radio | @waloradio | `https://rss.app/feeds/v1.1/GWSpZ5r9stWa9698.json` |

---

## Implementation

Append these 20 new feed objects to the `SOCIAL_FEEDS` array after line 106 (before the closing bracket):

```typescript
  // Commentators & Analysts
  {
    url: "https://rss.app/feeds/v1.1/UREQ2nD662VvkWAE.json",
    name: "Profesor Ángel Rosa",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/XDspEfNp1fHfK9pD.json",
    name: "Luis Dávila Colón",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/z4IQPa7BfOpThJDJ.json",
    name: "Julio Rivera-Saniel",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/OP35fv2V2y5Mu1N5.json",
    name: "Normando Valentín",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/2AVbAbgRPMMeaeXd.json",
    name: "Yolanda Vélez Arcelay",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/SRlB1utUeO3NSueg.json",
    name: "Rafael Lenín López",
    platform: "twitter"
  },
  // Journalists
  {
    url: "https://rss.app/feeds/v1.1/zzXGELuKTZXUMHse.json",
    name: "Valeria Collazo Cañizares",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/Nn6AunodvYd31v78.json",
    name: "Milly Méndez",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/ldoRFGE3OlIHtUjZ.json",
    name: "Gary Rodríguez",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/XvfG4iqDUQyRXPQl.json",
    name: "Tatiana Ortiz Ramírez",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/D3lmeb303nJj8AHV.json",
    name: "Omaya Sosa Pascual",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/2MQtHpmYdKRYqIRe.json",
    name: "Bianca Graulau",
    platform: "twitter"
  },
  // TV Stations
  {
    url: "https://rss.app/feeds/v1.1/yTAy61xHR8R8l5yI.json",
    name: "TeleOnce Puerto Rico",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/Ox4R1EFbXOIDX2D6.json",
    name: "Las Noticias TeleOnce",
    platform: "twitter"
  },
  // News Outlets & Media
  {
    url: "https://rss.app/feeds/v1.1/zPmWqXqpuJZIKAxt.json",
    name: "El Calce",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/0L7aeRjOj90wuQvm.json",
    name: "News is my Business",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/hFDSy2JvbJwjBYEN.json",
    name: "Periódico El Oriental",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/h7PbLXbnrsLJhpQl.json",
    name: "ROAM Puerto Rico",
    platform: "twitter"
  },
  // Podcasts & Radio
  {
    url: "https://rss.app/feeds/v1.1/jA3hnqyABmFxnvYu.json",
    name: "Puestos Pa'l Problema",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/GWSpZ5r9stWa9698.json",
    name: "WALO Radio",
    platform: "twitter"
  }
```

---

## How It Works

The existing `process-social-feeds` edge function will automatically:

1. **Create feed sources** - For each new feed URL, it creates an entry in the `feed_sources` table
2. **Fetch posts** - Downloads the latest 10 posts from each RSS.app JSON feed
3. **Insert articles** - Stores new posts in `news_articles` table (skips duplicates)
4. **Track status** - Updates `last_successful_fetch` and error counts

---

## Summary

| Metric | Value |
|--------|-------|
| Files to modify | 1 |
| New feeds added | 20 |
| Existing feeds | 21 |
| Total feeds after | 41 |
| Changes to other components | None |

---

## After Implementation

1. Deploy the `process-social-feeds` edge function
2. Trigger the function with `forceFetch: true` to populate the database
3. Refresh the Redes Sociales page to see all 41 feeds in the Plataformas sidebar

