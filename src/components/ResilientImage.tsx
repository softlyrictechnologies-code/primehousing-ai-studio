import { useState } from 'react';
import { Mountain } from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  fallbackTitle?: string;
}

export function ResilientImage({
  src,
  alt,
  className = '',
  loading = 'lazy',
  fallbackTitle,
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F7E8F1] via-[#F2F4F1] to-[#DCE6E0] text-[#9B0B5E]/70 p-4 text-center ${className}`}
      >
        <Mountain className="w-8 h-8 mb-2 stroke-[1.5]" />
        {fallbackTitle && (
          <span className="text-xs font-medium text-[#1C1F1E]/70 max-w-[200px] truncate">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
