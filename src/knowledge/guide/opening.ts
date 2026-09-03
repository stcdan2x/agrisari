import type { GuideTopic } from '../guide'

// The trade, the supply chain and the opening plan from
// research/industry-and-supply-chain.md (IS).
export const OPENING_TOPICS: GuideTopic[] = [
  {
    id: 'what-an-agrivet-is',
    title: 'What an agrivet store is and what it sells',
    section: 'opening',
    summary: 'The retail input node of the livestock, poultry and crop value chains; for backyard farmers the primary source of commercial feed.',
    paragraphs: [
      "An agrivet (agricultural and veterinary supply), agri-supply, farm supply or poultry supply store is the retail input node of the livestock, poultry and crop value chains. The PIDS benchmarking names agri-supply stores as an input-provision player next to breeder farms, chick producers, feed millers and veterinary services and states that for backyard farmers they are the primary source of commercial feed, while feed companies reach commercial farms directly. That defines the store's natural customer: the backyard and small semi-commercial raiser, plus the crop farmer buying fertilizer, pesticide and seed.",
      'The FPA registry of licensed fertilizer and pesticide handlers (18,767 rows in December 2022, 13,632 dealer-type licences) shows what the trade calls itself: 1,239 names contain "agrivet", 1,120 "farm supply", 1,803 "agri supply" or "agricultural supply", 706 "poultry supply", 181 "sari", 716 are cooperatives. Product lines as manufacturers describe their portfolios: feeds for swine, poultry, gamefowl, ducks, quail and pets; veterinary medicines and disinfectants; and increasingly fertilizer and crop protection from the same supplier (UNAHCO and San Miguel run feeds, animal health and crop lines under one roof). The FPA defines a dealer as an establishment authorized to retail fertilizer and a dealer-repacker as one authorized to retail solid inorganic fertilizer, except nitrates, in smaller quantities: the legal basis of tingi fertilizer.',
    ],
    sources: ['IS:1'],
    tags: ['opening'],
    related: ['store-formats', 'how-many-and-where', 'supply-chain-tiers', 'integrators'],
  },
  {
    id: 'store-formats',
    title: 'Store formats and sizes',
    section: 'opening',
    summary:
      'From a sari-sari counter with a dealer licence to a dedicated agrivet, a cooperative outlet or a megadealer with a warehouse; the footprint follows feed volume.',
    paragraphs: [
      'Formats in the evidence: a sari-sari counter with a dealer licence (177 dealer names contain "sari": fertilizer by the kilo, a few pesticide sachets, some feed by the kilo); a hardware or general-merchandise store with an agri corner (293 "hardware", 268 "general merchandise"); the dedicated agrivet, farm supply or poultry supply (feeds by the sack and the kilo, vet drugs, vitamins, gamefowl lines, fertilizer, pesticide, seeds); the cooperative agritrading outlet (716 dealer names are cooperatives; SIDC runs 70 retail branches selling its own feeds with patronage refunds); and the distributor with a retail counter, the "megadealer" that also supplies sub-dealers. The physical footprint follows feed volume: a 50 kg sack occupies about 0.08 cubic metres and pallets keep it off the floor, so a counter turning 100 sacks a week needs a bodega of one to two weeks of stock; the reseller minimum San Miguel asks of a community partner is about 8 by 8 feet, and a feed store needs several times that.',
    ],
    sources: ['IS:1.1', 'IS:9.1'],
    tags: ['opening', 'sales-per-sqm'],
    related: ['what-an-agrivet-is', 'feed-storage', 'location-factors', 'cooperatives'],
  },
  {
    id: 'how-many-and-where',
    title: 'How many stores exist and where',
    section: 'opening',
    summary:
      'A median municipality has six licensed crop-input dealers; dealers cluster where production is; a low dealer-barangay ratio province is a gap, a high one is price competition.',
    paragraphs: [
      "The FPA registry counts 13,632 dealer-type licences; by region Cagayan Valley, Ilocos, Central Luzon, CALABARZON, Davao, SOCCSKSARGEN and Western Visayas lead; the top provinces by handler rows are NCR, Davao del Sur, Pangasinan, Isabela, Davao del Norte, Cagayan, Bukidnon, South Cotabato, Iloilo and Nueva Ecija. Density: 85 provinces have at least one dealer (median 147); 1,439 municipalities have at least one (median 6, mean 9.5, upper quartile 13), so a new store in a median municipality opens against about six licensed crop-input competitors, plus feed-only outlets that could not be counted. The PCC's dealer-barangays-per-hundred-rural-barangays ratio sorts provinces into high (33 or more: Occidental Mindoro, Rizal, Bulacan, Sultan Kudarat, Nueva Ecija, South Cotabato, Davao del Norte), medium (Bukidnon, Ilocos Norte, Laguna) and low (below 20: Lanao del Norte, Bohol, La Union, Albay, Ilocos Sur); a low-ratio province is where a new outlet fills a gap and a high-ratio one where competition is on price. Upstream there were 712 fertilizer licence holders above dealer level and 604 registered feed mills.",
    ],
    sources: ['IS:2'],
    tags: ['opening'],
    related: ['location-factors', 'what-an-agrivet-is', 'regional-differences'],
  },
  {
    id: 'supply-chain-tiers',
    title: 'Manufacturers, distributors and dealer tiers',
    section: 'opening',
    summary:
      'Feeds: mill, distributor, megadealer, retail outlet. Agrochemicals: importer or manufacturer, distributor or area distributor, dealer. Seeds: company dealers and sub-dealers.',
    paragraphs: [
      "Feeds: the Philippine Association of Feed Millers lists 43 members in 2026 (San Miguel Foods B-MEG with 39 mills, Pilmico, UNAHCO, Vitarich, Cargill, CJ, Sunjin, the regional mills); feeds are 60 to 70 percent of a raiser's direct cost. Tiers as the manufacturers name them: manufacturer, distributor (an area wholesaler with warehouse and trucks), megadealer (supplies sub-dealers) and retail feed outlets; manufacturers also sell direct to integrators and commercial farms. A distributorship, per a secondary write-up, asks for a warehouse, a delivery vehicle, DTI, mayor's permit and BIR, PHP 300,000 to a million of capital and two to four weeks through the regional office. Cooperative mills (SIDC at 9,000 sacks a day) distribute through their own outlets.",
      'Agrochemicals: the FPA licence categories are the tiers: manufacturer, importer, processor, blender, formulator, repacker, distributor (sells to dealers only), area distributor, indentor, dealer (retail) and dealer-repacker; dealer licences run three years, all others yearly. The chain for imported fertilizer is importer, national or area distributor, dealer, farmer. Planters Products runs a network of over 1,000 distributors, dealers and outlets; Atlas and Yara supply the branded grades the FPA prices by brand and region. Seeds: Allied Botanical and East-West Seed publish dealer and sub-dealer lists by region, and ordinary agrivets are on them; rice and corn seed dealer terms are an open question.',
      "How stock moves: the FPA price matrix adds PHP 90 a bag of discharging costs to the import price, then per tier 8 percent profit, PHP 20 trucking, PHP 6 labour, PHP 10 warehousing and 2.5 percent local tax: at USD 600 a tonne the dealer buys at PHP 2,017 and sells at 2,255, a policy ceiling the field data sit far below. Feeds move by manufacturer truck to the distributor's bodega and by the distributor's vehicle to dealers; the PHP 20 trucking plus PHP 6 labour per bag is the only sourced per-sack logistics figure and a fair default for the store's own delivery cost.",
    ],
    sources: ['IS:3.1', 'IS:3.2', 'IS:3.3', 'IS:4'],
    tags: ['opening', 'feed', 'fertilizer', 'seed'],
    related: ['supplier-selection', 'margins-by-tier', 'supplier-onboarding', 'strategy-buy-6-direct-and-pooled'],
  },
  {
    id: 'trade-terms',
    title: 'Typical trade terms: what the sources actually document',
    section: 'opening',
    summary:
      "A cooperative's 30-day credit line for feed, an after-harvest credit premium on urea, fixed-margin dealer pricing, a listed miller's 90-day related-party terms; everything else is entered as observed.",
    paragraphs: [
      'Documented Philippine terms are scarce: Limcoma cooperative gives its hog-raiser members a 30-day credit line for feeds; a cooperative dealer selling urea on after-harvest credit earned PHP 80 a bag against PHP 10 to 50 for cash dealers, the difference being the price of credit; dealers price on a fixed margin per bag maintained over a crop year, cut when cheaper stock arrives; Vitarich buys from related parties on 90-day unsecured terms; distributor accreditation asks for warehouse, vehicle and registrations (secondary); the community reseller is enrolled by the distributor, which sets ordering, delivery, payment and returns policy; manufacturers pass most but not all cost increases with a lag (Vitarich raised prices 18 percent against 23 percent cost inflation and lost 6 percent volume). General practice for the option lists only: cash on delivery, 7, 15 or 30 days secured by post-dated cheques, a credit line sized to one or two drops, quarterly rebates, launch freebies, price protection when list prices fall. The app assumes none of these; the supplier record holds what the store observes.',
    ],
    sources: ['IS:5', 'BS:3'],
    tags: ['opening', 'buying'],
    related: ['negotiating-terms', 'supplier-selection', 'payables-and-supplier-credit'],
  },
  {
    id: 'integrators',
    title: 'The integrator threat and what it leaves for the store',
    section: 'opening',
    summary:
      'Contract growers buy nothing from the store; what is left is the backyard and independent segment, gamefowl, ducks, quail, pets and every crop farmer.',
    paragraphs: [
      "Commercial farms are integrators (own breeders, feed mills, contract growing) or non-integrators; backyard farms buy their own feed, keep no records and hold no permits. By inventory in 2025 commercial poultry farms held 54 percent of chickens and smallhold farms 43 percent; smallhold farms held 72 percent of swine. An integrator supplies its contract grower with chicks, feeds, vaccines, medicines, technical support and hauling, and keeps ownership of the birds; San Miguel and Bounty make about three quarters of the broiler association's output. Cooperatives integrate the same way (SIDC's paiwi scheme supplies piglets, feed and vet supplies to members and shares the profit).",
      "What is left: the backyard and smallhold segment that buys commercial feed from agri-supply stores and mixes it with corn, azolla and kitchen scraps; independent commercial growers who avoid contracts; gamefowl, ducks, quail, pigeons and pets; and every crop farmer. The stakes for that customer: feed is 52 to 80 percent of production cost, corn about 70 percent of feed by cost; the integrator's internal valuation of broiler feed (PHP 26.88 a kilo in 2021) is a floor against which retail broiler feed prices compare.",
    ],
    sources: ['IS:6', 'PM:1'],
    tags: ['opening', 'feed', 'broiler', 'hog'],
    related: ['demand-drivers', 'location-factors', 'cooperatives'],
  },
  {
    id: 'cooperatives',
    title: 'Cooperatives as competitors, models and channels',
    section: 'opening',
    summary:
      'Cooperatives are licensed dealers with patronage refunds, feed mills with retail chains and lenders with 30-day credit; they are also a sub-dealer channel.',
    paragraphs: [
      "Cooperatives compete on three levels: as licensed dealers (716 of the FPA dealer rows) returning part of the margin as patronage refund; as feed mills with their own chains (SIDC: founded 1969 by 59 farmers with PHP 11,800, a feed mill since 1987 at 9,000 sacks a day, over 61,000 members, PHP 5.33 billion of assets and 70 retail branches by 2022, the mill about a third of its surplus); and as input suppliers with credit (Limcoma's 30-day feed line plus feed and diagnostic laboratories and artificial insemination). They are also a channel: a new store can be a cooperative's sub-dealer or supply members where the cooperative has no outlet, and can join its pooled order to reach a truckload.",
    ],
    sources: ['IS:7', 'IS:1'],
    tags: ['opening', 'buying', 'selling'],
    related: ['integrators', 'assortment', 'program-tie-ups', 'strategy-buy-6-direct-and-pooled'],
  },
  {
    id: 'margins-by-tier',
    title: 'Competition and margins by tier',
    section: 'opening',
    summary:
      'On urea the distributor keeps about PHP 40 a bag and the dealer PHP 30 to 35, net PHP 14; the FPA matrix implies 12 percent per tier as a ceiling; feeds have no published margin study.',
    paragraphs: [
      'Fertilizer (urea, 50 kg, PCC field interviews 2021): distributors buy at PHP 890 to 950 and sell at 940 to 995, gross margin PHP 30 to 50 (average 40; labour 12 percent, transport 60, return to capital 28, only 1.2 percent of purchase price); dealers buy at 960 to 1,040 and sell at 980 to 1,120, gross margin PHP 10 to 80 (average 35 with the credit-selling cooperative, 30 without), net PHP 14, 1.3 percent, "an excellent return on working capital" only with rapid turnover. The regional urea price index runs from 0.97 (Ilocos, Cagayan Valley, Western Visayas, Davao, SOCCSKSARGEN) to markedly higher in CALABARZON, Eastern Visayas and BARMM: a store\'s fertilizer cost depends on its region more than its negotiating skill. The FPA matrix implies near 12 percent per tier as a policy ceiling; the app carries the matrix as the upper bound and the field margin as the default for commodity grades.',
      "Feeds: no tier margin study exists. Bounding evidence: feed is 60 to 70 percent of raisers' cost, integrators value their own broiler feed at about PHP 26.88 a kilo, manufacturers pass on most cost increases with a lag, and a provincial market with a handful of mills is oligopolistic with prices peaking in February to March when local corn is scarce. The store's feed margin is its own observation: record the dealer price list and the counter price on the first purchase. The competition summary for a provincial store: six licensed crop-input dealers in the median municipality, the national brands' distributors and megadealers, cooperative outlets with patronage refunds, integrators supplying contract growers, and online sellers the FPA regulates.",
    ],
    sources: ['IS:8', 'IS:4', 'SS:Pricing and markup practice by line'],
    tags: ['opening', 'fertilizer', 'feed', 'gross-margin-pct', 'targetMarginPct'],
    related: ['markup-practice', 'gross-margin', 'supply-chain-tiers', 'reseller-tiers'],
  },
  {
    id: 'location-factors',
    title: 'Location factors',
    section: 'opening',
    summary: 'Livestock and crop density, gap versus glut, distance from port and distributor, the integrator footprint, cooperative presence and space.',
    paragraphs: [
      "Six factors in the evidence: livestock and crop density (dealers cluster where production is; Batangas alone produced 42 percent of CALABARZON's hogs); gap versus glut (a low dealer-barangay ratio province signals under-served farmers, a high one price competition); distance from port and distributor (fertilizer prices rise with distance from ports and large distributors; CALABARZON, Eastern Visayas and BARMM carry the highest urea index); the integrator footprint (contract growers within 80 km of an integrator plant buy nothing from the store; the market is the backyard and independent raiser); cooperative presence (a cooperative outlet with patronage refund next door is a price competitor); and space (a feed store needs a bodega several times the reseller's 8 by 8 feet).",
    ],
    sources: ['IS:9.1', 'IS:2'],
    tags: ['opening'],
    related: ['how-many-and-where', 'integrators', 'cooperatives', 'regional-differences', 'opening-checklist'],
  },
  {
    id: 'startup-capital-evidence',
    title: 'Startup capital: the evidence that exists',
    section: 'opening',
    summary:
      'Two student plans at PHP 430,000 and 630,000, a distributor estimate of 300,000 to a million, and working capital of PHP 960 to 2,017 per fertilizer bag.',
    paragraphs: [
      'Cases: a seven-owner agrivet business plan in Davao City at PHP 630,000; an agrivet feasibility study in Lake Sebu at PHP 430,000 (projected payback 14 months); a B-MEG distributor (not a store) at PHP 300,000 to a million (secondary); fertilizer working capital PHP 2,017 a bag at the matrix price and PHP 960 to 1,040 in the field. Sizing rule for the projection (assumption stated): opening stock = planned weekly sack volume x weeks of cover x dealer cost per sack; 100 sacks a week, two weeks of cover and PHP 1,500 a sack is PHP 300,000 of feed before fertilizer, pesticide, seed, fixtures, licences and the receivables float that credit sales create (a store selling on credit funds 30 days to a full season). The student totals sit in the range this rule produces.',
    ],
    sources: ['IS:9.2', 'FK:10'],
    tags: ['opening'],
    related: ['startup-capital', 'projection-method', 'opening-checklist'],
  },
  {
    id: 'licences-and-lead-times',
    title: 'Licences, validity and lead times for the opening plan',
    section: 'opening',
    summary: "FPA dealer licence three years with 9 to 11 documents; BAI feed registration; DTI, mayor's permit and BIR are what every supplier asks for.",
    paragraphs: [
      "For the checklist: the FPA dealer or dealer-repacker licence is valid three years, typically 9 to 11 documentary requirements, the FPA's longest maximum processing 28 days (product registration) and shortest 4 days (certificates); the fertilizer VAT-exempt certificate comes from the FPA. BAI feed establishment registration is required of all establishments in the feed business. DTI or SEC registration, the mayor's permit and BIR registration are the three documents distributor accreditation and contract growing both ask for. Lead times from supplier application to first delivery are not published; the only sourced duration is a secondary two to four weeks for a distributorship. The procedures and fees are in the Permits section.",
    ],
    sources: ['IS:9.3', 'RT:2.1', 'RT:2.3'],
    tags: ['opening', 'fpaDealer', 'baiFeed'],
    related: ['registration-sequence', 'fpa-dealer-licence', 'bai-feed-licence', 'opening-checklist'],
  },
  {
    id: 'supplier-onboarding',
    title: 'Supplier onboarding',
    section: 'opening',
    summary:
      'Ask each mill which distributor covers the municipality; hold the FPA licence before a distributor may sell fertilizer; list with the seed companies; the vet line comes through the feed distributors.',
    paragraphs: [
      "Feeds: apply through the regional sales office or the local feed sales representative, who assigns territory and screens the applicant; at dealer level the area distributor enrols the store and sets ordering, delivery, payment and returns terms; manufacturers actively recruit outlets province by province, so ask the mill which distributor covers the municipality. Fertilizer and pesticide: the store must hold its FPA dealer licence before a distributor may sell to it, because a distributor sells to dealers and outlets only. Seeds: apply to be listed as a dealer or sub-dealer with Allied Botanical, East-West Seed and the rice or corn seed company. Vet line later: San Miguel Animal Health Care and Univet come through the same feed distributors. Record each supplier's price list, drop size, delivery day and payment terms as observed on the first order.",
    ],
    sources: ['IS:9.4', 'IS:3.1'],
    tags: ['opening', 'buying'],
    related: ['supplier-selection', 'supply-chain-tiers', 'opening-checklist'],
  },
  {
    id: 'opening-checklist',
    title: 'The opening checklist, in order',
    section: 'opening',
    summary:
      'Choose the municipality, register, license, enrol with distributors, fund stock and the float, fix the counter margin, open and record from day one.',
    paragraphs: [
      "1. Choose the municipality using the dealer density and the dealer-barangay ratio, the integrator footprint and the cooperative presence. 2. Register the business name (DTI), obtain the barangay clearance, the mayor's permit and BIR registration. 3. Apply for the FPA dealer or dealer-repacker licence (three years) and the fertilizer VAT-exempt certificate; register the feed outlet with the BAI. 4. Identify the area distributor for each feed brand and the fertilizer or pesticide distributor for the province; get enrolled; record their price list, drop size, delivery day and payment terms as observed. 5. Fund the opening stock at distributor cost per sack (fertilizer about PHP 2,000 a bag at 2026 prices, feeds per the distributor's list) plus a receivables float sized to the credit policy. 6. Fix a counter margin per sack as a fixed peso amount, the trade's rule of thumb, and a separate credit premium. 7. Open, and record every purchase and sale in the app from day one so the observed margins replace the defaults.",
    ],
    sources: ['IS:9.5', 'RT:1'],
    tags: ['opening'],
    related: ['location-factors', 'registration-sequence', 'licences-and-lead-times', 'supplier-onboarding', 'startup-capital', 'markup-practice'],
  },
]
