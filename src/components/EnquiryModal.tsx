import { useState, type FormEvent } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import type { Property } from '../types/realEstate';
import { createInquiry } from '../services/inquiryService';
import { formatCurrency, isValidEmail, isValidPhone } from '../utils/formatters';

interface EnquiryModalProps {
  property: Property | null;
  onClose: () => void;
}

export function EnquiryModal({ property, onClose }: EnquiryModalProps) {
  const [buyerName, setBuyerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  if (!property) return null;

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
    if (message.trim().length < 8) {
      setError('Please include a brief enquiry message (at least 8 characters).');
      return;
    }

    setSubmitting(true);
    try {
      const saved = await createInquiry({
        name: buyerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        propertyId: property.id,
        propertyTitle: property.title,
        message: message.trim(),
        source: 'property-card',
      });
      setSubmittedRef(saved.enquiryRef);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit your enquiry right now. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1D0816]/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enquiry-modal-title"
    >
      <div className="w-full max-w-lg bg-white border border-[#EAE1E6] rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#EAE1E6]">
          <div>
            <p className="text-xs font-mono text-[#646B67]">{property.propertyRef}</p>
            <h2 id="enquiry-modal-title" className="font-display text-xl font-medium text-[#1C1F1E]">
              Enquire About Property
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-[#646B67] hover:bg-[#FAF8F9] hover:text-[#1C1F1E]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {submittedRef ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="w-11 h-11 text-[#9B0B5E] mx-auto" />
              <h3 className="font-display text-xl font-medium text-[#1C1F1E]">
                Enquiry Received
              </h3>
              <p className="text-sm text-[#3D4340]">
                Thank you, {buyerName}. Our advisory team has logged your enquiry for{' '}
                <span className="font-medium text-[#1C1F1E]">{property.title}</span>.
              </p>
              <p className="text-xs font-mono bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg py-2 px-3 inline-block text-[#9B0B5E]">
                Reference: {submittedRef}
              </p>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 rounded-lg bg-[#FAF8F9] border border-[#EAE1E6] flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1C1F1E] truncate">{property.title}</p>
                  <p className="text-xs text-[#646B67] truncate">{property.location}</p>
                </div>
                <span className="text-sm font-semibold text-[#9B0B5E] tabular-nums shrink-0">
                  {formatCurrency(property.price)}
                </span>
              </div>

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
                  placeholder="Your full name"
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#3D4340] mb-1">
                    Phone Number <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    required
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
                  Message <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask about site visits, documentation, road access, or pricing..."
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-[#3D4340] hover:bg-[#FAF8F9] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] disabled:opacity-60 rounded-lg transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Send Enquiry'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
