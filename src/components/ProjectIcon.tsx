import {
  Building2,
  Bus,
  CheckCircle2,
  Compass,
  Droplets,
  FileCheck2,
  GraduationCap,
  Grid3x3,
  Hospital,
  Landmark,
  Lightbulb,
  MapPin,
  Route,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Train,
  Trees,
  Zap,
} from 'lucide-react';

export const PROJECT_ICON_OPTIONS = [
  'ShieldCheck',
  'FileCheck2',
  'MapPin',
  'Route',
  'Trees',
  'Grid3x3',
  'Compass',
  'CheckCircle2',
  'Zap',
  'Droplets',
  'Lightbulb',
  'Building2',
  'Landmark',
  'GraduationCap',
  'Hospital',
  'ShoppingBag',
  'Train',
  'Bus',
  'Sparkles',
] as const;

export function ProjectIcon({
  name,
  className = 'w-4 h-4 text-[#9B0B5E]',
}: {
  name?: string;
  className?: string;
}) {
  switch (name) {
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'FileCheck2':
      return <FileCheck2 className={className} />;
    case 'MapPin':
      return <MapPin className={className} />;
    case 'Route':
      return <Route className={className} />;
    case 'Trees':
      return <Trees className={className} />;
    case 'Grid3x3':
      return <Grid3x3 className={className} />;
    case 'Compass':
      return <Compass className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Droplets':
      return <Droplets className={className} />;
    case 'Lightbulb':
      return <Lightbulb className={className} />;
    case 'Building2':
      return <Building2 className={className} />;
    case 'Landmark':
      return <Landmark className={className} />;
    case 'GraduationCap':
      return <GraduationCap className={className} />;
    case 'Hospital':
      return <Hospital className={className} />;
    case 'ShoppingBag':
      return <ShoppingBag className={className} />;
    case 'Train':
      return <Train className={className} />;
    case 'Bus':
      return <Bus className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    default:
      return <CheckCircle2 className={className} />;
  }
}
