import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Clock, Mail, MapPin, Phone } from 'lucide-react';
import { EMPTY_WEBSITE_CONTENT, getPublicSiteContent } from '../../services/publicSiteContent';
import { createContactMessage } from '../../services/contactService';
import type { WebsiteContent } from '../../types/realEstate';
import { isValidEmail, isValidPhone } from '../../utils/formatters';

export function ContactPage() {
  const [content, setContent] = useState<WebsiteContent>(EMPTY_WEBSITE_CONTENT);
  const displayBrandName =
    !content.companyName || /^(prime housing|verdeland estates?)$/i.test(content.companyName.trim())
      ? 'PRIME HOUSING'
      : content.companyName;

  const [buyerName, setBuyerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useEffect(() => {
    document.title = `Contact Us — ${displayBrandName}`;
  }, [displayBrandName]);

  useEffect(() => {
    let active = true;
    getPublicSiteContent()
      .then((data) => {
        if (active) setContent(data);
      })
      .catch((err) => {
        console.error('[ContactPage:siteContent]', err);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (!buyerName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!isValidPhone(phone)) {
      setError('Please enter a valid 10-digit mobile number (e.g. 9876543210 or +91 9876543210).');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address or leave it blank.');
      return;
    }
    if (message.trim().length < 10) {
      setError('Please enter a message of at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const saved = await createContactMessage({
        name: buyerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        subject: 'General Contact Enquiry',
        message: message.trim(),
        source: 'contact-page',
      });
      setSubmittedRef(saved.enquiryRef);
      setBuyerName('');
      setPhone('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to send your message right now. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <div className="max-w-2xl mb-10">
        <p className="text-xs font-medium text-[#9B0B5E] mb-1.5">Advisory Desk</p>
        <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#1C1F1E] tracking-tight">
          Contact {displayBrandName}
        </h1>
        <p className="text-sm text-[#646B67] mt-2 leading-relaxed">
          Reach out for property site visits, title due diligence questions, or private land valuation consultations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Office Details */}
        <div className="lg:col-span-5 bg-white border border-[#EAE1E6] rounded-xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="font-display text-xl font-medium text-[#1C1F1E] mb-1">
              {content.companyName}
            </h2>
            <p className="text-xs text-[#646B67]">{content.tagline}</p>
          </div>

          <div className="space-y-4 pt-4 border-t border-[#EAE1E6] text-sm text-[#3D4340]">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#9B0B5E] shrink-0 mt-1" />
              <div>
                <p className="text-xs font-medium text-[#646B67]">Office Address</p>
                <p className="mt-0.5">{content.contactAddress}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-[#9B0B5E] shrink-0 mt-1" />
              <div>
                <p className="text-xs font-medium text-[#646B67]">Phone</p>
                <a
                  href={`tel:${content.contactPhone}`}
                  className="mt-0.5 block font-medium text-[#1C1F1E] hover:text-[#9B0B5E]"
                >
                  {content.contactPhone}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-[#9B0B5E] shrink-0 mt-1" />
              <div>
                <p className="text-xs font-medium text-[#646B67]">Email</p>
                <a
                  href={`mailto:${content.contactEmail}`}
                  className="mt-0.5 block font-medium text-[#1C1F1E] hover:text-[#9B0B5E]"
                >
                  {content.contactEmail}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-[#9B0B5E] shrink-0 mt-1" />
              <div>
                <p className="text-xs font-medium text-[#646B67]">Office Hours</p>
                <p className="mt-0.5">{content.officeHours}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7 bg-white border border-[#EAE1E6] rounded-xl p-6 sm:p-8">
          <h2 className="font-display text-2xl font-medium text-[#1C1F1E] mb-2">
            Send Us a Message
          </h2>
          <p className="text-xs text-[#646B67] mb-6">
            Your enquiry is recorded directly for follow-up by our advisory staff.
          </p>

          {submittedRef ? (
            <div className="p-6 rounded-xl bg-[#FBF4F8] border border-[#9B0B5E]/20 space-y-3">
              <CheckCircle2 className="w-9 h-9 text-[#9B0B5E]" />
              <h3 className="text-lg font-semibold text-[#1C1F1E]">Message Received</h3>
              <p className="text-sm text-[#3D4340]">
                Thank you for contacting {content.companyName}. Our team will respond during office hours.
              </p>
              <p className="text-xs font-mono text-[#9B0B5E] font-medium">
                Enquiry Reference: {submittedRef}
              </p>
              <button
                type="button"
                onClick={() => setSubmittedRef(null)}
                className="text-xs font-medium text-[#9B0B5E] hover:underline pt-1"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  required
                  placeholder="Your full name"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#3D4340] mb-1">
                    Phone Number <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3D4340] mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  How Can We Help? <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  placeholder="Tell us about the location, parcel size, or service you need..."
                  className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 text-sm font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] disabled:opacity-60 rounded-lg transition-colors"
              >
                {submitting ? 'Sending Message...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
