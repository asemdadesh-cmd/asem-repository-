#!/usr/bin/env node
/** Generates a VAPID key pair for Web Push. Run: npm run gen:vapid */
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`
Add these to .env.local (and to your Vercel project's environment variables):

NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}
VAPID_PRIVATE_KEY=${privateKey}
VAPID_SUBJECT=mailto:you@example.com

Keep VAPID_PRIVATE_KEY secret. If you rotate the pair, every device must
re-subscribe to notifications.
`);
