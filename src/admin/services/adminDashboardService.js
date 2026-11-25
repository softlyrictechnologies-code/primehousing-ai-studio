import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatFirebaseError, mapPropertyDoc, toIsoString } from '../../services/firebaseUtils';
import { getRecentAdminLogs } from './adminLogService';
import { getAllProjectsAdmin } from './adminProjectService';

export async function getAdminDashboardStats() {
  try {
    const [propertiesSnap, allProjects, inquiriesSnap, sellerSnap, messagesSnap, usersSnap, activityLog] =
      await Promise.all([
        getDocs(collection(db, 'properties')),
        getAllProjectsAdmin().catch(() => []),
        getDocs(query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'sellerSubmissions'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc'))).catch(
          () => ({ docs: [] })
        ),
        getDocs(collection(db, 'users')).catch(() => ({ docs: [] })),
        getRecentAdminLogs(15),
      ]);

    const properties = propertiesSnap.docs
      .filter((d) => d.data()?.entityType !== 'project')
      .map(mapPropertyDoc);
    /** @type {import('../../types/realEstate').LandownerSubmission[]} */
    const submissions = sellerSnap.docs.map((docSnap) => {
      const data = docSnap.data() || {};
      return {
        id: docSnap.id,
        submissionRef: data.submissionRef || docSnap.id.slice(0, 10).toUpperCase(),
        ownerName: data.sellerName || data.ownerName || '',
        phone: data.sellerPhone || data.phone || '',
        email: data.sellerEmail || data.email || '',
        location: data.location || '',
        districtTownVillage: data.districtTownVillage || data.location || '',
        propertyType: data.propertyType || '',
        area: Number(data.areaValue || data.areaSqFt || 0),
        areaUnit: /** @type {import('../../types/realEstate').AreaUnit} */ (data.areaUnit || 'Sq. Ft.'),
        expectedPrice: Number(data.expectedPrice || 0),
        description: data.description || '',
        roadAccess: data.roadAccess || '',
        approvalDetails: data.approvalDetails || '',
        images: Array.isArray(data.images) ? data.images : [],
        additionalNotes: data.additionalNotes || '',
        consentGiven: Boolean(data.consentToContact ?? data.consentGiven),
        reviewStatus: /** @type {import('../../types/realEstate').SubmissionReviewStatus} */ (data.reviewStatus || data.status || 'pending'),
        adminNotes: data.adminNotes || '',
        submittedAt: toIsoString(data.createdAt),
        reviewedAt: toIsoString(data.reviewedAt) || null,
      };
    });

    const inquiries = inquiriesSnap.docs.map((docSnap) => {
      const data = docSnap.data() || {};
      const statusLower = String(data.status || 'new').toLowerCase();
      /** @type {import('../../types/realEstate').EnquiryStatus} */
      const enquiryStatus =
        statusLower === 'closed'
          ? 'Closed'
          : statusLower === 'contacted'
            ? 'Contacted'
            : 'New';
      return {
        id: docSnap.id,
        enquiryRef: docSnap.id.slice(0, 10).toUpperCase(),
        buyerName: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        propertyId: data.propertyId || null,
        propertyTitle: data.projectName || data.propertyTitle || 'Property Enquiry',
        projectId: data.projectId || null,
        projectName: data.projectName || '',
        projectSlug: data.projectSlug || '',
        enquiryCategory: data.enquiryCategory || '',
        enquiryType: /** @type {'property' | 'project' | 'general'} */ (
          data.projectId ? 'project' : data.propertyId ? 'property' : 'general'
        ),
        message: data.message || '',
        enquiryStatus,
        rawStatus: statusLower,
        followUpNotes: data.adminNotes || '',
        createdAt: toIsoString(data.createdAt),
        updatedAt: toIsoString(data.updatedAt || data.createdAt),
      };
    });

    const stats = {
      totalProperties: properties.length,
      publishedProperties: properties.filter((p) => p.published && !p.isSoldOut).length,
      draftProperties: properties.filter((p) => !p.published).length,
      soldOutProperties: properties.filter((p) => p.isSoldOut).length,
      pendingSubmissions: submissions.filter(
        (s) => s.reviewStatus === 'pending' || s.reviewStatus === 'clarification_requested'
      ).length,
      approvedSubmissions: submissions.filter((s) => s.reviewStatus === 'approved').length,
      rejectedSubmissions: submissions.filter((s) => s.reviewStatus === 'rejected').length,
      newEnquiries: inquiries.filter((e) => e.rawStatus === 'new').length,
      closedEnquiries: inquiries.filter((e) => e.rawStatus === 'closed').length,
      contactMessagesCount: messagesSnap.docs.length,
      usersCount: usersSnap.docs.length,
      totalProjects: allProjects.length,
      publishedProjects: allProjects.filter((p) => p.status === 'published').length,
    };

    const recentProperties = [...properties]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5);

    return {
      stats,
      recentProperties,
      recentSubmissions: submissions.slice(0, 5),
      recentEnquiries: inquiries.slice(0, 5),
      activityLog,
    };
  } catch (error) {
    throw formatFirebaseError(error, 'getAdminDashboardStats', 'properties/inquiries');
  }
}
