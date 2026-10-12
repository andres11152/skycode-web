/**
 * Validación de correo de los formularios públicos (contacto y landings de
 * campaña). Vive aquí, y no dentro de `ContactForm`, para que un formulario
 * liviano la use sin arrastrar el formulario completo a su bundle.
 */
export function isValidRealEmail(emailStr: string): boolean {
  const trimmed = emailStr.trim().toLowerCase();
  if (!trimmed) return false;

  // RFC 5322 regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) return false;

  // Block fake / dummy email domains
  const fakeDomains = [
    "test.com",
    "asdf.com",
    "fake.com",
    "xxx.com",
    "example.com",
    "mailinator.com",
    "tempmail.com",
    "dispostable.com",
    "gmai.com",
    "hotmai.com",
  ];
  const parts = trimmed.split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1];

  if (fakeDomains.includes(domain)) return false;
  if (parts[0].length < 1 || domain.length < 4 || !domain.includes(".")) return false;

  return true;
}
