# Twologue

*Between Us*

## Overview

Twologue is a web app that helps couples stay close, have fun together and talks things through, in short sessions of a few minutes a day. It brings together things couples usually do in separate places:

- **Daily connection:** a shared daily question, appreciation notes and small two-minute challenges
- **Shared journaling:** private journal entries revealed together, stories written one paragraph at a time, and time capsules sealed until a date you choose
- **Games and activities:** guessing games, quick-fire rounds and a date night generator
- **Planning and growth:** a shared bucket list and dream board, weekly check-ins, a map of your values, and guided programs

Several of these use one shared idea, **answer privately, reveal together**: each partner responds on their own, and the answers appear for both only once both have replied. It is one of the app's building blocks.

The app is private and never competitive. There are no breaking streaks, no penalties and no scores to beat. It is made for newer couples, couples who have been together for years, and long-distance couples.

**Current status:** the landing page, authentication, couple pairing, and core app experiences (`/app`) across **Today**, **Journal**, and **Us** are built and backed by Supabase. **Play** and **Grow** are planned.

## Features

### Available now

**Landing page**

- Hero section that explains the product, who it is for, and an overview of what Twologue will include
- "Made for two" section for newer couples, couples together for years, and long-distance couples
- A daily ritual walkthrough with an interactive **reveal together** demo
- Interactive demos of four features: a shared journal, mini games, check-ins and guided programs
- Six colour themes (Ember, Dew, Bloom, Dusk, Tide, Slate), each in light and dark mode, with a theme picker that remembers your choice
- Responsive layout for phones, tablets and desktops

**Web app (`/app`)**

- **Account and pairing:** email sign-up and sign-in with profile details (display name, gender, age, time zone), invite link and code pairing, and a 3-step couple onboarding setup (shared time zone, middle time zone calculation for long-distance couples, relationship details, and shared feature switches)
- **Today:**
  - **Daily question:** shared question with private answers, side-by-side reveal once both answer, written replies, and emoji reactions. Shows "days answered together" instead of streaks that break
  - **Appreciation notes:** short "I noticed... thank you" notes with starter templates, saved in an appreciation jar you can reread, with side-by-side expandable drawers
  - **Micro daily challenges:** daily two-minute activities across affection, words, play, and reflection (touch tasks automatically swap to remote-friendly ones for long-distance couples)
  - **Mood weather:** real-time mood status with weather icons, side-by-side partner display, auto-reset at midnight, reaction replies, and quick pause toggle
  - **Story reminder:** a "your turn" card alerting you when it is your turn to write in a shared story
- **Journal:**
  - **Blind-reveal journal ("Our pages"):** write on shared daily prompts in private, reveal entries side by side once both submit, react to entries, and browse past revealed pages
  - **Alternating stories ("Stories"):** collaborate on stories paragraph by paragraph with turn indicators, turn expiration grace handling (extend or surrender turn), Kalam handwritten styling, and text export
- **Us:**
  - **Time capsules ("Capsules"):** letters sealed until an anniversary, future date, or same day, with opening animations, author editing/deletion, and recipient visibility
  - Connected partner card and couple profile
  - Archives for past daily answers, challenge history (completed and skipped challenges), and time capsules
- **Settings and Profile:**
  - Shared feature switches to turn individual sections on or off for both partners with partner lock
  - Editable shared couple profile, personal profile settings, and secure sign out

### Planned

Every feature can be switched on or off for the couple.

| Area | Planned feature |
|---|---|
| Play | **How well do you know me?**: rounds where one partner answers and the other guesses |
| Play | **Would you rather, this or that, two truths and a lie**: quick games with cute, future-focused and (opt-in) spicy content |
| Play | **Date night generator**: three ideas filtered by time, mood, place and energy, which either partner can veto, with a rating afterwards |
| Us | **Weekly check-in**: a five-minute rating and reflection, ending with one small commitment |
| Us | **Shared lists and dream board**: a bucket list that moves from idea to planned to done, with "I want this too" votes, plus a visual dream board |
| Us | **Values and expectations map**: see where you align and where to talk, on money, family, career and more |
| Grow | **Themed journeys**: seven to fourteen day programs of five-minute activities |

