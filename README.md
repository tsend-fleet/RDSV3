# Panhandle 24/7 Roadside — Amarillo RDS Build

A self-editing premium roadside-services website. Static HTML + vanilla-JS engine, zero build step, deployable to GitHub Pages / Vercel / Hostinger / Netlify in one push.

---

## Files

| File | Role |
|------|------|
| `content.json`     | Single source of truth — brand, SEO, keyword bank (8 buckets), services, cities, I-40 exits, theme |
| `delta-engine.js`  | Runtime engine — content load, render, schema injection, theme, GitHub sync |
| `index.html`       | Public homepage |
| `service.html`     | Service detail (`?id=<service-slug>`) |
| `page.html`        | Universal block-renderer (`?id=<page-slug>`) — hub, city, exit, custom pages |
| `admin.html`       | Form-based CRUD editor — polished GitHub Configuration card (Repo + Fine-Grained PAT + **Generate Token →** button) + keyword-bank chip editor + push to GitHub |
| `admin1.html`      | Visual click-to-edit editor — iframe of `index.html`, device switcher, sidebar Quick Edit + Tools (Theme toggle, SEO Audit, Popup), Element Style Panel, Publish Changes |
| `.gitattributes`   | Forces GitHub Linguist to label this repo as **HTML** (not JavaScript). The engine is marked vendored. |

---

## Local preview

```bash
# from the Amarillo RDS folder
python -m http.server 8080
# then open http://localhost:8080/index.html
```

(Or any static server — `npx serve`, VS Code Live Server, etc.)

---

## First-time deploy (5 minutes)

### 1. Create a GitHub repo
Make a new repo (e.g., `amarillo-rds`) and push these files to `main`.

### 2. Hosting
- **Vercel:** Import repo → no build settings, just deploy. Auto-redeploys on every push.
- **GitHub Pages:** Settings → Pages → Branch `main` `/`.
- **Hostinger:** Drag and drop these files into your `public_html`.

### 3. Generate a fine-grained PAT (Personal Access Token)
**Easiest:** open `admin.html`, scroll to the green **🔑 GitHub Configuration** card, click **Generate Token →**. That opens GitHub's fine-grained token creation page directly.

Manual path: GitHub → Settings → Developer Settings → Personal Access Tokens → **Fine-grained tokens** → Generate new token.
- Repository access: **Only selected repositories** → your repo
- Permissions: **Contents → Read and Write**
- Token format: `github_pat_…`
- Save the token — paste it into the admin panel's Fine-Grained PAT field.

> Classic tokens also work but **fine-grained is required by spec** because it limits the blast radius to one repo.

### 4. Configure admin panel
- Open `https://<your-domain>/admin.html`
- Password: **`RDSIDE123`** (change in `admin.html` and `delta-engine.js` before client handover)
- Paste your **GitHub PAT** → click "Save Token"
- Enter **Repo Path** (`owner/repo`) → click "Save Repo Path"
- Edit anything → click **Save & Push** to commit `content.json` to GitHub

The hosting platform sees the commit and redeploys automatically. Your client never touches code.

---

## Theme system

12 CSS-variable tokens × light/dark palettes, runtime toggle, anti-FOUC inline script.

- Defaults: `theme.defaultMode = "auto"` (matches OS preference on first visit)
- Override: open admin → **Theme & Colors** → edit any token → push
- Tokens: `bg`, `surface`, `surface-alt`, `surface-deep`, `surface-emphasis`, `text`, `text-muted`, `border`, `cta`, `cta-hover`, `accent`, `header-bg`

---

## Keyword bank workflow (the SEO moat)

`content.seo.keywordBank` has 8 admin-editable buckets:

| Bucket | Purpose |
|--------|---------|
| `primary`      | Main money keywords for H1 / meta title |
| `longTail`     | Near-me intent — service shortDesc, body |
| `geoCity`      | City pages and footer geo references |
| `i40Exits`     | Highway exit pages — the moat no competitor has |
| `fleet`        | B2B / commercial copy |
| `problemAware` | Symptom-driven copy in service longDesc |
| `lsi`          | Sprinkle throughout body — "USDOT", "ASE certified", "Hablamos Español" |
| `entities`     | Knowledge-graph signals — Interstate 40, Potter County, Route 66 |

