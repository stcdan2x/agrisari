import type { GuideTopic } from '../guide'

// Registration, sector licences and the rules that bind a dealer, from
// research/regulations-permits-and-tax.md (RT). Informational summary of public rules as
// of the dates cited, not legal advice (see the legal disclaimer).
export const PERMIT_TOPICS: GuideTopic[] = [
  {
    id: 'registration-sequence',
    title: 'Business registration in order (sole proprietorship)',
    section: 'permits',
    summary:
      "DTI business name, barangay clearance, mayor's permit, BIR registration, then the FPA and BAI licences in parallel; employer registrations only if hiring.",
    paragraphs: [
      "Each document is a prerequisite of the next: the DTI business name is asked for by the LGU, the FPA and the BAI; the barangay clearance is a legal precondition of the mayor's permit; the mayor's permit is a requirement of the BAI feed licence and, in practice, of BIR registration; the FPA and BAI licences are separate sectoral steps that run in parallel once the mayor's permit exists.",
      "Step 1, DTI business name: PHP 200 for barangay scope, 500 city or municipality, 1,000 regional, 2,000 national, plus PHP 30 documentary stamp; valid five years; renewal 180 days before to 90 days after expiry, then 90 more days with a 50 percent surcharge. Step 2, barangay clearance: no permit may issue without it; the barangay sets a reasonable fee by ordinance and must act within seven working days; under the Ease of Doing Business Act it is applied for and paid at the municipal one-stop shop. Step 3, the mayor's permit at the Business One Stop Shop with the sanitary permit and the environmental and agricultural clearances, three working days for simple and seven for complex applications, valid one year. Step 4, BIR registration on or before the start of business. Step 5, employer registrations with SSS, PhilHealth and Pag-IBIG only if hiring.",
    ],
    sources: ['RT:1', 'RT:1.1', 'RT:1.2', 'RT:1.3', 'RT:1.4', 'RT:1.5'],
    tags: ['permits', 'opening'],
    related: ['lgu-fees-and-local-tax', 'bir-registration', 'employer-registrations', 'renewal-calendar', 'opening-checklist'],
  },
  {
    id: 'lgu-fees-and-local-tax',
    title: "The mayor's permit, LGU fees and local business tax",
    section: 'permits',
    summary:
      'Local business tax on retailers up to 2 percent of the first PHP 400,000 and 1 percent above, halved on feeds, fertilizer and pesticides; permit, sanitary, garbage, scale-sealing and fire fees on top.',
    paragraphs: [
      "Local business tax on retailers (municipal ceiling): 2 percent a year on the preceding year's gross sales up to PHP 400,000 and 1 percent on the excess, due within the first 20 days of January or of each quarter. Dealers and retailers of essential commodities pay at no more than half those rates, and the list includes agricultural implements, fertilizers, pesticides, herbicides, other farm inputs and poultry and animal feeds; seeds and veterinary drugs are not listed. Worked: a store with PHP 4 million of prior-year sales, 3.6 million of it feeds, fertilizer and pesticides, pays about PHP 20,000 on those at half rate plus 8,000 on the rest, about 28,000 a year, plus fees.",
      "Example fee schedules: Manolo Fortich (2024) charges a mayor's permit fee by asset size from PHP 200 to 1,600, a sanitary inspection fee of PHP 250 per outlet and business tax at 2.8 and 1.4 percent with essentials halved; Paniqui charges a sanitary fee of PHP 150 to 300 by floor area and a garbage fee of PHP 200 to 500. Every scale used in sales must be tested, calibrated and sealed every six months by the treasurer's sealer (about PHP 50 to 85 a year). The Fire Safety Inspection Certificate costs 15 percent of all LGU permit fees, never below PHP 500, and the storage of flammable, combustible and toxic materials needs a storage clearance with its own fee.",
    ],
    sources: ['RT:1.3', 'RT:5.2', 'RT:5.3'],
    tags: ['permits', 'tax'],
    related: ['registration-sequence', 'renewal-calendar', 'consumer-act', 'fire-code-and-hazardous-waste'],
  },
  {
    id: 'bir-registration',
    title: 'BIR registration',
    section: 'permits',
    summary:
      'Form 1901 before the start of business, no registration fee since 2024, the certificate posted, books registered, invoices authorized; an invoice for every sale of PHP 500 or more.',
    paragraphs: [
      "A sole proprietor registers with the Revenue District Office on or before the start of business (form 1901; the online channel's questionnaire has a tick box for the section 109 exemption of fertilizers, seeds and feeds). The PHP 500 annual registration fee was repealed on 22 January 2024. Outputs: the Certificate of Registration, posted where the business is conducted; registration of the books of accounts; an Authority to Print invoices, free of charge; a Notice to Issue Invoices. Books and invoices are preserved five years. Under the Ease of Paying Taxes Act the invoice is the one primary document for goods and services; an invoice is issued for every sale of PHP 500 or more, on request for any amount, and one aggregate invoice at the end of the day for the smaller sales when they total PHP 500 or more. A taxpayer registered from 2024 starts as micro unless VAT-registered.",
    ],
    sources: ['RT:1.4', 'RT:4.5'],
    tags: ['permits', 'tax'],
    related: ['invoicing-eopt', 'records-and-bir-books', 'vat-threshold-and-percentage-tax', 'registration-sequence'],
  },
  {
    id: 'employer-registrations',
    title: 'Employer registrations and payroll on-costs',
    section: 'permits',
    summary: 'SSS at 15 percent of the salary credit (employer 10), PhilHealth 5 percent shared, Pag-IBIG PHP 200 each, 13th-month pay by 24 December.',
    paragraphs: [
      'SSS: report every employee at once; the contribution is 15 percent of the monthly salary credit from 2025 (employer 10, employee 5) on a floor of PHP 5,000 and a ceiling of 35,000; deducted contributions not remitted within 30 days are presumed misappropriated. PhilHealth: 5 percent of basic salary in 2024 and 2025 on a floor of PHP 10,000 and a ceiling of 100,000, split by default in equal halves. Pag-IBIG: 2 percent each from employee and employer on a fund salary capped at PHP 10,000, so PHP 200 each. The 13th month is a twelfth of the basic salary earned in the year, paid by 24 December and reported to DOLE by 15 January. A registered BMBE is exempt from the minimum wage law while its employees keep these benefits. The projection adds the on-costs as separate lines on top of the daily rate x 26 days.',
    ],
    sources: ['RT:1.5', 'RT:5.1', 'FK:4.1'],
    tags: ['permits', 'compensation-per-employee'],
    related: ['minimum-wage', 'bmbe', 'operating-expenses', 'kpi-compensation-per-employee'],
  },
  {
    id: 'renewal-calendar',
    title: 'The renewal calendar',
    section: 'permits',
    summary:
      'January for the LGU permits and taxes, quarterly returns 25 days after each quarter, income tax on 15 May, August, November and April, FPA every three years, DTI every five.',
    paragraphs: [
      "1 to 20 January (or the anniversary date if the LGU chooses): mayor's permit, barangay clearance, sanitary permit, fire certificate, garbage and regulatory fees, and the local business tax on prior-year sales (payable quarterly within the first 20 days of each quarter). Every six months: scale sealing. By 15 January: the 13th-month compliance report. 25 days after each quarter: the percentage tax return (non-VAT) or the VAT return, and the withholding returns (monthly in practice). 15 May, 15 August, 15 November: the quarterly income tax declarations of a self-employed individual; 15 April: the annual return. Every two years: the BMBE certificate. Every three years, filed three months before expiry: the FPA dealer licence and the ASD card. FDA licence: two years initially, then three. Every five years: the DTI business name. Every three years from 22 January 2024: the PHP 500 invoice threshold is re-indexed. Feed establishment registration is renewed annually. The app's Settings page holds the store's licences with their expiry dates and the dashboard warns as they approach.",
    ],
    sources: ['RT:1.6', 'SK:11'],
    tags: ['permits', 'tax'],
    related: ['registration-sequence', 'filing-and-penalties', 'fpa-dealer-licence', 'routines-and-checklists'],
  },
  {
    id: 'fpa-dealer-licence',
    title: 'The FPA dealer licence and the Accredited Safety Dispenser',
    section: 'permits',
    summary:
      'PHP 1,800 fertilizer, 2,500 pesticide, 4,000 both, valid three years, with a notarized application, the DTI certificate, a risk appraisal of the store and an ASD on staff.',
    paragraphs: [
      "Legal basis: PD 1144. No fertilizer or pesticide may be stored, distributed or sold unless registered with the FPA, and no one may sell them except under an FPA licence; selling in commercial quantities without one is an offence with penalties of up to a year or PHP 5,000 to 10,000 for pesticides and far heavier terms for fertilizer. Household pesticides are the FDA's, organic inputs BAFS's, and animal-facility chemicals moved to the FPA in 2021.",
      "Licence types (FPA Citizen's Charter 2026, DA AO 13 s.2000 fees): fertilizer dealer PHP 1,800, pesticide dealer 2,500, both 4,000, a cooperative member half the fee, a dealers' association member 3,200, dealer-repacker 1,800 with a repacking-site inspection; all valid three years, renewed three months before expiry, with a 50 percent surcharge within a month after expiry and 100 percent beyond. Requirements: a notarized application form, the DTI certificate (SEC or CDA for corporations and cooperatives), a risk appraisal of the store or warehouse signed by the regional field unit, and personnel with an active ASD accreditation; filed at the provincial office, about seven working days. The dealership form records the ASD's name and card, the store's floor area and storage capacity, the registered products carried, and whether the dealer extends credit to farmers.",
      'The Accredited Safety Dispenser is the proprietor or an employee who attended the two-day FPA training and advises buyers on safe use, handling and storage; accreditation is valid three years and the sessions run region by region. Store rules that come with the licence: good housekeeping (a licensing requirement since 1999), collection of expired products, weekly price and inventory reports, price tags on fertilizer. The app blocks a fertilizer or pesticide sale until the store records the licence in Settings, and warns before it expires.',
    ],
    sources: ['RT:2.1', 'PC:4.2', 'IS:9.3'],
    tags: ['permits', 'fpaDealer', 'fertilizer', 'pesticide'],
    related: ['banned-and-restricted-pesticides', 'fertilizer-repacking', 'pesticide-storage', 'pesticide-safety', 'renewal-calendar'],
  },
  {
    id: 'banned-and-restricted-pesticides',
    title: 'Banned and restricted pesticides',
    section: 'permits',
    summary:
      'Thirty banned actives on the FPA list; paraquat for institutional use only under a separate certificate; monocrotophos, lindane and the fumigants with conditions.',
    paragraphs: [
      'The FPA banned list carries 30 active ingredients: among them aldrin, dieldrin, endrin, heptachlor, chlordane, toxaphene, DDT (2005), endosulfan (2015), parathion ethyl and methyl, azinphos-ethyl, HCH, mercuric fungicides, organotins, strychnine, thallium sulfate, sodium fluoroacetate, 2,4,5-T and EPN. Restricted, still sold under conditions a store must know: paraquat for institutional use only, under the certificates of FPA MC 2003-03 that authorize licensed dealers to sell it; monocrotophos only for beanfly on legumes; lindane only for pineapple pre-plant soil use; methidathion, ethoprop and phenamiphos only for banana (and pineapple for phenamiphos); aldicarb and chlorobenzilate imported only in emergencies; the fumigants (methyl bromide, phosphine generators, carbon disulfide, ethyl formate and others) with mandatory aeration; deltamethrin banned in banana since 2019 and fipronil banned for banana bud injection since 2018. The app carries a banned or restricted flag per active ingredient, refuses to list a banned one, and requires the restricted-use licence class on a restricted one.',
    ],
    sources: ['RT:2.1', 'PK:2.5', 'PC:5.1'],
    tags: ['permits', 'pesticide', 'fpaRestricted'],
    related: ['pesticides', 'pesticide-safety', 'fpa-dealer-licence', 'counter-pesticides'],
  },
  {
    id: 'fertilizer-repacking',
    title: 'Fertilizer repacking: the dealer-repacker licence',
    section: 'permits',
    summary:
      'Tingi fertilizer needs the separate dealer-repacker licence and FPA MC 2024-11: 1, 2 and 5 kg packs, the FPA label, the whole bag repacked at once; pesticide repacking is outside any dealer licence.',
    paragraphs: [
      "Fertilizer repacking at dealer level is a licensed activity under the dealer-repacker licence (PHP 1,800, three years, with a repacking-site inspection) and FPA MC 2024-11 of 28 June 2024, effective 1 July 2024: solid inorganic fertilizer except nitrates, repacked into 1, 2 and 5 kg with the FPA-recommended label and packaging (polyethylene of at least 0.025 mm, sealed, labelled with the store name, licence number, brand, grade, product registration number, date repacked and net content), the sample approved by the regional or provincial officer before the licence, and the whole 50 kg bag repacked as soon as it is opened. The repack form lists each product's registration number, certificate expiry and repacking sizes.",
      'Pesticides: the FPA guidelines provide that no pesticide may be repacked unless registered or covered by a permit, and the charter treats "repacker" as a separate handler category with a site inspection; a dealer licence is a retailing licence and does not cover repacking. The app therefore allows tingi fertilizer only when the store records the dealer-repacker licence, and blocks pesticide tingi altogether unless a repacker licence is recorded.',
    ],
    sources: ['RT:2.1', 'SK:5', 'PC:4.2'],
    tags: ['permits', 'fertilizer', 'pesticide', 'fpaDealerRepacker'],
    related: ['repacking-rules', 'fertilizer', 'fpa-dealer-licence', 'tingi-pricing'],
  },
  {
    id: 'seed-dealer-registration',
    title: 'Seeds: BPI-NSQCS and RA 7308',
    section: 'permits',
    summary:
      'Seed dealers register under the seed control rules; certified seed carries the NSQCS tag and lot; unlawful lots can be seized; the dealer fee was not reachable (PHP 500 for three years is the nearest analogue).',
    paragraphs: [
      'RA 7308 defines a seed dealer as anyone marketing seeds and seed control as the regulation of seed marketing through registration of dealers, compulsory labelling and minimum quality standards; the National Seed Quality Control Services in the BPI runs inspection, testing, certification and control; unlawful seed lots (displayed for sale while infected, sold with false certification, imported without phytosanitary documents) may be searched, seized and condemned; penalties run to PHP 10,000 or five years. Certified seed carries the NSQCS tag, and a dealer keeps the tag and lot number with each lot for traceability. Labelling on packets follows the Consumer Act (name, net content, lot, germination and purity where certified). The dealer-specific fee and validity were not reachable; the nearest analogue, the DA circular for vegetable seed growers, is PHP 500 for three years with a three-day training, so the app treats the seed dealer accreditation as user-entered with that placeholder.',
    ],
    sources: ['RT:2.2', 'PC:3.1'],
    tags: ['permits', 'seed', 'seedDealer'],
    related: ['seeds', 'seed-storage', 'consumer-act'],
  },
  {
    id: 'bai-feed-licence',
    title: 'Feeds: the BAI licence to operate',
    section: 'permits',
    summary:
      "Every feed retailer, dealer or repacker needs a BAI licence before operating; a store that opens sacks is a repacker and needs the manufacturer's authorization; PHP 60 to 240 in fees.",
    paragraphs: [
      "Under RA 1556 anyone selling or distributing feeds must first register with the BAI, selling without registration is unlawful, labels must carry the prescribed information, and inspectors may enter and sample. A feed establishment (manufacturer, importer, supplier, distributor, retailer) secures a licence to operate before operating and every product sold has a certificate of feed product registration. Fees by category: feed retailer PHP 60, feed distributor 120, feed repacker 120, feed dealer 240, supplier 240, importer 480, manufacturer 180 to 720; the inspection fee is PHP 0.60 per tonne. A retailer, dealer or distributor needs the mayor's permit; a repacker adds the manufacturer's, trader's or importer's authorization and a site inspection. Process: the online orientation seminar, an account on the online system, document upload, payment through Landbank, review at BAI, endorsement to the regional office, inspection of the store or warehouse in about ten days, and the licence printed by the applicant. Registration expires every 31 December and is renewed annually; the validity period is an open question in the research.",
      'A store that opens sacks to sell by the kilo is a repacker under the BAI categories; one that sells sealed sacks is a retailer or dealer. Feeds with antibiotics, anticoccidials, enzymes or hormones are registered as veterinary products, not feeds, and bring in the veterinary-line rules. The app blocks a feed sale until the store records the BAI licence in Settings.',
    ],
    sources: ['RT:2.3', 'PC:1.6', 'SK:11'],
    tags: ['permits', 'feed', 'feedIngredient', 'pet', 'baiFeed'],
    related: ['feeds', 'repacking-rules', 'vet-line-licences', 'renewal-calendar'],
  },
  {
    id: 'vet-line-licences',
    title: 'The veterinary line: FDA licence, prescriptions and vaccines',
    section: 'permits',
    summary:
      'An agrivet selling prescription drugs is a licensed veterinary outlet with a pharmacist or veterinarian; the FDA licence is PHP 2,020 for two years then 3,030 for three; vaccines need batch certification.',
    paragraphs: [
      'RA 9711 makes the FDA responsible for drugs including veterinary medicine, vaccines and biologicals; operating without a licence or selling unregistered products carries one to ten years or PHP 50,000 to 500,000. Outlet types under the joint DOH-DA order: drugstores; veterinary and agricultural supply stores and any outlet selling prescription veterinary drugs; and retail outlets for non-prescription drugs selling OTC products in original packs. The FDA issues the licence to outlets selling its product classes and the BAI regulates veterinary outlets whether or not they carry biologics. Fees: PHP 1,000 a year plus 1 percent, so PHP 2,020 for the initial two-year licence and 3,030 for a three-year renewal, PHP 510 per variation; late renewal costs twice the fee plus 10 percent a month up to 120 days, after which the application is initial again and the licence is cancelled. The outlet needs a PRC-registered Filipino pharmacist or veterinarian, a signboard ("non-Rx" for an OTC-only outlet), and lack of the professional is a ground for suspension.',
      'Prescriptions: RA 9268 reserves prescribing and dispensing to registered veterinarians, whose registration number and professional tax receipt appear on the prescription; the 1990 dispensing rules separate Rx from OTC; the FDA\'s 2014 circular set "no prescription, no dispensing" for drug outlets and its 2013 advisory stopped veterinary antimicrobial advertising. The app flags veterinary antimicrobials as prescription-only and records the prescribing veterinarian. Vaccines and biologics are BAI-registered and may not be sold without batch certification; a vaccine line makes the store a licensed veterinary outlet, not just a feed retailer, and under AIDCA animal health products are moving from the FDA to the BAI.',
    ],
    sources: ['RT:3.1', 'RT:3.2', 'RT:3.3', 'PC:7'],
    tags: ['permits', 'vetDrug', 'vaccine', 'vitamin', 'baiVetOutletRx', 'baiVetOutletOtc', 'baiBiologic'],
    related: ['veterinary-drugs', 'vaccines', 'dosage-and-withdrawal', 'renewal-calendar'],
  },
  {
    id: 'minimum-wage',
    title: 'Minimum wage by region',
    section: 'permits',
    summary:
      'Regional boards set daily rates; a store with one or two helpers is usually a retail establishment of ten or fewer workers at the lower rate, PHP 440 to 590 outside NCR in 2026.',
    paragraphs: [
      'Regional Tripartite Wages and Productivity Boards set daily rates by region, sector and often establishment size, published in the NWPC summary (as of 5 August 2026). A provincial agrivet with one or two helpers is a retail or service establishment employing not more than ten workers in most regions, at the lower rate: NCR PHP 718 (755 non-agriculture), Central Luzon 515 to 590, CALABARZON 508 to 525, Bicol 455, Western Visayas 520, Central Visayas 500 to 540, Eastern Visayas 440, Zamboanga 451 to 464, Northern Mindanao 485, Davao 525, SOCCSKSARGEN 443 to 460, Caraga 475, BARMM 426 to 436; wage orders come in tranches and the summary changes monthly. The app stores the daily rate as a user-entered value per region and computes the monthly cost as rate x working days plus the on-costs: a Region X helper at PHP 485 x 26 days is 12,610, about 15,426 with SSS, PhilHealth, Pag-IBIG and the 13th-month accrual. A registered BMBE is exempt from the minimum wage law.',
    ],
    sources: ['RT:5.1', 'FK:4.1', 'RT:4.3'],
    tags: ['permits', 'compensation-per-employee'],
    related: ['employer-registrations', 'operating-expenses', 'bmbe', 'kpi-compensation-per-employee'],
  },
  {
    id: 'consumer-act',
    title: 'The Consumer Act: price tags, returns and weights and measures',
    section: 'permits',
    summary:
      'Price tags on everything, sold at the tag to all buyers; "no return, no exchange" is unlawful; scales sealed every six months; defective goods repaired, replaced or refunded.',
    paragraphs: [
      'Price tags: it is unlawful to offer a consumer product for retail sale without a price tag, label or marking publicly displayed, or to sell above the tagged price; tags are in pesos and centavos per unit without erasures; first offence PHP 200 to 5,000 or one to six months. For tingi the tag shows the per-kg or per-unit price. "No Return, No Exchange": the DTI treats the phrase as a deceptive sales act; it may not appear on receipts or signage; consumers are entitled to repair, replacement or refund for hidden defects but not for change of mind; expired or misbranded medicines must be replaced; suppliers are jointly liable for products unfit for their purpose. The app\'s returns require a defect reason and keep the original invoice reference. Weights and measures: the metric system is mandatory; every scale is tested, calibrated and sealed every six months by the LGU sealer; short weight and altered scales are penalised.',
    ],
    sources: ['RT:5.2', 'SS:Price display and psychological pricing'],
    tags: ['permits', 'selling'],
    related: ['price-display', 'lgu-fees-and-local-tax', 'repacking-rules'],
  },
  {
    id: 'fire-code-and-hazardous-waste',
    title: 'Fire code, hazardous waste and empty pesticide containers',
    section: 'permits',
    summary:
      'Storage of flammable and toxic materials needs fire safety measures and a storage clearance; empty pesticide containers and expired agrochemicals are hazardous waste turned over for collection, never resold.',
    paragraphs: [
      'The Fire Code requires fire safety measures for the storage of combustible, flammable, toxic and other hazardous materials and lets the fire bureau inspect and order hazards abated; the fire certificate for the permit costs 15 percent of the LGU fees (minimum PHP 500) and a storage clearance is priced by capacity; ammonium-nitrate-based grades and solvent-based pesticide concentrates are the items that draw attention, most bagged retail fertilizers (urea, complete, ammosul) are not classified explosives. The app carries a hazard class per product and totals the stored quantity for the inspection.',
      "Hazardous waste: under RA 6969 and DENR AO 2013-22 empty pesticide containers and expired agrochemicals are hazardous waste with generator registration, storage and labelling, transport records and fees; the FPA's 2020 guidelines add container disposal procedures and FPA MC 2017-11 requires licensed establishments to turn over expired products for collection. Practical rule: never resell or reuse pesticide containers; triple-rinse and puncture is the international norm; keep an expired and returned product log for the FPA inspector. A retail store needs no environmental compliance certificate; the LGU's zoning clearance is the environmental gate.",
    ],
    sources: ['RT:5.3', 'RT:1.3'],
    tags: ['permits', 'pesticide', 'fertilizer'],
    related: ['pesticide-storage', 'lgu-fees-and-local-tax', 'fpa-dealer-licence'],
  },
]
