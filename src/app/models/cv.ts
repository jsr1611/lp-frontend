export interface CvItem {
  title: string;
  org: string;
  location?: string;
  start: string;
  end?: string; // empty = "Present"
  points: string[];
}

export interface CvLink {
  label: string;
  url: string;
  icon: string;
}

/** A project as shown on the CV. */
export interface CvProject {
  name: string;
  when: string;
  role?: string;
  description: string;
  tech?: string[];
  url?: string;
}

export interface CvData {
  name: string;
  headline: string;
  location: string;
  email: string;
  links: CvLink[];
  experience: CvItem[];
  education: CvItem[];
  allProjectsUrl: string;
}
