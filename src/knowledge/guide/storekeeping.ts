import type { GuideTopic } from '../guide'

// Storekeeping routines and rules from research/storekeeping-and-inventory-practice.md (SK),
// with the catalog's storage attributes (PC) where they add a figure.
export const STOREKEEPING_TOPICS: GuideTopic[] = [
  {
    id: 'fefo-and-expiry',
    title: 'FEFO and expiry control: what carries a date and where it is printed',
    section: 'storekeeping',
    summary:
      'Every launch line except tools carries a date the app reads at receiving; the earliest expiry sells first, and the warning fires early enough to sell or return the lot.',
    paragraphs: [
      'Feeds must carry the date of manufacture, the expiry date, the lot number and the storage condition on the tag (DA AO 12-07); some millers print a code, and the retailer needs the supplier\'s key. Pesticide containers carry the lot number and the year of formulation; when no shelf life is given, assume two years from manufacture. Inorganic fertilizer carries no expiry; the FPA repack rule requires "date repacked" on dealer-repacked packs. Certified seed bags carry the date of harvest and the germination test behind the tag (85 percent minimum, 14 percent moisture maximum); the sample window for certification is three months after harvest. Veterinary labels carry lot and expiry, and vaccines add the cold-chain record.',
      "How the app does it: on receipt every delivery becomes a lot with its number and expiry (or the manufacture date plus the category's lot life: 40 days for feed, 30 for feed ingredients); a sale draws from the lot with the earliest expiry; the store puts the shortest-dated stock at the front. Expiry warnings, from the store parameters: 30 days for feeds (the practical maximum inside a one to two month tropical life), 90 days for pesticides and disinfectants (leaving a return window in a two-year life), 90 days for seed counted from harvest or test date, 90 days for vaccines and vet drugs with short-dated stock first, none for fertilizer, tools and equipment. Order no more than one year's requirement of a pesticide and never keep an opened powder more than a year.",
    ],
    sources: ['SK:1', 'SK:13', 'SK-114', 'SK-115', 'SK-116'],
    tags: ['expiryWarningDays', 'feed', 'pesticide', 'seed', 'vaccine'],
    related: ['feed-storage', 'seed-storage', 'pesticide-storage', 'lot-tracking', 'dead-stock', 'store-parameters'],
  },
  {
    id: 'feed-storage',
    title: 'Feed storage in Philippine heat and humidity',
    section: 'storekeeping',
    summary: 'Pallets, small stacks off the walls, oldest first, screens against rats; compounded feed keeps one to two months, 60 days in the rainy season.',
    paragraphs: [
      "Feed moisture drifts toward the store air: the safe level develops at 75 percent relative humidity, and the Philippine wet season runs at 80 to 90 percent, so moisture in feed rises. Fungi grow above 65 percent humidity and 15 percent moisture (some aflatoxin producers at 9 to 10 percent), most of all above 25 C and 85 percent humidity; insects multiply between 26 and 37 C. That is why compounded feed (pellets, crumbles, mash) keeps one to two months in the tropics, ground ingredients such as rice bran one to two months, whole grain three to four, vitamin mixes six in air-tight, light-proof containers. Ranking: whole grain outlasts pellets, pellets outlast crumble and mash; vitamins in a mixed feed fade about 10 percent a month. A pellet mill's seasonal rule for feed under 14 percent moisture: 60 days in the rainy season, 90 in the dry.",
      'Physical rules: raise the sacks on wooden pallets, make small stacks (large ones heat inside), keep sacks off the outer walls, use the oldest first, mesh every entry point against birds and rats, keep vitamins sealed. PhilRice practice for palay transfers directly: pallets, the Japanese piling pattern with the centre left open for air, old and new stock apart, monthly sampling, FIFO. Stack no more than four to five layers per pallet and three pallets high. A rat eats 7 percent of its body weight a day (a 250 g rat about 6.5 kg of grain a year) and spoils far more with urine and droppings; repair damaged bags and pallets, never carry bags with hooks.',
      'Aflatoxin: corn and rice bran are the two largest energy ingredients in Philippine feed and Philippine samples have run far above the 20 ppb human-food limit, so a sack that has warmed and dampened is a toxin risk, not only a palatability one. The defence is the routine: dry floor, pallets, small stacks, FIFO, a monthly inspection of sacks for caking, off-smell, warmth and insects, and refusal of damp, mouldy or infested deliveries at the door. Chemical fertilizers and pesticides are stored apart from feed.',
    ],
    sources: ['SK:2.1', 'SK:2.2', 'SK:2.3', 'SK:2.4', 'PC:10'],
    tags: ['feed', 'feedIngredient', 'pet'],
    related: ['feeds', 'feed-ingredients', 'fefo-and-expiry', 'routines-and-checklists', 'receiving-and-returns'],
  },
  {
    id: 'seed-storage',
    title: 'Seed storage and viability',
    section: 'storekeeping',
    summary: 'Each 1 percent less moisture and each 5 C cooler doubles seed life; foil-packed vegetable seed survives a shelf, open bags of palay seed do not.',
    paragraphs: [
      'PhilRice: store only good seed, properly dried and cleaned; palay at 14 percent moisture; between 5 and 14 percent each 1 percent reduction in moisture roughly doubles storage life, and each 5 C decrease between 0 and 50 C doubles it again; ventilate the room, sample moisture monthly, keep old and new lots apart, pallets and the Japanese piling pattern, first in first out. Orthodox seed at 4 to 8 percent moisture in sealed storage at 0 to 5 C keeps five years or more; vegetable seed is stored at 5 to 7 percent.',
      'What that means for a store without a seed cabinet: a rice lot at 14 percent moisture in a 30 C store has a base life; an air-conditioned room at 25 C doubles it, a refrigerated cabinet at 15 C gives eight times; vegetable seed in foil sachets at 6 to 7 percent has about 128 times the life of the same seed at 14 percent, which is why the sachet survives a shop shelf and the open palay bag does not. The app prompts a monthly moisture or germination spot check of open lots and flags certified rice seed by its harvest date, with the 90-day seed warning counted from harvest or test date.',
    ],
    sources: ['SK:3', 'SK:13', 'PC:3.1'],
    tags: ['seed'],
    related: ['seeds', 'fefo-and-expiry', 'routines-and-checklists'],
  },
  {
    id: 'pesticide-storage',
    title: 'Agrochemical storage, segregation and display',
    section: 'storekeeping',
    summary:
      'Locked, ventilated, off the floor, away from feed and food; powders above liquids, herbicides lowest; a sand bucket, first-aid box and stock record; inspected daily, monthly and every two months.',
    paragraphs: [
      'The FPA rules require a licence per place of business, described handling and storage facilities, and prohibit detaching or altering any label; the pre-licensing risk appraisal is done by the regional field unit. Layout (FAO manual): uncluttered floor with one-metre gangways, shelves no higher than 2 m, containers on pallets never on the floor and no higher than 107 cm per pallet; sacks four to five layers and three pallets high, cases of bottles or sachets four to six layers and two pallets; powders and granules kept in cartons against caking, glass in cartons; a lockable door, barred windows and vents, a container of absorbent sand or sawdust, a first-aid box and eyewash; records kept apart from the store and issued first in first out; no food or feed in the same vehicle.',
      'Retail display: pesticides separated from all other products by spacing or partitioning, never above feed or food; liquids below powders; herbicides on the lowest shelf and never above other pesticides; grouped by type; away from flammables and direct sunlight; glass on the lowest level; punctured, rusted, leaking or unreadable containers removed from the sales area at once; the counter between the customer and the display, a washbasin, ventilation, a rear stock room kept locked. Minimum PPE when handling stock with no label information: overalls, boots and gloves.',
      'Inspection: a quick daily look for overnight leaks (absorb at once with sawdust, sand or dry soil), a thorough monthly inspection for leaking seals, split seams and corrosion, and a formal store inspection at least every two months. The app flags pesticides with a separate storage location, no repack, an FPA registration number, a toxicity band and a "damaged container: do not sell" write-off reason.',
    ],
    sources: ['SK:4.1', 'SK:4.2', 'PC:5.3', 'RT:2.1'],
    tags: ['pesticide', 'disinfectant', 'fpaDealer'],
    related: ['pesticides', 'pesticide-safety', 'fpa-dealer-licence', 'routines-and-checklists', 'fire-code-and-hazardous-waste'],
  },
  {
    id: 'repacking-rules',
    title: 'Repacking and tingi: what may be opened and how',
    section: 'storekeeping',
    summary:
      'Feed by the kilo at the counter from one sack at a time; fertilizer only as a licensed dealer-repacker in sealed, labelled 1 to 5 kg packs; pesticides and vet drugs never.',
    paragraphs: [
      "Feeds: yes, by the kilo in practice; formally a feed repacker is a registered establishment with the manufacturer's authorization and the labels of the products repacked, while a retailer sells in retail quantities. Fertilizer: dealer-repackers only, packs of 5 kg and below from 50 kg bags, the whole bag repacked at once (never kept open and scooped as needed), polyethylene bags of at least 0.025 mm, sealed and labelled with the store name, the licence number, brand, grade, FPA registration number, date repacked and net content, with the label and packaging sample approved before the licence (effective 1 July 2024). Pesticides: no; repacking is a licensed handler activity and removing or altering a label is unlawful; sell only in the registrant's container with the label attached. Seeds: a split certified bag loses its tag; sell sealed packs, or repack only non-certified seed with the variety, lot and harvest date carried onto the new label. Veterinary drugs: OTC products only in original packs.",
      "Counter mechanics for feed tingi: a scale tested regularly for accuracy; a scoop and a marked tingi bin per product, emptied and refilled from one sack at a time so the lot identity survives, never topped up; the opened sack's date written on the bin; repack bags labelled with product, date opened and weight. The app books a repack move from the sack lot to a per-kg lot of the same product, keeps the sack's lot number and expiry, and records the measured shortfall (spillage, dust, scale rounding) as a loss move; no source gives that shortfall as a percentage, so the app reports it per product from the observed difference between sack weight and kilos sold.",
    ],
    sources: ['SK:5', 'SK:4.3', 'PC:4.2', 'RT:2.1'],
    tags: ['feed', 'fertilizer', 'pesticide', 'fpaDealerRepacker'],
    related: ['tingi-pricing', 'fertilizer-repacking', 'lot-tracking', 'counts-and-shrinkage'],
  },
  {
    id: 'lot-tracking',
    title: 'Lot and batch tracking',
    section: 'storekeeping',
    summary: "Lots exist for recalls, FEFO, weighted average cost and complaints; keep the sack tag or a photo of it for the lot's life.",
    paragraphs: [
      "Four reasons the app tracks lots: the law prints lot numbers on feeds and pesticides so a recall can find them, and traceability requires that a batch be identified even when split to several destinations; FEFO needs the expiry per lot; weighted average cost needs the cost per receipt; and a mould or aflatoxin complaint from a farmer needs the sack lot to go back to the miller. Manufacturers retain samples for six months; the store's equivalent is keeping the sack tag or a photo of it for the lot's life. Vaccine lots carry lot number, expiry and the cold-chain record per lot. Every receipt in the app is a lot with its number, expiry, quantity and unit cost, and every sale, repack, count adjustment and write-off names the lot it moved.",
    ],
    sources: ['SK:6', 'SK:1', 'FK:1'],
    tags: ['feed', 'pesticide', 'vaccine'],
    related: ['fefo-and-expiry', 'weighted-average-cost', 'receiving-and-returns', 'repacking-rules'],
  },
  {
    id: 'receiving-and-returns',
    title: 'Receiving, damaged goods, returns and credit memos',
    section: 'storekeeping',
    summary:
      'Check the delivery line by line against the order and the invoice, count, read dates and lots, weigh a sample, refuse damp or damaged stock, settle shorts by credit memo.',
    paragraphs: [
      "The receiving routine: check the delivery against the purchase order and the supplier's invoice line by line; count sacks and cases; read manufacture or expiry dates and lot numbers into the receipt; weigh a sample of sacks (feed is sold at a declared net weight and the scale must be tested regularly); refuse deliveries that are visibly damp, mouldy or infested, and pesticide containers that are punctured, rusted, leaking or unreadable; record the date of receipt and the batches. Returns and short deliveries are settled by a supplier credit memo against the invoice. In the app, receiving a purchase posts the lots at their landed unit cost (price less discount plus freight and handling), which recomputes the weighted average cost; a rejected line is received short and the payable stays at the invoiced amount until the credit memo is recorded. The supplier record holds the return policy (window before expiry, restocking fee, who pays freight) as user-entered terms.",
    ],
    sources: ['SK:7', 'SK:2.4', 'BS:7', 'FK:1'],
    tags: ['feed', 'pesticide'],
    related: ['lot-tracking', 'weighted-average-cost', 'consignment-and-returns', 'feed-storage'],
  },
  {
    id: 'reorder-point',
    title: 'Reorder point, safety stock, lead time, EOQ and ABC',
    section: 'storekeeping',
    summary:
      'Reorder when stock on hand plus on order falls to lead-time demand plus safety stock; cap the order at what sells within shelf life; count A items most often.',
    paragraphs: [
      "Formulas (APICS): safety stock for demand variability is Z x the standard deviation of daily demand x the square root of the lead time in days, with Z 1.28 for a 90 percent cycle service level, 1.65 for 95 (the app's default) and 2.33 for 99; the reorder point is expected demand during the lead time plus safety stock. The economic order quantity is the square root of 2 x annual demand x cost per order divided by the annual holding cost per unit, valid only for steady demand.",
      "Worked example (inputs illustrative): hog grower at 4 sacks a day with a standard deviation of 1.5, a 3-day lead time, 95 percent service, PHP 1,600 a sack, 20 percent carrying, PHP 500 per order. Demand during lead time 12 sacks; safety stock 1.65 x 1.5 x 1.73 = 4.3, rounded to 5 (1.25 days of sales); reorder point 17 sacks; EOQ about 68 sacks, 17 days of sales, inside the one to two month tropical life. If the miller's minimum drop is larger, the shelf-life bound wins: never order more than (shelf life remaining minus lead time) x daily sales, and never more than a year of a pesticide.",
      "The app expresses safety stock as Z x the coefficient of variation x the square root of lead time, in days of demand, reads the lead time per supplier (the learned lead time from past receipts once there is history, the supplier's stated days before that) and raises a low-stock alert when on hand plus on order falls to the reorder point. ABC: about 80 percent of value comes from 20 percent of items; A items (the fast feed lines and the high-value pesticides) are counted weekly or monthly, B (fertilizers, seeds) quarterly, C (tools, sundries) annually, with a full count once a year and an accuracy target of 97 percent.",
    ],
    sources: ['SK:8.1', 'SK:8.2', 'SK:8.3', 'SK:13', 'SK-86'],
    tags: ['serviceLevelZ', 'inventory-days', 'feed'],
    related: ['dead-stock', 'counts-and-shrinkage', 'buying-rules', 'store-parameters', 'supplier-selection'],
  },
  {
    id: 'dead-stock',
    title: 'Dead stock: what it is and what to do with it',
    section: 'storekeeping',
    summary:
      'Stock that has not sold within the expected period; perishables are dead when unsold within shelf life; return, transfer, mark down or write off, in that order.',
    paragraphs: [
      'Dead stock is inventory that has not sold within an expected period, as distinct from excess stock that is still sellable but over-ordered; it is found with a report of everything that has not sold in a set number of days. No Philippine source gives the number of days, so the app starts at 90 in the store parameters and lets the owner set it. For perishables the threshold is shelf life: a feed lot that has not moved within its 60-day rainy or 90-day dry-season life is dead by definition, and a pesticide with less than a year left of its two-year life that moves slower than one pack a quarter is a candidate for return or bundling.',
      'Actions, in the order the app proposes them: return to the supplier within the negotiated window, transfer to a sister store or pooling partner, a markdown that still beats the write-off, bundle with a fast mover, write off. The dashboard shows the value of dead stock at cost and the Inventory page lists the lots.',
    ],
    sources: ['SK:8.4', 'SK:13', 'SK-101', 'BS:7'],
    tags: ['deadStockDays', 'dead-stock-share'],
    related: ['reorder-point', 'consignment-and-returns', 'inventory-alerts', 'store-parameters'],
  },
  {
    id: 'counts-and-shrinkage',
    title: 'Counts, stock cards, shrinkage and loss prevention',
    section: 'storekeeping',
    summary: 'The stock moves table is the electronic stock card; count A items monthly; shrinkage benchmark 1.6 percent of sales, reported by cause.',
    paragraphs: [
      'A stock card per product records what was received, held and issued, with date, source, quantity, lot, shelf life, inspection notes and disposal, kept apart from the pesticide store; the FPA inspector may ask for the paper card, and a current inventory and floor plan serve the spill and fire response. In the app the stock moves table is the card and the monthly cycle count posts the difference as a shrinkage move, so the periodic identity holds: opening plus purchases less cost of sales less shrinkage equals the counted closing stock.',
      'Benchmark: US retail shrink averaged 1.6 percent of sales in 2022 (median 1.4), attributed to external theft 36 percent, internal theft 29 percent, process and control failures 27 percent; no Philippine benchmark exists. For an agrivet the process share is larger: tingi spillage, sack weight variance, mould write-offs and credit leakage (goods released on listahan and never booked). The app reports shrink by cause: count variance, repack loss, expired or spoiled, returned, unbooked credit.',
      "Loss prevention: a locked pesticide store; sealed tingi bins with dated lots; the daily opening and closing cash count against the sales book; every credit release written on the customer's listahan and in the app before the goods leave; receiving against the invoice with sample weighing; monthly cycle counts of A items.",
    ],
    sources: ['SK:9', 'SK:8.3', 'FK:2', 'FK:16'],
    tags: ['shrinkage-pct', 'feed'],
    related: ['reorder-point', 'repacking-rules', 'routines-and-checklists', 'periodic-vs-perpetual'],
  },
  {
    id: 'delivery-routine',
    title: 'Delivery routines',
    section: 'storekeeping',
    summary:
      "A delivery log line per run with items and lots, payment mode and proof of delivery; pesticides never loose with feed; COD cash into the day's count.",
    paragraphs: [
      "Each delivery run gets a log line: date, customer, items and lots (so FEFO and traceability survive the trip), amount, payment mode (cash on delivery, GCash, bank, or credit on the listahan), and the receiver's signature or a photo as proof of delivery. Pesticides are never carried with feed or food in the same load without separation, liquids sit below powders and are secured against rolling, and contaminated washings are absorbed with sawdust. COD cash is counted into the day's cash count on return; a credit delivery is booked as a receivable the same day. In the app a sale marked for delivery appears on the Deliveries page until it is confirmed delivered, and the delivery fee is part of the sale's revenue.",
    ],
    sources: ['SK:10', 'SK:4.2', 'SS:Delivery service economics'],
    tags: ['deliveryTripCost'],
    related: ['delivery-economics', 'routines-and-checklists', 'strategy-sell-11-delivery-service'],
  },
  {
    id: 'routines-and-checklists',
    title: 'Daily, weekly and monthly routines',
    section: 'storekeeping',
    summary:
      'Daily cash count and leak check; weekly stack rotation, reorder review, receivables review and an A-item count; monthly inspections, seed check, expiry sweep, B-item count and the permits calendar.',
    paragraphs: [
      'Daily: opening and closing cash count against the sales book and COD returns; a quick inspection of pesticide containers for overnight leaks, absorbed at once; the vaccine refrigerator (later line) checked and recorded twice; a look that no pesticide sits next to food or feed.',
      'Weekly: feed stack rotation, oldest sacks first, shortest-dated at the front, no sack on the floor or against a wall; the reorder review comparing on hand plus on order with the reorder point of every A item; the receivables review with the credit ledger; a cycle count of a slice of A items.',
      'Monthly: a thorough inspection of pesticide containers for leaking seals, split seams and corrosion, and of feed sacks for caking, warmth, smell and insects; a seed moisture or germination spot check of open lots; the expiry sweep listing every lot inside its warning window, then sell down, return or write off; a cycle count of B items (C items quarterly or annually, a full count once a year); the permits calendar: feed establishment registration renewed annually, FPA licences every three years, a formal pesticide store inspection at least every two months.',
    ],
    sources: ['SK:11', 'SK:13'],
    tags: ['feed', 'pesticide', 'seed', 'vaccine'],
    related: ['feed-storage', 'pesticide-storage', 'seed-storage', 'reorder-point', 'counts-and-shrinkage', 'renewal-calendar'],
  },
  {
    id: 'cold-chain',
    title: 'Cold chain at the counter',
    section: 'storekeeping',
    summary: 'A dedicated refrigerator at 2 to 8 C aiming at 5, logged twice a day, with a power-outage plan and lot-level quarantine on any excursion.',
    paragraphs: [
      'Refrigerated vaccines are kept at +2 to +8 C; the health-service protocol is to check twice a day aiming at +5 C, record the minimum, maximum and current temperature, reset the logger, and on any excursion take corrective action, isolate the products labelled "do not use", keep them cold in an alternative monitored refrigerator or cooler, establish cause and duration, and not discard until advised. A Philippine cold-chain provider states the same bands (2 to 8 C for most vaccines, minus 15 to minus 25 for frozen ones), dedicated refrigerators not shared with food, no dormitory-style units, minimal door opening, first in first out by expiry, and backup power. In the 2024 heat and power crisis the DOH said ordinary refrigerators are acceptable when well maintained and regularly checked.',
      "Store implications for the later vet line: a dedicated refrigerator with a min-max thermometer or data logger, water bottles in the door and bottom for thermal mass, the twice-daily log in the app, a written power-outage plan (door shut; a cold box with conditioned ice packs if the outage runs past the hold time; record the excursion; quarantine the lot until the supplier or vet advises), and lot-level receiving that checks the delivery's cold box and temperature indicator.",
    ],
    sources: ['SK:12', 'SK:13', 'PK:4.5', 'PC:8'],
    tags: ['vaccine', 'coldChain', 'baiBiologic'],
    related: ['vaccines', 'vaccination-schedules', 'routines-and-checklists'],
  },
]