The app centers on five main areas: **Today, Journal, Play, Us** and **Grow**, with Settings and Profile in the top bar.

## How to use

You can explore the landing page, and sign in to try the web app.

**Landing page**

1. **Open the landing page.** Read what Twologue is and who it is for.
2. **Try the reveal demo.** In "A small ritual, every day", tap **Reveal together** to see how two private answers appear side by side. Tap **Try again** to reset it.
3. **Try the other demos.** Under "The daily question is just the start", add to the shared journal, play a this-or-that round, share a mood in the check-in, and tap through the days of a guided program.
4. **Pick a theme.** Use the theme picker at the top of the page to choose a colour theme, and the sun or moon button to switch between light and dark mode. Your choice is saved in your browser.

The demos use sample text only. Nothing you tap is saved or sent anywhere.

**Web app (`/app`)**

1. **Sign up or sign in.** Tap **Sign in** in the top navigation or go to `/auth` to create an account with your email, password, and basic profile details (name, age, time zone).
2. **Pair with your partner.** After signing in, share your invite link or code, or visit `/join/:code` to accept your partner's invite. Complete the 3-step couple setup to set your shared time zone and toggle preferred features.
3. **Connect on Today.** Answer the shared daily question, exchange appreciation notes, complete today's micro challenge, and share your real-time mood weather.
4. **Write in Journal.** Answer private daily journal prompts in "Our pages" to reveal together and write collaborative stories paragraph by paragraph in "Stories".
5. **Review in Us and Settings.** Seal time capsules, look back at past daily answers, challenge history, and manage shared feature switches or profile details in **Profile** and **Settings**.

## Known issues

- **Waitlist sign-up:** The waitlist sign-up form is currently shown in the UI on the landing page, but configuration of secrets (e.g., Maileroo API key, sender email) has not yet been completed in Supabase. As a result, waitlist sign-up submissions will not send confirmation emails until these Supabase secrets are configured.

## Tech stack

**Used now**

| Area | Tools |
|---|---|
| Framework | React 19 and TypeScript, built with Vite |
| Routing | React Router |
| Styling | Tailwind CSS 4, shadcn/ui components (Radix UI), `tw-animate-css` |
| Database, auth, backend | Supabase (PostgreSQL with row-level security, email sign-in, database RPCs, Edge Functions) |
| Data fetching | TanStack Query |
| Icons | Lucide |
| Forms and validation | React Hook Form, Zod |
| Fonts (self-hosted) | Fraunces (headings), Figtree (body), Kalam (handwriting) |
| Theming | One `tokens.json` file turned into CSS variables by `scripts/build-theme.mjs`, applied through a `ThemeProvider` |
| Testing | Vitest |
| CI | GitHub Actions (tests and build on every push) |

## How to run on local

### Prerequisites

