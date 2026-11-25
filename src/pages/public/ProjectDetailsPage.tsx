import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getProjectBySlug } from '../../services/projectService';
import { EMPTY_WEBSITE_CONTENT, getPublicSiteContent } from '../../services/publicSiteContent';
import type { Project, WebsiteContent } from '../../types/realEstate';
import { ProjectDetailsTemplate } from '../../components/ProjectDetailsTemplate';

export function ProjectDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [siteContent, setSiteContent] = useState<WebsiteContent>(EMPTY_WEBSITE_CONTENT);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError('');
      try {
        const [proj, wc] = await Promise.all([
          getProjectBySlug(slug),
          getPublicSiteContent().catch(() => EMPTY_WEBSITE_CONTENT),
        ]);
        if (!active) return;
        setProject(proj);
        setSiteContent(wc);
        if (proj) {
          document.title = proj.seo?.title || `${proj.name} — PRIME HOUSING & PROPERTIES`;
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc && (proj.seo?.metaDescription || proj.shortDescription)) {
            metaDesc.setAttribute('content', proj.seo?.metaDescription || proj.shortDescription);
          }
        } else {
          document.title = 'Project Not Found — PRIME HOUSING & PROPERTIES';
        }
      } catch (err) {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'Unable to load project details.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="h-64 rounded-xl bg-white border border-[#EAE1E6] animate-pulse" />
        <div className="h-96 rounded-xl bg-white border border-[#EAE1E6] animate-pulse" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-medium text-[#1C1F1E] mb-3">
          {loadError ? 'Unable to Load Project' : 'Project Not Available'}
        </h1>
        <p className="text-sm text-[#646B67] mb-6">
          {loadError ||
            'This project may have been unpublished or moved. Browse our published properties or contact our advisory team.'}
        </p>
        <Link
          to="/properties"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explore Properties</span>
        </Link>
      </div>
    );
  }

  return <ProjectDetailsTemplate project={project} siteContent={siteContent} />;
}
