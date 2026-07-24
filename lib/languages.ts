/**
 * Languages Fuchesi's AI calling agents speak.
 *
 * TODO: confirm — this list is a concrete claim about capability and needs
 * your sign-off. It is drawn from the languages your markets imply (UK and UAE
 * client base) plus what current speech stacks handle well. Add or cut freely.
 *
 * Worth getting right: "can AI calling agents speak Urdu?" is exactly the kind
 * of question people put to an AI assistant, and a specific named list is what
 * gets cited. A vague "any language" gets ignored.
 */
export type Language = {
  name: string;
  /** Endonym, rendered beside the English name — it makes the claim visibly true. */
  native: string;
  /** BCP-47 tag. Required on the endonym so screen readers switch voice. */
  code: string;
  /** Right-to-left scripts need dir="rtl" or the endonym renders mis-ordered. */
  rtl?: boolean;
};

export const languages: Language[] = [
  { name: 'English', native: 'English', code: 'en' },
  { name: 'Arabic', native: 'العربية', code: 'ar', rtl: true },
  { name: 'Urdu', native: 'اردو', code: 'ur', rtl: true },
  { name: 'Hindi', native: 'हिन्दी', code: 'hi' },
  { name: 'Spanish', native: 'Español', code: 'es' },
  { name: 'French', native: 'Français', code: 'fr' },
  { name: 'German', native: 'Deutsch', code: 'de' },
  { name: 'Portuguese', native: 'Português', code: 'pt' },
  { name: 'Turkish', native: 'Türkçe', code: 'tr' },
  { name: 'Mandarin', native: '中文', code: 'zh' },
];

/** Plain list for prose and schema, e.g. "English, Arabic, Urdu and Hindi". */
export const languageNames = languages.map((l) => l.name);
