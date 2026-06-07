// Restrict team listings to a single organization. A Basecamp person matches if
// their company name contains ORG_NAME, OR their email is on ORG_EMAIL_DOMAIN.
// Both are overridable via env vars; defaults target Madarth.
const ORG_NAME = (process.env.ORG_NAME || "madarth").toLowerCase();
const ORG_EMAIL_DOMAIN = (process.env.ORG_EMAIL_DOMAIN || "madarth.com").toLowerCase();

export function isOrgPerson(person) {
  const company = (person?.company?.name || "").toLowerCase();
  const email = (person?.email_address || "").toLowerCase();
  return company.includes(ORG_NAME) || email.endsWith(`@${ORG_EMAIL_DOMAIN}`);
}