**Workflow:**
1. Open admin → **SEO & Schema → Keyword Bank**
2. Add/remove chips per bucket
3. Click **🔄 Regenerate defaultKeywords** to flatten all buckets into the meta keywords field
4. Push to GitHub
5. Re-rank in 30–90 days as Google re-indexes

---

## Programmatic page generation

The "moat" — competitors can't profitably bid on these in Google Ads.

- **City pages** (15 by default): Admin → **Service Areas** → "Generate City Page" per row, or "Generate All Missing"
- **I-40 exit pages** (16 by default): Admin → **I-40 Exits** → "Generate Exit Page" or bulk
- **Hub pages** (4 silo parents): Admin → **Service Categories** → "Generate Hub Page"

URLs:
- City: `page.html?id=amarillo-tx`
- Exit: `page.html?id=i40-exit-75-western`
- Hub:  `page.html?id=towing-hub`

---

## SEO architecture (the 22-point wedge)

Injected at runtime by `delta-engine.js`:
- JSON-LD: `LocalBusiness + AutoRepair + EmergencyService` with GeoCircle (100mi) `areaServed`, OfferCatalog from services, AggregateRating, sameAs
- JSON-LD: `FAQPage` (combined from all service FAQs)
- JSON-LD: `Service + BreadcrumbList + FAQPage` per service detail page
- JSON-LD: `BreadcrumbList` per page
- Meta: title, description, keywords, geo.region/placename/position, ICBM, canonical, robots
- Open Graph + Twitter Card on every public page
- Hreflang `<link rel="alternate" hreflang="es">` when `i18n.alternateLocales` includes `es`

---

## Per-market reuse (Denver, Phoenix, etc.)

When you sell to the next market:
1. Copy `CLAUDE.md`, `claudeRDS.md`, `skillRDS.md`, `RDS-MEMORY.md` to a new folder (e.g., `Denver RDS/`)
2. Tell Claude: *"Read CLAUDE.md, claudeRDS.md, skillRDS.md, and RDS-MEMORY.md. New market is Denver, CO."*
3. Claude regenerates the 9 deliverables from scratch — fresh keywords, fresh palette options, fresh I-25 exits

---

## Sales pitch (verbatim, when closing)

> *"Open ChatGPT, Gemini, or Claude. Tell it to compare my site against your top 3 local competitors on SEO, schema, mobile UX, conversion design, and Google Maps optimization. The AI will tell you mine wins on schema markup (they have none), I-40 exit-number landing pages (a moat no one in your area has built), live ETA & transparent pricing (every competitor hides it), bilingual EN/ES, Core Web Vitals, programmatic city pages, FAQ schema for rich Google results, valid SSL, commercial fleet portal, and sticky tap-to-call/text triple CTA. That's 10+ wins on a single AI prompt — guaranteed."*

---

## Client handover checklist

- [ ] Convert master demo repo to GitHub Template
- [ ] Use template → create client's repo
- [ ] Generate fresh fine-grained PAT scoped to client's repo only
- [ ] Update `content.json` NAP to match client's Google Business Profile EXACTLY (case, punctuation, suite, phone format)
- [ ] Change `ADMIN_PASSWORD` in `admin.html` and `delta-engine.js`
- [ ] Update `seo.canonicalBase`, `seo.dotNumber`, `seo.socialLinks` to match client
- [ ] Hand client the PAT + admin URL + password — they edit, push, done

---

## What's NOT in this build (by spec)

- ❌ Cart / e-commerce (no `wso_cart`, `delta_cart`)
- ❌ Team member profiles (replaced by stats + trust badges + reviews with response times)
- ❌ Hardcoded GitHub repo URL or token (everything in localStorage)
- ❌ Java / Node.js / build steps — pure HTML + vanilla JS + JSON

---

## Browser support

Modern evergreen browsers (Chrome 100+, Firefox 100+, Safari 15+, Edge 100+). No IE.
