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
    focus: 'High-impact clinical dermatology',
  },
  {
    id: 'jama-dermatology',
    name: 'JAMA Dermatology',
    shortName: 'JAMA Derm',
    impactFactor: 11.0,
    metricYear: 2025,
    focus: 'Practice-changing clinical research',
  },
  {
    id: 'bjd',
    name: 'British Journal of Dermatology',
    shortName: 'BJD',
    impactFactor: 8.2,
    metricYear: 2025,
    focus: 'Clinical and translational dermatology',
  },
  {
    id: 'jeadv',
    name: 'Journal of the European Academy of Dermatology and Venereology',
    shortName: 'JEADV',
    impactFactor: 8.0,
    metricYear: 2025,
    focus: 'Guidelines and international clinical research',
  },
  {
    id: 'jaad-international',
    name: 'JAAD International',
    shortName: 'JAADi',
    impactFactor: 6.5,
    metricYear: 2025,
    focus: 'Open-access global dermatology',
  },
  {
    id: 'jid',
    name: 'Journal of Investigative Dermatology',
    shortName: 'JID',
    impactFactor: 5.7,
    metricYear: 2025,
    focus: 'Cutaneous biology and translational science',
  },
]
