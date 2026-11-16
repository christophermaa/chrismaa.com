/**
 * Global site settings. Everything else reads from here.
 */
export const site = {
  name: 'Christopher Ma',
  shortName: 'CM',
  role: 'ML engineer-researcher',
  tagline:
    'I build real-time AI systems for noisy, high-dimensional sensor data, from 64-channel EEG streams to closed-loop hardware control.',
  description:
    'Christopher Ma — machine-learning engineer-researcher at the University of Helsinki building real-time deep-learning pipelines for sensor data, benchmarked against classical baselines.',
  location: 'Helsinki · open to relocation in the EU',
  githubUser: 'christophermaa',
  links: {
    github: 'https://github.com/christophermaa',
    linkedin: 'https://www.linkedin.com/in/christophermaa',
    scholar: '',
    orcid: 'https://orcid.org/0000-0003-3749-3809',
  },
  sourceRepo: 'https://github.com/christophermaa/chrismaa.com',
} as const;

export type Site = typeof site;
