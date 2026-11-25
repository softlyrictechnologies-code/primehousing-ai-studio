import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { Property } from '../types/realEstate';
import { formatArea, formatCurrency } from '../utils/formatters';
import { ResilientImage } from './ResilientImage';

interface PropertyCardProps {
  property: Property;
  onEnquire?: (property: Property) => void;
}

function PlotSizeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 text-[#646B67] shrink-0"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="3" height="3" rx="0.5" />
      <rect x="17" y="4" width="3" height="3" rx="0.5" />
      <rect x="4" y="17" width="3" height="3" rx="0.5" />
      <rect x="17" y="17" width="3" height="3" rx="0.5" />
      <path d="M7 5.5h3M14 5.5h3M7 18.5h3M14 18.5h3M5.5 7v3M5.5 14v3M18.5 7v3M18.5 14v3" />
      <path d="M12 9.5v5M9.5 12h5" />
    </svg>
  );
}

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <article className="group flex flex-col bg-white border border-[#EAE1E6] rounded-2xl overflow-hidden transition-all duration-200 hover:border-[#9B0B5E]/40 hover:shadow-[0_12px_32px_-12px_rgba(28,31,30,0.14)]">
      <Link
        to={`/properties/${property.id}`}
        className="block relative aspect-[4/3] overflow-hidden bg-[#F7E8F1]"
      >
        <ResilientImage
          src={property.images[0]}
          alt={property.title}
          fallbackTitle={property.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {property.status === 'sold' ? (
          <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#1C1F1E]/85 text-white shadow-sm">
            Sold
          </span>
        ) : property.isFeatured ? (
          <span className="absolute top-3.5 left-3.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-[#9B0B5E] text-white shadow-sm">
            Featured
          </span>
        ) : null}
      </Link>

      <div className="flex flex-col flex-1 p-5">
        <Link to={`/properties/${property.id}`} className="block mb-3">
          <h3 className="text-[17px] font-semibold text-[#1C1F1E] leading-snug group-hover:text-[#9B0B5E] transition-colors line-clamp-2">
            {property.title}
          </h3>
        </Link>

        <div className="space-y-2 mb-4 text-sm text-[#3D4340]">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-[#646B67] shrink-0" />
            <span className="truncate">{property.location}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <PlotSizeIcon />
            <span className="tabular-nums truncate">
              {formatArea(property.area, property.areaUnit)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-4 mt-auto border-t border-[#EAE1E6]/80">
          <p className="text-lg font-bold text-[#9B0B5E] tabular-nums">
            {formatCurrency(property.price)}
          </p>
          <Link
            to={`/properties/${property.id}`}
            className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-[#9B0B5E] border border-[#9B0B5E] hover:bg-[#9B0B5E] hover:text-white rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            Details
          </Link>
        </div>
      </div>
    </article>
  );
}
