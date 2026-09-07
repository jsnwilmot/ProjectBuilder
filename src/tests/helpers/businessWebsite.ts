import { createProject } from "../../lib/createProject";
import type { ProjectRecord, ReviewItem } from "../../types/project";

export function createBusinessWebsite(): ProjectRecord {
  return createProject({
    identity: { id: "harbour-studio", projectName: "Harbour Studio Website" },
    client: { clientName: "Alex Morgan", businessName: "Harbour Studio" },
    intake: {
      appType: "businessWebsite",
      appPurpose: "Help visitors explore the studio's services and visit its partner sites.",
      problemStatement: "Visitors need one clear introduction to the studio and its services.",
      targetPlatform: "Static single-page website for desktop and mobile browsers; Astro preferred.",
      audienceVisibility: "Public-facing",
      targetUsers: "Prospective customers and community partners",
      requiredFeatures: "Anchor navigation\nService sections\nPartner links",
      featureDescription: "Navigation scrolls to the matching section; partner links open approved destinations.",
      acceptanceNotes: "Each navigation item reaches its named section and every partner link reaches the approved URL.",
      websitePages: "Single page: introduction, services, partners and contact sections",
      websiteServices: "Design consultations and partner services",
      websiteContactMethod: "Approved booking link supplied by the owner",
      domainStatus: "studio.example; owned by the client",
      hostingStatus: "Netlify; GitLab repository studio/website (https://gitlab.com/studio/website); production branch release; static deployment; Astro.",
      seoKeywords: "Studio services; page title and description supplied by the owner",
      dataSources: "None",
      authenticationExpectation: "None",
      websiteForms: "Not applicable",
      websiteAnalytics: "Not applicable",
      sensitiveDataNotes: "The site collects no personal data.",
      risks: "Incorrect external destinations and unapproved content must be caught before launch.",
      constraints: "Static assets only. No database, authentication, backend API or form processor.",
      outOfScope: "Accounts, database, backend API, forms and reports",
      brandStatus: "Established brand",
      logoStatus: "Approved logo supplied",
      logoFiles: "harbour-logo.svg",
      primaryColors: "Navy #142536 and white #FFFFFF",
      fontPreferences: "System sans-serif",
      brandTone: "Clear and welcoming",
      imageStyle: "Approved studio photographs",
      contentSource: "Owner supplies and approves copy and images",
      approvedAssets: "harbour-logo.svg; studio-exterior.webp",
      accessibilityContrastNotes: "Check readable text contrast and visible keyboard focus",
      successCriteria: "Visitors can find a service and follow its approved destination on mobile and desktop."
    },
    now: "2026-09-06T18:00:00.000Z"
  });
}

export function withWebsiteReviews(project = createBusinessWebsite()): ProjectRecord {
  return {
    ...project,
    packageGeneratedAt: "2026-09-06T18:00:00.000Z",
    readinessConfirmations: { scopeReviewed: true, acceptanceCriteriaReviewed: true, draftPackageReviewed: true }
  };
}

export function websiteReviewDecision(changes: Partial<ReviewItem> = {}): ReviewItem {
  return {
    id: "review-data-reportsDashboards", section: "Data", fieldKey: "reportsDashboards",
    label: "Reports or dashboards", reason: "No reports listed.", recommendedQuestion: "Are reports required?",
    source: "warning", status: "Not applicable", notApplicableReason: "Reporting is outside the approved website scope.",
    deferredReason: "", blocking: false, allowDeferred: true, updatedAt: "2026-09-06T18:00:00.000Z", ...changes
  };
}

/** Synthetic umbrella-site scenario; client-identifying intake stays in local verification only. */
export function createUmbrellaWebsite(): ProjectRecord {
  const project = createProject({
    identity: { id: "umbrella-site-regression", projectName: "Example Collective Website" },
    client: { clientName: "Fixture Owner", businessName: "Example Collective" },
    intake: {
      appType: "businessWebsite", audienceVisibility: "Public-facing",
      appPurpose: "Public static umbrella-brand landing website for an example collective and its four divisions.",
      problemStatement: "Provide a coherent introduction and navigation to the collective's divisions.",
      targetPlatform: "Static single-page public business website; Eleventy preferred; desktop and mobile browsers.",
      targetUsers: "Visitors exploring the collective and its divisions",
      requiredFeatures: "Home, Brands, About and Contact section navigation\nExplore Brands CTA\nFour division cards and links",
      featureDescription: "Use the approved landing-page reference and authoritative logos to present the umbrella brand and its divisions.",
      acceptanceNotes: "Verify the approved visual direction, all section navigation, division links and responsive adaptation.",
      websitePages: "Single page with Home, Brands, About and Contact sections; section/anchor navigation.",
      websiteServices: "Division One\nDivision Two\nDivision Three\nDivision Four",
      websiteContactMethod: "Contact section planned. Contact method and business contact details TBD by Project Owner before implementation.",
      domainStatus: "collective.example",
      hostingStatus: "Cloudflare Pages; GitHub-connected deployment; example-org/umbrella-site; https://github.example/example-org/umbrella-site; production branch main; Eleventy static site.",
      seoKeywords: "Example umbrella brand and its four divisions; approved content and semantic page structure.",
      workflows: "Use section navigation to explore the umbrella site and follow the approved division links.",
      dataSources: "None", authenticationExpectation: "None",
      websiteForms: "Not applicable", websiteAnalytics: "Not applicable",
      sensitiveDataNotes: "Static public website with no authenticated application, API, database or server-side processing.",
      constraints: "No database, authentication, backend API, server processing or form processor for Version 1. Do not invent contact information or URLs.",
      risks: "Preserve authoritative visual assets and verify approved destinations; resolve contact details before implementation.",
      outOfScope: "Reports, dashboards, application authentication, APIs, databases and server processing for Version 1.",
      brandStatus: "Approved example visual identity and landing-page reference",
      logoStatus: "Five authoritative logos confirmed available from the Project Owner",
      logoFiles: "umbrella-logo.png\ndivision-one-logo.png\ndivision-two-logo.png\ndivision-three-logo.png\ndivision-four-logo.png",
      primaryColors: "White background, navy text and blue accent",
      fontPreferences: "Approved heading and body fonts",
      brandTone: "Clear and professional",
      imageStyle: "Owner-supplied reference photography",
      brandRestrictions: "Do not regenerate, redraw or visually modify the authoritative logos.",
      contentSource: "Project Owner supplies the approved visual reference and authoritative brand assets before implementation.",
      approvedAssets: "approved-layout-reference.png\numbrella-logo.png\ndivision-one-logo.png\ndivision-two-logo.png\ndivision-three-logo.png\ndivision-four-logo.png",
      accessibilityContrastNotes: "Check readable contrast, keyboard navigation and responsive adaptation; respect reduced-motion preferences.",
      successCriteria: "Deliver the approved visual direction as a responsive static umbrella-brand landing site with working section navigation and division links."
    },
    now: "2026-09-06T18:00:00.000Z"
  });
  project.reviewItems = [websiteReviewDecision({ notApplicableReason: "Reports and dashboards are outside Version 1 scope." })];
  return project;
}
