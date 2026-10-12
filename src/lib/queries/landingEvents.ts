import { query } from "../db";
import type { LandingEventInput } from "../landingEventSchema";

export async function recordLandingEvent(event: LandingEventInput): Promise<void> {
  await query(
    `INSERT INTO landing_events (kind, landing_page, utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
    [
      event.kind,
      event.landing_page,
      event.utm_source || null,
      event.utm_medium || null,
      event.utm_campaign || null,
      event.utm_term || null,
      event.utm_content || null,
      event.gclid || null,
    ]
  );
}
