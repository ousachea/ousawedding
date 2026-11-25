/** Any text as a web address part: lowercase letters and numbers joined by single dashes */
export const slugify = (text: string) => text.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
