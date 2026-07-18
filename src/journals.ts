export type CuratedJournal = {
  id: string
  name: string
  shortName: string
  impactFactor: number
  metricYear: number
  focus: string
}

export const curatedJournals: CuratedJournal[] = [
  {
    id: 'jaad',
    name: 'Journal of the American Academy of Dermatology',
    shortName: 'JAAD',
    impactFactor: 12.3,
    metricYear: 2025,
    focus: 'Broad clinical dermatology, guidelines, and CME',
  },
  {
    id: 'ajcd',
    name: 'American Journal of Clinical Dermatology',
    shortName: 'Am J Clin Derm',
    impactFactor: 11.4,
    metricYear: 2025,
    focus: 'Therapeutics, clinical management, and evidence-based reviews',
  },
  {
    id: 'jama-dermatology',
    name: 'JAMA Dermatology',
    shortName: 'JAMA Derm',
    impactFactor: 10.9,
    metricYear: 2025,
    focus: 'Evidence-based medicine, systematic reviews, and large cohorts',
  },
  {
    id: 'bjd',
    name: 'British Journal of Dermatology',
    shortName: 'BJD',
    impactFactor: 8.2,
    metricYear: 2025,
    focus: 'Clinical trials, translational research, and epidemiology',
  },
  {
    id: 'jeadv',
    name: 'Journal of the European Academy of Dermatology and Venereology',
    shortName: 'JEADV',
    impactFactor: 8.0,
    metricYear: 2025,
    focus: 'European and global clinical dermatology',
  },
  {
    id: 'jid',
    name: 'Journal of Investigative Dermatology',
    shortName: 'JID',
    impactFactor: 5.7,
    metricYear: 2025,
    focus: 'Basic skin science and translational research',
  },
]
