import type { GuideTopic } from '../guide'

// What the figures in the Guide and the app are and are not (PLAN.md F7: the price
// disclaimer; the research documents' own conventions and status lines).
export const DISCLAIMER_TOPICS: GuideTopic[] = [
  {
    id: 'price-disclaimer',
    title: 'Prices in this Guide are dated observations, never facts',
    section: 'disclaimers',
    summary: "Every price is an observation with its source, region, unit and date; the store's own purchase and sale records are its price series.",
    paragraphs: [
      "Every price in the Guide and in the research behind it is a dated observation: a PSA annual or monthly average, an FPA weekly national or regional figure, a manufacturer's filing, a field interview, a marketplace listing on a named day. Fertilizer moved 55 percent in five months in 2026 and differed by a third between regions in the same week; feed prices have no official series at all; pesticide dealer prices end in 2018. None of them is the price at the store's counter today. Use them to read cycles and to price a strategy, and replace them with the store's own dealer list prices and counter prices, which the app logs from the first purchase and shows on the price trend chart.",
    ],
    sources: ['PM:8', 'PM:7', 'PM:9', 'BS:5.2'],
    tags: ['disclaimer'],
    related: ['fertilizer-prices', 'feed-prices', 'pesticide-prices', 'price-signals'],
  },
  {
    id: 'legal-disclaimer',
    title: 'The permits and tax pages are an informational summary, not advice',
    section: 'disclaimers',
    summary:
      'Public rules as of the dates cited, read from the statutes and agency charters; fees and rules change; confirm with the agency, the LGU or an accountant before acting.',
    paragraphs: [
      "The permits and tax pages summarise public rules as of the dates cited: statutes as published on lawphil.net, agency citizen's charters and circulars, two municipal revenue codes as examples. They are not legal or tax advice. Fees, rates, thresholds and validity periods change (the invoice threshold is re-indexed every three years, wage orders come in tranches, the FDA fee increase was suspended for review, the ASF vaccine's regulator is changing), barangay and LGU fees are set locally, and several rules could not be read from a primary text (the BAI licence validity, the exact prescription-only list, the FPA dealer storage clauses, the input-VAT apportionment mechanics). The app's tax card is an estimate for planning: the return and the income tax computation are the accountant's, and a licence question is the FPA, BAI, BPI or FDA office's.",
    ],
    sources: ['RT:1', 'RT:4', 'RT:4.6', 'FK:13'],
    tags: ['disclaimer', 'tax', 'permits'],
    related: ['tax-modes', 'registration-sequence', 'fpa-dealer-licence', 'vet-line-licences'],
  },
  {
    id: 'advice-disclaimer',
    title: 'Feeding programs, crop rates and doses are defaults, not guarantees',
    section: 'disclaimers',
    summary:
      "Every program is a manufacturer's or the DA's recommendation for its own line; intake varies with breed, climate, health and feed quality; doses and rates come from the label.",
    paragraphs: [
      "Every feeding program in the Guide is a manufacturer's or the DA's recommendation for its own line, and actual intake varies with breed, climate, health and feed quality; the app shows them as defaults the user can edit, never as guarantees. Fertilizer rates are PhilRice and DA recommendations for a target yield in the absence of a soil test; a MOET result or a regional guide overrides them. Pesticide rates per tank, the number of sprays and the days to harvest are on the label, and the counter reads the label to the customer rather than quoting from memory; veterinary doses, routes, days and withdrawal periods are read from the label or insert, antimicrobials are sold against a veterinarian's prescription, and a sick animal is referred to a veterinarian. Where the research could not source a figure (corn fertilizer rates, native chicken and cattle feeding, bangus, vegetable seed viability) the Guide says so.",
    ],
    sources: ['PK:1', 'PK:2.4', 'PK:4.2', 'PK:5'],
    tags: ['disclaimer', 'feed', 'pesticide', 'vetDrug'],
    related: ['hog-feeding-program', 'rice-inputs', 'pesticide-classes', 'dosage-and-withdrawal'],
  },
  {
    id: 'research-status',
    title: 'What the research could and could not find',
    section: 'disclaimers',
    summary:
      'The nine research documents are marked partial; unsourced figures are labelled derived, illustrative or assumption, and the open questions say what the store records instead.',
    paragraphs: [
      'The nine research documents behind the Guide (industry and supply chain, product catalog, regulations and tax, storekeeping, buying, selling, market and seasons, finance and KPIs, product knowledge) are each marked partial, with their gaps listed. The conventions matter when reading a figure: "derived" is arithmetic done on sourced inputs with the arithmetic shown; "illustrative" is an input chosen only to make a worked example computable and must not be taken as a market observation; "assumption" is an engine default with no source, user-editable and listed in the open questions; "general" is international practice used where Philippine sources are silent. The largest gaps: no published margins for feeds, seeds, pesticides or the vet line; no trade-credit terms, minimum orders or rebate thresholds by line; no listahan bad-debt rate; no tingi shrinkage figure; no provincial rent; no Philippine ramp-up curve; no retail feed price series. In every case the app holds the figure as a user entry and replaces the default with the store\'s own history as it accumulates.',
    ],
    sources: ['FK:17', 'SS:Pricing and markup practice by line', 'IS:8', 'SK:13'],
    tags: ['disclaimer'],
    related: ['price-disclaimer', 'advice-disclaimer', 'legal-disclaimer', 'store-parameters'],
  },
]