- [Node.js](https://nodejs.org/) 20.19 or newer (or 22.12 or newer) and npm
- Git

### Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/kunalkumar2203/twologue.git
   cd twologue
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Supabase backend and waitlist email delivery.**
   - Create a `.env.local` file in the project root with your Supabase credentials:

     ```bash
     VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```

   - Deploy the database migrations:

     ```bash
     supabase db push
     ```

   - The waitlist form calls the Supabase `send-waitlist-email` Edge Function by default. Deploy the function and configure secrets:

     ```bash
     supabase functions deploy send-waitlist-email
     supabase secrets set MAILEROO_API_KEY=mkey_... WAITLIST_FROM_EMAIL="Twologue <noreply@your-domain.com>" APP_URL=https://your-domain.com
     ```

     `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to Supabase Edge Functions automatically. In [Maileroo](https://maileroo.com), retrieve your **Sending Key** (used as `MAILEROO_API_KEY` or `MAILEROO_SENDING_KEY`).
     - **For testing:** You can use your Maileroo sandboxed domain for `WAITLIST_FROM_EMAIL` (e.g. `Twologue <noreply@your-sandbox-id.maileroo.org>`). Note that Maileroo sandbox domains restrict outbound deliveries to approved test recipients (up to 7 emails).
     - **For production:** Add and verify your custom sending domain in Maileroo (setting SPF/DKIM/DMARC DNS records), and set `WAITLIST_FROM_EMAIL` using an address from that verified domain.
     Never put `MAILEROO_API_KEY` or the service-role key in `.env.local` or any `VITE_` variable.

     The function saves the signup, sends a confirmation email through Maileroo, and records the delivery timestamp. Failed sends can be retried; a successful signup is not sent the confirmation more than once.

     **Local function testing:** run `supabase functions serve send-waitlist-email --no-verify-jwt` only in local development, with the required secrets set in a local Supabase secrets file.

4. **(Optional) Set up a custom waitlist endpoint.** To use another endpoint instead, create a file named `.env.local` in the project root:

   ```bash
   VITE_WAITLIST_URL=https://your-endpoint.example.com/waitlist
   ```

   The form sends a `POST` request with `{ "email": "..." }` as JSON to this address. If the variable is not set, the form calls the Supabase Edge Function instead.

5. **Start the server or deploy the frontend.** Choose one of these options:

   **A. Run locally**
   - Start the Vite development server:

     ```bash
     npm run dev
     ```

   - Open the address shown in the terminal (usually `http://localhost:5173`). The landing page is at `/`. The app screens are at `/app` (sign in at `/auth`).

   **B. Deploy to Vercel**
   - Push the repository to GitHub and import it into Vercel.
   - Keep the detected framework as **Vite**. The project already includes `vercel.json` for client-side route rewrites.
   - Use these Vercel settings:
     - **Build command:** `npm run build`
     - **Output directory:** `dist`
     - **Install command:** `npm ci`
   - In **Project Settings → Environment Variables**, add the production values from `.env.example`:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - Redeploy after adding or changing environment variables. `VITE_*` values are intentionally public and are bundled into the browser; never add a service-role key or Maileroo key to Vercel.
   - In Supabase **Authentication → URL Configuration**, set the deployed Vercel URL as the **Site URL** and add it to **Redirect URLs** (for example, `https://your-project.vercel.app/auth`).

### Other commands

| Command | What it does |
|---|---|
| `npm run build` | Checks types, then creates a production build in `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm test` | Runs the tests, including a check that every theme is complete |

The theme CSS (`src/theme/themes.generated.css`) is generated from `src/theme/tokens.json` automatically before `dev` and `build`. To change a colour, edit `tokens.json` and do not edit the generated file. Product name, tagline and default theme live in `src/config/brand.ts`.

## AI usage

- Used for brainstorming feature ideas recommendations and themes (color palettes) visualization before beginning development.
- Used as reference for tailwind CSS styling.
- Used as reference for storing global variables as key-value pairs in a single place, thus allowing easy access and reuse across files.

- Used for varying tones of existing themes to add differentiation in redundant/similar looking themes.
- Used as reference for landing page design ideas, understanding how shadcn UI components work.

- For mini demo of the 5 features (reveal together, journal, check-ins, guided programs) on landing page.

- Provided the initial database tables, their purposes, and planned project features to AI. Used it to identify potential additional tables required to support the planned functionality and refine the proposed database schema.

- Used for creating content in dictionary.ts for various sections across webapp.

- For implementing pairing mechanism for couples using invite link/code.

- For creating edge function in supabase for waitlist signup and confirmation email delivery via Maileroo.

- For increasing the static content library, to be used in sections like daily questions and challenges.

- For updating UI of "appreciate" and "notes for you" section on Today page.