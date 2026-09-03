import type { GuideTopic } from '../guide'

// Tax rules from research/regulations-permits-and-tax.md (RT) section 4 and the tax-mode
// conventions of research/finance-and-kpis.md (FK) section 13. The rates the app applies
// are the TAX_RATES of src/engine/finance.ts (RT-76, RT-78, RT-79). Informational, not
// tax advice (see the legal disclaimer).
export const TAX_TOPICS: GuideTopic[] = [
  {
    id: 'vat-exemption',
    title: 'VAT exemption of feeds, fertilizers and seeds',
    section: 'tax',
    summary:
      'Fertilizers, seeds and livestock and poultry feeds with their ingredients are VAT-exempt; specialty feeds for fighting cocks, pets and aquarium fish are not; pesticides, tools and vet products are VATable.',
    paragraphs: [
      "NIRC section 109(1)(B) exempts the sale or importation of fertilizers; seeds, seedlings and fingerlings; fish, prawn, livestock and poultry feeds, including ingredients used in the manufacture of finished feeds, except specialty feeds for racehorses, fighting cocks, aquarium fish, zoo animals and other animals generally considered as pets. The paragraph survives the TRAIN, CREATE and CREATE MORE amendments and the BIR's registration questionnaire lists it as a tick box. So hog, chicken, duck, cattle, goat and fish feeds are exempt; gamefowl, dog and cat food are VATable at 12 percent. Ingredients that could also feed people (corn grits, rice bran, copra meal, soybean meal) sold as such are exempt only with certification that the grade is unfit for human consumption.",
      'VATable lines: pesticides, herbicides and other agrochemicals that are not fertilizers; tools, sprayers, netting, feeders and drinkers; veterinary drugs, vitamins and disinfectants; pet food and pet supplies; and, for a VAT-registered store, delivery fees. The FPA issues the VAT-exempt certificate manufacturers and importers use; at retail the exemption applies by the nature of the product. In the app every product carries a VAT-exempt flag defaulted from its category, frozen on each sale line so a later category edit does not rewrite history.',
    ],
    sources: ['RT:4.1', 'FK:13', 'RT-76'],
    tags: ['tax', 'feed', 'fertilizer', 'seed', 'pesticide', 'pet'],
    related: ['tax-modes', 'vat-threshold-and-percentage-tax', 'mixed-store-input-vat', 'feeds', 'pet-supplies'],
  },
  {
    id: 'vat-threshold-and-percentage-tax',
    title: 'The VAT threshold, percentage tax, the 8 percent option and the graduated rates',
    section: 'tax',
    summary:
      'VAT is mandatory above PHP 3 million of VATable sales; below it a non-VAT store pays 3 percent on its VATable sales only; the 8 percent option is on gross sales and rarely suits a feed store.',
    paragraphs: [
      'VAT registration is mandatory when gross sales other than those exempt under section 109 exceed PHP 3 million in the past or the next twelve months; exempt sales of feeds, fertilizer and seeds do not count toward the threshold, only the VATable lines do. Voluntary registration is allowed but locks the taxpayer in for three years; a person liable who fails to register pays VAT without input credits. Percentage tax for non-VAT taxpayers is 3 percent of gross quarterly sales (1 percent only from July 2020 to June 2023) and attaches to sales exempt only by the threshold, so the section 109(B) sales are outside both VAT and percentage tax; the non-VAT invoice shows "Sales Subject to Percentage Tax" and "Exempt Sales" separately. Filed quarterly within 25 days.',
      'The 8 percent option: a self-employed individual under the threshold may elect 8 percent on gross sales above PHP 250,000 in lieu of the graduated income tax and the percentage tax; not available to VAT-registered persons. Because the base includes the exempt, low-margin feed and fertilizer sales it almost never suits an agrivet: on PHP 4 million of sales with 10 percent net income, the option costs PHP 300,000 against about 52,500 of graduated income tax plus percentage tax. Graduated rates from 2023: 0 up to PHP 250,000 of taxable income, 15 percent to 400,000, 20 to 800,000, 25 to 2 million, 30 to 8 million, 35 above. Taxpayer classes: micro below PHP 3 million of gross sales, small to 20 million; micro and small get a two-page return, a 10 percent surcharge instead of 25 and half the interest.',
    ],
    sources: ['RT:4.2', 'FK:13', 'RT-78', 'RT-79'],
    tags: ['tax'],
    related: ['tax-modes', 'vat-exemption', 'bmbe', 'filing-and-penalties', 'mixed-store-input-vat'],
  },
  {
    id: 'bmbe',
    title: 'The Barangay Micro Business Enterprise (BMBE)',
    section: 'tax',
    summary:
      'Assets of PHP 3 million or less (land excluded) earn income-tax exemption and exemption from the minimum wage law; VAT or percentage tax, permits and licences stay.',
    paragraphs: [
      'A BMBE is a business in production, processing, trading or services with total assets, including those from loans but excluding the land the premises sit on, of not more than PHP 3 million. Benefits: exemption from income tax on income from operations; exemption from the minimum wage law while employees keep SSS, PhilHealth and Pag-IBIG; LGUs are encouraged to reduce local taxes and fees. The Certificate of Authority is issued free by the DTI Negosyo Center, valid two years and renewable; an exempt BMBE files an annual information return instead of an income tax return. BMBE status does not remove VAT or percentage tax, permit fees or sector licences. In the app a BMBE toggle in the tax settings sets income tax to zero while assets are at or below the cap, and the projection tests the cap each year (stock, equipment and receivables count; land does not).',
    ],
    sources: ['RT:4.3', 'FK:4.1'],
    tags: ['tax', 'permits'],
    related: ['tax-modes', 'minimum-wage', 'vat-threshold-and-percentage-tax'],
  },
  {
    id: 'filing-and-penalties',
    title: 'Filing, withholding and penalties',
    section: 'tax',
    summary:
      'Quarterly percentage or VAT returns and withholding, quarterly and annual income tax; 25 percent surcharge and 12 percent interest, halved for micro and small taxpayers; criminal penalties for not issuing invoices.',
    paragraphs: [
      'Calendar: quarterly percentage tax or VAT returns within 25 days of the quarter; withholding on compensation quarterly by statute and monthly in practice; quarterly income tax declarations on 15 May, 15 August and 15 November and the annual return on 15 April. A store renting from an individual or paying a professional withholds expanded withholding tax and issues the certificate; the app lets the owner enter the rates. Civil penalties: 25 percent surcharge for late filing or payment, 50 percent for wilful neglect or a false return; interest at double the legal rate (12 percent a year); micro and small taxpayers pay 10 percent surcharge and 6 percent interest with compromise penalties halved. Criminal: wilful failure to file, pay or keep records, at least PHP 10,000 and one to ten years; failure to issue invoices or invoices that do not reflect the sale, PHP 1,000 to 50,000 and two to four years per act; unauthorized printing of invoices, PHP 500,000 to 10 million. Local taxes unpaid after the 20-day window carry up to 25 percent surcharge and 2 percent a month interest.',
    ],
    sources: ['RT:4.4', 'RT:1.6'],
    tags: ['tax'],
    related: ['renewal-calendar', 'invoicing-eopt', 'bir-registration'],
  },
  {
    id: 'invoicing-eopt',
    title: 'Invoicing under the Ease of Paying Taxes Act',
    section: 'tax',
    summary:
      'One primary document, the Invoice, for goods and services; PHP 500 threshold with an end-of-day aggregate for tingi; the non-VAT invoice splits taxable and exempt sales.',
    paragraphs: [
      'Under RA 11976 and its regulations the Invoice (sales, cash, charge or commercial) is the one primary document for goods and services; official receipts, delivery receipts, order slips and collection receipts are supplementary and not proof of input VAT. That matches the store\'s credit sales: a charge invoice at delivery and a collection receipt on payment. An invoice is issued for every sale of PHP 500 or more, on request for any amount, and one end-of-day aggregate invoice covers the day\'s smaller sales when they total PHP 500 or more, which is what the app\'s daily summary produces for tingi. Contents: the seller\'s registered name, TIN and address, the word Invoice, serial number, date, the buyer\'s details for VAT-registered buyers, quantity, unit cost, description, and the VAT breakdown (VATable, exempt, zero-rated) for VAT sellers; a non-VAT seller prints "EXEMPT" if all sales are exempt or the split "Sales Subject to Percentage Tax" and "Exempt Sales", the agrivet case. A non-VAT seller issuing a VAT invoice becomes liable for the VAT plus a 50 percent surcharge; a VAT seller omitting "VAT-Exempt Sale" on an exempt sale becomes liable for VAT on it. The Authority to Print is free; senior citizen and PWD discount lines carry the buyer\'s signature.',
    ],
    sources: ['RT:4.5', 'RT:1.4'],
    tags: ['tax', 'selling'],
    related: ['bir-registration', 'tax-modes', 'records-and-bir-books', 'credit-policy'],
  },
  {
    id: 'mixed-store-input-vat',
    title: 'A mixed exempt and VATable store: input VAT allocation and the tax-mode choice',
    section: 'tax',
    summary:
      'A VAT-registered store credits input VAT on VATable purchases in full and a sales-ratio share on shared costs; below the threshold, non-VAT with 3 percent on the VATable lines is usually cheaper.',
    paragraphs: [
      'A VAT-registered person also making exempt sales credits all input tax directly attributable to VATable sales and a ratable portion of input tax that cannot be attributed to either activity; input VAT on freight, rent, utilities, bags and shelving attributable to the exempt lines is not creditable and becomes cost. Worked (illustrative): sales PHP 4 million, 75 percent exempt; VATable purchases PHP 780,000 with 93,600 of input VAT; shared costs PHP 300,000 with 36,000. VAT mode: output VAT 107,143 on the VATable million (prices VAT-inclusive), creditable input 93,600 plus 25 percent of 36,000, payable PHP 4,543 for the year, 27,000 of input VAT expensed. Non-VAT mode: percentage tax 3 percent of the VATable million, PHP 30,000, all input VAT (129,600) in cost, income tax on net income. The 8 percent option: PHP 300,000, 5.7 times more than non-VAT here because the base includes the exempt sales.',
      'Reading for the app\'s modes: "off" computes nothing (planning); "nonVat" applies 3 percent to the VATable lines, shows the graduated or 8 percent income tax and splits the invoice; "vat" applies 12 percent output on the VATable lines with direct plus ratable input credit and a quarterly return. The threshold test in the projection uses VATable sales only.',
    ],
    sources: ['RT:4.6', 'FK:13'],
    tags: ['tax'],
    related: ['tax-modes', 'vat-threshold-and-percentage-tax', 'vat-exemption'],
  },
  {
    id: 'tax-modes',
    title: 'The tax modes in the app and the tax card',
    section: 'tax',
    summary:
      "Off, non-VAT or VAT, set at onboarding and in Settings; the income statement's tax card estimates the period's figures in the mode the store runs in, for planning, not filing.",
    paragraphs: [
      "The store runs in one of three modes. Off: no tax is computed or tracked; the store is treated as pre-registration or as an income-tax-exempt BMBE for projections; a planning mode, not a filing position. Non-VAT: below the threshold and not VAT-registered; the tax card shows exempt sales, sales subject to percentage tax (the VATable lines plus delivery fees), the 3 percent percentage tax on those, and the 8 percent option on gross sales for comparison (the yearly PHP 250,000 exclusion is not applied to a period figure); input VAT on pesticides and tools is part of landed cost. VAT: 12 percent output VAT inside the VATable sales and delivery fees, input VAT inside the period's VATable purchase lines, and the payable or excess; VAT on shared costs is not counted and the sales-ratio share is left to the return.",
      "The split uses the VAT-exempt flag frozen on each sale line, falling back to the product's current flag for older lines; the rates are the constants confirmed against the regulations research (12 percent VAT, 3 percent percentage tax, the 8 percent option), so a rate change is one edit. Prices and supplier costs are treated as VAT-inclusive as in the research's worked example. The card is an estimate for planning: the return, the input-VAT apportionment and the income tax computation are the accountant's.",
    ],
    sources: ['FK:13', 'RT:4.6', 'RT-76', 'RT-78', 'RT-79'],
    tags: ['tax', 'taxMode'],
    related: ['vat-exemption', 'vat-threshold-and-percentage-tax', 'mixed-store-input-vat', 'bmbe', 'legal-disclaimer', 'income-statement-and-cash-flow'],
  },
]
