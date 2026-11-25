import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { EMPTY_WEBSITE_CONTENT, getPublicSiteContent } from '../../services/publicSiteContent';
import { ASSET_IMAGES } from '../../assets/media';
import type { WebsiteContent } from '../../types/realEstate';
import { ResilientImage } from '../../components/ResilientImage';

export function AboutPage() {
  const [content, setContent] = useState<WebsiteContent>(EMPTY_WEBSITE_CONTENT);
  const displayBrandName =
    !content.companyName || /^(prime housing|verdeland estates?)$/i.test(content.companyName.trim())
      ? 'PRIME HOUSING'
      : content.companyName;

  useEffect(() => {
    document.title = `About Us — ${displayBrandName}`;
  }, [displayBrandName]);

  useEffect(() => {
    let active = true;
    getPublicSiteContent()
      .then((data) => {
        if (active) setContent(data);
      })
      .catch((err) => {
        console.error('[AboutPage:siteContent]', err);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      {/* Header */}
      <section className="bg-white border-b border-[#EAE1E6]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <p className="text-xs font-medium text-[#9B0B5E] mb-2">About {displayBrandName}</p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium text-[#1C1F1E] tracking-tight leading-[1.15] mb-5">
              Trusted land brokerage built on documented verification.
            </h1>
            {content.aboutIntro && (
              <p className="text-base text-[#3D4340] leading-relaxed mb-4">{content.aboutIntro}</p>
            )}
            {content.aboutBackground && (
              <p className="text-sm text-[#646B67] leading-relaxed">{content.aboutBackground}</p>
            )}
          </div>
          <div className="lg:col-span-6 rounded-xl overflow-hidden border border-[#EAE1E6] aspect-[4/3]">
            <ResilientImage
              src={ASSET_IMAGES.aboutOfficeImg}
              alt="Advisory Office"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-medium text-[#9B0B5E] mb-1.5">What We Do</p>
          <h2 className="font-display text-3xl font-medium text-[#1C1F1E] tracking-tight">
            Advisory &amp; Verification Services
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {content.aboutServices.map((svc) => (
            <div key={svc.title} className="p-6 bg-white border border-[#EAE1E6] rounded-xl">
              <h3 className="text-base font-semibold text-[#1C1F1E] mb-2">{svc.title}</h3>
              <p className="text-sm text-[#646B67] leading-relaxed">{svc.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Business Values */}
      <section className="bg-white border-y border-[#EAE1E6]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-medium text-[#9B0B5E] mb-1.5">Operating Principles</p>
            <h2 className="font-display text-3xl font-medium text-[#1C1F1E] tracking-tight">
              Our Core Values
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.aboutValues.map((val) => (
              <div key={val.title} className="p-6 bg-[#FAF8F9] border border-[#EAE1E6] rounded-xl">
                <h3 className="text-base font-semibold text-[#1C1F1E] mb-2">{val.title}</h3>
                <p className="text-sm text-[#646B67] leading-relaxed">{val.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us & CTA */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <h2 className="font-display text-3xl font-medium text-[#1C1F1E] tracking-tight mb-8">
          Why Customers Choose {displayBrandName}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {content.whyChooseUs.map((item) => (
            <div key={item.title} className="p-5 bg-white border border-[#EAE1E6] rounded-xl">
              <h3 className="text-sm font-semibold text-[#1C1F1E] mb-2">{item.title}</h3>
              <p className="text-xs text-[#646B67] leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="p-8 bg-[#9B0B5E] text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-2xl font-medium mb-1">
              Looking to buy verified land or list an estate?
            </h3>
            <p className="text-sm text-[#F5E6EF]">
              Explore our active portfolio or speak directly with our advisory desk.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              to="/properties"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#9B0B5E] bg-white hover:bg-[#F7E8F1] rounded-lg"
            >
              <span>Explore Properties</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white border border-white/30 hover:bg-white/10 rounded-lg"
            >
              <span>Contact Us</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
