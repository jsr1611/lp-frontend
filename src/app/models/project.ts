export type ProjectSource = 'github' | 'linkedin' | 'manual';

export interface Project {
  _id?: string;
  source: ProjectSource;
  title: string;
  description: string;
  url: string;
  demoUrl: string;
  tech: string[];
  stars?: number;
  period?: string; // shown on the CV
  role?: string;   // shown on the CV
  visible: boolean; // home page
  order: number;
  showOnCv?: boolean;
  cvOrder?: number;
  repoUpdatedAt?: string;
}
