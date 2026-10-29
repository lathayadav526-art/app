# AgriMithra

AgriMithra is a public startup application for farmers, buyers and agriculture experts, with a private owner console for managing the platform's service sectors.

## Run a local preview

Requires Node.js 22 or newer.

1. Open a terminal in this app folder.
2. Run npm install.
3. Run npm run dev.
4. Visit http://localhost:4173.
5. Create the platform owner account before inviting public members. In local development the one-time owner setup key is local-first-owner-setup.

Local development uses a JSON file at app/data/agrimithra-local.json and does not require a MongoDB account. When a member signs up without an email provider, the local verification code is shown on screen. This local-only shortcut is disabled in production.

## Member and admin panels

- A signed-in member opens **My user panel** from the left menu to view their account type, district and language, or edit their profile.
- The startup owner creates the first owner account from **Sign in** or **Join AgriMithra** → **Set up the platform owner account**. Do this once before inviting public members. In local development, the setup key is prefilled. If you already created a member account, owner setup can promote it when you provide that account's current password and the setup key.
- The owner and any account promoted to **Administrator** see **Admin panel** in the left menu. It includes platform overview, service-sector controls, user roles and access, content review, and an activity log.
- Public members can create farmer or buyer accounts. Agriculture expert accounts wait for owner review. Only the owner or an administrator can grant admin access.

The local address works only on the computer running the app. To let the public use it over the internet, deploy the app to a hosting service and configure the production database, HTTPS address, email delivery and private owner setup key below.

## What the first release includes

- Public landing page and account creation for farmers and buyers; agriculture expert accounts require owner approval.
- Email verification, sign-in, member profiles and language preference.
- Farmer dashboard, area conversion and a quantity calculator based on a rate the user supplies.
- Crop notes, learning cards with browser voice playback and links to official scheme sources.
- Community posts, likes and replies.
- Marketplace submissions, owner review, and buyer-to-seller inquiries.
- Owner overview, sector switches, user access and role management, content moderation and activity log.
- Installable web app shell with offline access to static pages. API and account features require a connection.

Live weather, commodity prices, crop image diagnosis, AI answers, payments, calling, sensor feeds and automatic translation require separately selected and configured providers. The app does not invent readings or present sample prices as live information.

## Prepare for public hosting

Copy .env.example to .env for a local environment, or set these values through the chosen hosting provider's secret settings:

- NODE_ENV=production
- PORT provided by the host
- PUBLIC_ORIGIN=https://your-domain
- MONGODB_URI and optionally MONGODB_DB
- AGRI_OWNER_SETUP_KEY as a newly generated random secret of at least 32 characters
- SMTP_URL and optionally SMTP_FROM for email verification

Never use the local owner setup key or commit .env to source control. The server refuses to start in production when the database, HTTPS site address, random setup secret or email delivery settings are missing. Set up the owner account once after deployment, then replace the setup key with a new private random secret of at least 32 characters in the host's secret settings. Production still requires a secret to be configured at startup.

The supplied report is product reference material for the AgriMithra experience. It does not itself provide database credentials, email credentials, verified agronomy content, market data feeds or hosting access.
