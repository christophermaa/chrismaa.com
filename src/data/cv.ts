/**
 * Professional content for the public portfolio: experience, skills, interests, awards.
 * Kept deliberately work-focused: no community roles, early years, language levels or named people.
 */

export interface Milestone {
  period: string;
  title: string;
  org: string;
  kind: 'research' | 'industry' | 'education' | 'venture';
  summary: string;
  highlights?: string[];
}

export const experience: Milestone[] = [
  {
    period: '2025 — now',
    title: 'Doctoral Researcher',
    org: 'University of Helsinki',
    kind: 'research',
    summary:
      'Designed and lead a 64-channel EEG study building a real-time brain–computer interface that controls software and hardware in a closed loop.',
    highlights: [
      'Built the streaming pipeline end to end under real-time latency constraints, with online adaptation to signal drift',
      'Hybrid neural networks classify error-related brain responses from continuous data',
      'Benchmark deep vs. classical models on CSC HPC to decide when deep learning earns its cost',
      'Closed-loop control of RF reconfigurable intelligent surfaces with Aalto University',
    ],
  },
  {
    period: '2026 — now',
    title: 'Co-founder',
    org: 'Nuromie',
    kind: 'venture',
    summary: 'Brain-sensing wearable paired with a companion AI. Leading the technical concept and product roadmap.',
  },
  {
    period: '2026',
    title: 'Visiting Researcher',
    org: 'University of Edinburgh, School of Informatics',
    kind: 'research',
    summary: 'Research visit on machine-learning generalisation for neural data and wearable BCI hardware; ongoing collaboration on ML for EEG.',
  },
  {
    period: '2022 — 2024',
    title: 'Research Assistant',
    org: 'University of Helsinki',
    kind: 'research',
    summary:
      'Machine-learning classification of functional ultrasound (power-Doppler) data, EEG time-series analysis, and fMRI connectivity analysis for personalised brain-stimulation targets.',
  },
  {
    period: '2021 — 2022',
    title: 'Genome Sequencing Lab Assistant',
    org: 'Macrogen Europe',
    kind: 'industry',
    summary: 'Next-generation sequencing operations and QC on production pipelines in an accredited industry lab.',
  },
  {
    period: '2024',
    title: 'MSc Neuroscience',
    org: 'University of Helsinki',
    kind: 'education',
    summary: 'Thesis combining functional ultrasound imaging physics with computational classification (graded Very Good).',
  },
  {
    period: '',
    title: 'BSc Neuroscience',
    org: 'McGill University',
    kind: 'education',
    summary: '',
  },
];

export interface SkillGroup {
  area: string;
  accent: 'synapse' | 'dendrite' | 'spike';
  items: string[];
}

export const skills: SkillGroup[] = [
  {
    area: 'Machine learning',
    accent: 'synapse',
    items: [
      'Time-series classification',
      'Real-time streaming inference',
      'Deep vs. classical benchmarking',
      'Transfer learning',
      'Online adaptation',
    ],
  },
  {
    area: 'Programming',
    accent: 'synapse',
    items: ['Python', 'PyTorch', 'TensorFlow', 'NumPy · SciPy · Pandas', 'C++', 'MATLAB', 'SQL', 'Bash', 'JavaScript', 'R', 'Dart'],
  },
  {
    area: 'AI-first engineering',
    accent: 'spike',
    items: ['Claude Code & agentic workflows', 'AI-assisted data pipelines', 'Literature synthesis', 'Technical documentation'],
  },
  {
    area: 'Signal & imaging',
    accent: 'dendrite',
    items: ['64-channel EEG (time & frequency)', 'Functional ultrasound', 'fMRI', 'NGS data QC', 'Statistics & experimental design'],
  },
  {
    area: 'Hardware & sensing',
    accent: 'dendrite',
    items: ['EEG acquisition (lab & telemetric)', 'RF metasurface control', 'Neural probes', 'Robotic control'],
  },
  {
    area: 'Engineering practice',
    accent: 'spike',
    items: ['CSC HPC clusters', 'Parallel batch pipelines', 'Git', 'Reproducible workflows', 'Debugging & docs'],
  },
  {
    area: 'Space & physics',
    accent: 'synapse',
    items: [
      'Astrophysics (ANU ASTR1001)',
      'Astronomy & space (ANU ASTR1003)',
      'Coherent imaging (ultrasound)',
      'Doppler processing',
    ],
  },
];

export interface Interest {
  kicker: string;
  title: string;
  body: string;
  tags?: string[];
  featured?: boolean;
}

export const interests: Interest[] = [
  {
    kicker: 'looking up',
    title: 'Space & Earth observation',
    body: "I took astrophysics (ASTR1001) and astronomy & space (ASTR1003) at the Australian National University out of curiosity, and Earth observation is where I want to point my work next. SAR has a lot in common with the imaging I already do: functional ultrasound and SAR both form images from phase-coherent echoes, both lean on Doppler processing, and both turn noisy time series into monitoring that people can act on.",
    tags: ['Astrophysics · ANU', 'Astronomy & space · ANU', 'Coherent imaging', 'Doppler', 'SAR', 'Persistent monitoring'],
    featured: true,
  },
];

export const awards: string[] = [
  'Nordic Early Career Travel Support (2026)',
  'Una Europa Researcher Mobility Instrument (2026)',
  'HiLIFE Research Trainee Scholarship (2024)',
  'International Exchange Grant (2023)',
  'Finland Scholarship (2022)',
];
