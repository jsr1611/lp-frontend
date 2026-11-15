import { OWNER_NAME } from 'src/app/mappings/owner';
import { CvData, CvItem, CvProject } from 'src/app/models/cv';

/**
 * Built-in CV: used until the CV is first saved from /cv/edit, and as a fallback if the API is down.
 * The first save copies this into the database (and the projects into Projects).
 * Source: JumanazarSaidov_CV_2026.pdf and the featured-projects README.
 */

export const CV: CvData & { projects: CvProject[] } = {
  name: OWNER_NAME,
  headline: 'Backend Engineer | Java | Spring Boot | Microservices | SQL',
  location: 'Seoul, South Korea',
  email: 'jumanazar.saidov@gmail.com', // leave empty to hide
  links: [
    { label: 'GitHub', url: 'https://github.com/jsr1611', icon: 'bi-github' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/jsr1611', icon: 'bi-linkedin' },
  ],

  experience: [
    {
      title: 'Lead Software Engineer', org: 'PromDav AI Solutions – David E&C', start: 'Jun 2026', end: '',
      points: [
        'Architecting and leading the development of AI-driven automation solutions for enterprise ERP workflows and email processing pipelines.',
        'Designing scalable backend architectures (Java/Spring Boot, Microservices) to integrate LLM capabilities into legacy enterprise systems.',
        'Defining technical strategy, system designs (TDDs), and engineering standards across the AI integration pipeline.',
      ],
    },
    {
      title: 'Senior Software Engineer', org: 'Toptal – TheHelloApp.com (Contract)', start: 'Feb 2025', end: 'Dec 2025',
      points: [
        'Improved history log API response time by 10x by profiling slow SQL queries, adding composite indices, and refactoring N+1 queries across 3 microservices.',
        'Redesigned legacy chat service into a single-thread architecture, enabling per-user read statuses and reducing customer support tickets by 30%.',
        'Authored technical design documents for 4+ core features and drove cross-functional execution with frontend and QA teams.',
        'Conducted 50+ code reviews, identifying performance anti-patterns and establishing guidelines that reduced production hotfixes.',
      ],
    },
    {
      title: 'Senior Software Engineer', org: 'FPT Software Korea – Hyundai AutoEver America (Contract)', start: 'May 2024', end: 'Mar 2025',
      points: [
        "Designed RESTful APIs using Java 17/21, Spring Boot, and Kafka for Hyundai's Connected Car Data Integration platform, migrating 5+ legacy modules into microservices.",
        'Built ETL pipelines in Java and Node.js to migrate and transform 2M+ records across PostgreSQL, MongoDB, and Oracle with zero data loss.',
        'Maintained Kubernetes CI/CD pipelines (ArgoCD), reducing deployment time by 25% through parallelized build stages and caching.',
        'Developed internal admin UI tools that streamlined developer workflows and cut manual configuration effort by 40%.',
      ],
    },
    {
      title: 'Software Engineer', org: 'AttoLabs EU – BUBE Portal', start: 'Aug 2023', end: 'Apr 2024',
      points: [
        'Developed RESTful APIs (Kotlin/Spring Boot) and Angular UI components for a German national environmental data reporting platform serving 16 states.',
        'Resolved 50+ bugs/vulnerabilities and reviewed 3–5 PRs daily, maintaining 85%+ code coverage with JUnit and Mockito.',
      ],
    },
    {
      title: 'Software Engineer', org: 'SweetK Co., Ltd.', location: 'South Korea', start: 'Mar 2022', end: 'Jun 2023',
      points: [
        'Built backend APIs and frontend features for 4 production apps including data annotation tools and tourism CMS platforms (VisitSeoul.net).',
        'Implemented Jenkins CI/CD pipelines to automate releases, monitoring, and rollback procedures.',
      ],
    },
    {
      title: 'Software Engineer', org: 'DLIT Co., Ltd.', location: 'South Korea', start: 'May 2020', end: 'Aug 2021',
      points: ['Designed real-time data collection/visualization apps (Java, C#, MS SQL) deployed in semiconductor manufacturing clean rooms.'],
    },
    {
      title: 'Graduate Research Assistant', org: 'MSIS Lab, Chungbuk National University', start: 'Aug 2019', end: 'Jul 2020',
      points: ['Developed an image annotation/detection tool (Python, OpenCV, YOLOv3), boosting accuracy from 65% to 100% via model fine-tuning.'],
    },
  ] as CvItem[],

  education: [
    {
      title: 'MA, IT Technology Management', org: 'KAIST', start: '2015', end: '2017',
      points: ['GPA: 3.6/4.3 | Korean Government Scholarship Recipient'],
    },
    {
      title: 'BS, Telecommunication Engineering', org: 'Tashkent University of Information Technologies (TUIT)', start: '2009', end: '2013',
      points: ['Government Undergraduate Scholarship Recipient'],
    },
  ] as CvItem[],

  /** Selected projects not already covered by the experience above. */
  projects: [
    {
      name: 'MSIS Cloud Solution', when: 'Sep 2024 – Apr 2026',
      description: 'Cloud platform for MSIS Lab: a Next.js/React frontend over a Django REST Framework backend on PostgreSQL, with documented Open API endpoints and a versioned database schema.',
      tech: ['Next.js', 'React', 'Django REST Framework', 'PostgreSQL'],
    },
    {
      name: 'jumanazar.uz', when: 'Dec 2023 – Present', url: 'https://jumanazar.uz',
      description: 'Web platform for learning Arabic (dictionary, word lists and tests, localized in Uzbek and Arabic) that grew into a personal toolbox behind one account.',
      tech: ['Angular', 'TypeScript', 'Node.js', 'MongoDB'],
    },
    {
      name: 'NurPhoto', when: 'Jul 2026 – Aug 2026', url: 'https://github.com/jsr1611/featured-projects/releases/tag/nurphoto-v0.5.0',
      description: 'Desktop photo workbench for everyday editing plus compliant ID, passport and visa photos.',
      tech: ['Tauri v2', 'Rust', 'ONNX Runtime'],
    },
    {
      name: 'NurMail', when: 'Jul 2026', url: 'https://github.com/jsr1611/featured-projects/releases/tag/nurmail-v1.0.0',
      description: 'Local-first Android email client: IMAP/POP3 receiving and optional SMTP sending, with server settings auto-detected from the email domain.',
      tech: ['Kotlin', 'Jetpack Compose'],
    },
    {
      name: 'pdf2json', when: '2022',
      description: 'Converts PDF journal papers into structured JSON for research tooling; Python extraction pipeline exposed as a FastAPI service.',
      tech: ['Python', 'FastAPI'],
    },
  ] as CvProject[],

  /** "All projects" link under the selected projects. */
  allProjectsUrl: 'https://github.com/jsr1611/featured-projects',
};
