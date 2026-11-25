interface SocialSidebarProps {
  contactPhone?: string;
}

const DEFAULT_WHATSAPP_NUMBER = '919840040327';
const FACEBOOK_URL = 'https://www.facebook.com/primehousingproperties';
const INSTAGRAM_URL = 'https://www.instagram.com/primehousing.properties';

function getWhatsAppUrl(rawPhone?: string): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (!digits) {
    return `https://wa.me/${DEFAULT_WHATSAPP_NUMBER}`;
  }
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

export function SocialSidebar({ contactPhone }: SocialSidebarProps) {
  const whatsappUrl = getWhatsAppUrl(contactPhone);

  return (
    <aside
      aria-label="Social media quick links"
      className="fixed right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 p-1.5 bg-white border border-[#EAE1E6] rounded-2xl shadow-[0_10px_28px_-6px_rgba(21,24,23,0.18)]"
    >
      {/* WhatsApp */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        title="WhatsApp"
        className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m5.81 14.07c-.24.68-1.42 1.31-1.97 1.38-.52.08-1.18.11-1.91-.12-.44-.14-1.01-.33-1.74-.64-3.05-1.31-5.04-4.38-5.19-4.58-.15-.2-1.24-1.65-1.24-3.15s.78-2.23 1.06-2.54c.28-.3.61-.38.81-.38.2 0 .41 0 .59.01.19.01.44-.07.69.53.26.62.87 2.14.95 2.29.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.18-.32.4-.46.53-.15.15-.31.32-.13.62.18.3.78 1.29 1.68 2.09 1.16 1.03 2.13 1.35 2.43 1.5.3.15.48.13.66-.08.18-.2.76-.88.96-1.18.2-.3.4-.25.68-.15.28.1 1.77.83 2.07.98.3.15.5.23.58.36.07.12.07.72-.17 1.4z" />
        </svg>
      </a>

      {/* Facebook */}
      <a
        href={FACEBOOK_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Follow on Facebook"
        title="Facebook"
        className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-[#1877F2] hover:bg-[#1877F2]/10 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
          <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.87.24-1.46 1.49-1.46H16.7V4.94c-.3-.04-1.33-.13-2.53-.13-2.5 0-4.21 1.53-4.21 4.33V11H7.2v3h2.76v8h3.54z" />
        </svg>
      </a>

      {/* Instagram */}
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Follow on Instagram"
        title="Instagram"
        className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-[#E4405F] hover:bg-[#E4405F]/10 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      </a>
    </aside>
  );
}
