import type { GuideTopic } from '../guide'

// The buying side from research/buying-strategies.md (BS) and the trade-terms evidence of
// research/industry-and-supply-chain.md (IS). The eight buying strategies of the catalog are
// generated topics beside these (see guide.ts).
export const BUYING_TOPICS: GuideTopic[] = [
  {
    id: 'supplier-selection',
    title: 'Choosing and scoring suppliers',
    section: 'buying',
    summary:
      'A new store buys from distributors, not mills; score each supplier on landed price, lead time, drop size, terms, returns, licences, promos and technical support.',
    paragraphs: [
      'Fertilizer reaches a store through importer or manufacturer, distributor or area distributor (typically one province, selling to dealers only) and dealer; feeds follow the same shape, a dealership buying from the mill and supplying retailers and raisers. A new provincial store therefore starts as a dealer buying from distributors. The field data say where the money is: on urea the distributor keeps PHP 30 to 50 a bag and the dealer PHP 10 to 80 (average 30), net about PHP 14; dealers price on a fixed peso markup, and their main risk is buying high just before cheaper stock arrives. On fertilizer the buying price, not the selling price, decides the margin.',
      "Selection criteria the app scores per supplier, with weights the store sets: landed price per bag or unit including delivery; lead time in days and its reliability; drop size (minimum bags per delivery) against the store's monthly volume; credit terms and cash discount; returns policy for damaged, expired or slow stock; registration and licensing status (an FPA-licensed handler for fertilizer and pesticides, a BAI-registered feed establishment); promo and rebate programme; technical support (feeding programs, field days). The engine ranks suppliers per product on landed cost and lead time and flags a supplier whose terms the store has not recorded. No manufacturer publishes dealer accreditation thresholds: treat warehouse, vehicle, minimum volume and territory as facts to confirm with the regional sales office.",
    ],
    sources: ['BS:1', 'IS:3.1', 'IS:9.4'],
    tags: ['buying', 'fertilizer', 'feed'],
    related: ['supply-chain-tiers', 'trade-terms', 'supplier-onboarding', 'strategy-buy-4-assortment', 'strategy-buy-6-direct-and-pooled'],
  },
  {
    id: 'minimum-orders',
    title: 'Minimum orders and drop sizes',
    section: 'buying',
    summary:
      "The only published unit is the 500-bag fertilizer truckload; feeds, seeds and pesticides carry no published minimums, so record each supplier's drop size as observed.",
    paragraphs: [
      "Philippine evidence exists only for fertilizer logistics: the delivery unit between importer and provincial distributor is a 25-tonne truck of 500 bags, about PHP 7 a bag in 2013; a container is about 500 bags too; transport is about 60 percent of a distributor's PHP 40 margin, about PHP 24 a bag. No published minimum exists for feeds by sack, seeds by pack or pesticides by case; the app holds minimum order and drop size per supplier as user-entered fields. The IFDC rule for seasonal inputs: buy fertilizer and seeds for one season only and avoid stock through the year; buy pesticides for the season but keep an emergency stock for farmers.",
    ],
    sources: ['BS:2', 'IS:4'],
    tags: ['buying', 'fertilizer'],
    related: ['supplier-selection', 'strategy-buy-6-direct-and-pooled', 'strategy-buy-6a-seasonal-cover'],
  },
  {
    id: 'negotiating-terms',
    title: 'Negotiating terms and rebates',
    section: 'buying',
    summary:
      "On fertilizer a 2 percent cash discount is larger than either party's net margin; delivery is the distributor's biggest cost, so collection or a shared drop is a concession to ask for.",
    paragraphs: [
      "No Philippine source states typical trade-credit days, cash-discount percentages or rebate thresholds for feeds or agrochemicals; what the sources establish is where to push. The distributor's return to capital on fertilizer is PHP 11 a bag and the dealer's net margin PHP 14, so a 2 percent cash discount (PHP 20 on a PHP 995 bag) is larger than either party's net margin: cash against credit is the decisive term on fertilizer, not the list price. Delivery is 60 percent of the distributor's margin, so a store that collects with its own vehicle or accepts a full drop with neighbouring stores has a concrete concession to ask for (about PHP 24 a bag at 2021 margins). Feed millers' costs are dominated by corn and soybean meal: ask for promo support and rebates when the world maize and soybean meal prices are falling, not rising.",
      'Rebates are usually a tiered volume rebate paid after the period; record the tier thresholds and the rate per supplier. The engine treats a rebate as a reduction in landed cost only when projected purchases reach the tier; otherwise it is a promo-stocking decision. General terms for the option lists only (cash on delivery, 7, 15 or 30 days secured by post-dated cheques, a credit line sized to one or two drops, quarterly rebates, launch freebies, price protection on stock in hand when list prices fall): every one is entered as observed with the distributor, never assumed.',
    ],
    sources: ['BS:3', 'IS:5'],
    tags: ['buying'],
    related: ['cash-discount-arithmetic', 'strategy-buy-1-cash-discount-vs-credit', 'strategy-buy-3-promo-and-rebate-stocking', 'trade-terms'],
  },
  {
    id: 'cash-discount-arithmetic',
    title: 'Cash discount versus credit terms: the arithmetic',
    section: 'buying',
    summary:
      "Forgoing d percent for N days costs d / (1 - d) x 365 / N a year: 24.8 percent for 2 percent net 30. Take the discount when that beats the store's cost of funds.",
    paragraphs: [
      'Paying on the net day instead of taking the discount means borrowing the invoice for the extra days at a cost of the discount: the simple annual rate is d / (1 - d) x 365 / (N - D). For the Philippine pattern "cash price or net 30": 2 percent costs 24.8 percent a year, 1 percent 12.3, 3 percent 37.6; 2 percent for paying in 10 instead of 30 days costs 37.2 percent. Against that, the store\'s cost of funds (dated): bank SME loans 7.4 to 14 percent, commercial agricultural loans 8 to 10, ACPC ANYO 5.5 all-in, LandBank ACEF 2, SB Corp RISE UP 8 to 10, SB Corp P3 microfinance up to 2.5 percent a month (30 a year).',
      "Decision rule the engine applies: take the discount when the implied annual rate of forgoing it exceeds the store's marginal funding rate (a store parameter, default 12 percent); otherwise take the credit days. Worked: 100 sacks a month at PHP 2,000, 2 percent cash versus net 30. The discount is worth PHP 48,000 a year; funding the freed PHP 200,000 costs PHP 24,000 at 12 percent (discount wins by 24,000), PHP 11,000 at ANYO (wins by 37,000), PHP 60,000 at P3 (credit wins by 12,000). On fertilizer the 2 percent is PHP 19.90 a bag, more than the dealer's whole net margin, so buy for cash whenever it can be funded and finance the cash with the cheapest programme loan. Cash terms also lengthen the cash conversion cycle: 50 days on cash terms against 20 on net 30 in the example, PHP 200,000 of working capital.",
    ],
    sources: ['BS:4', 'FK:6', 'FK-89'],
    tags: ['buying', 'fundingRatePctPerYear', 'cash-conversion-cycle'],
    related: ['strategy-buy-1-cash-discount-vs-credit', 'stock-financing', 'cash-conversion-cycle', 'store-parameters'],
  },
  {
    id: 'price-signals',
    title: 'Reading a coming price increase: the forward-buy signals',
    section: 'buying',
    summary:
      'World prices lead the shelf by one to two months on the way up and longer on the way down; buy ahead when the expected rise beats carrying cost plus the risk margin.',
    paragraphs: [
      'What drives the prices. Corn is about 60 percent of feed ingredients and feed about 80 percent of the cost of meat; soybean meal is almost all imported; the trade itself forward-buys on rising prices, so rises reach the shelf faster than falls. The corn tariff of 5 percent in-quota and 15 out-quota runs to 2028 and reverts to 35 and 50 from 2029 unless extended: a dated, foreseeable feed cost shock. Yellow corn harvests land in the first and third quarters and the second quarter is lean; feed price notices cluster around the lean months and around world or fuel shocks. Every imported input carries the peso on top of the dollar move, and the March 2026 diesel spike moved feed prices PHP 1 to 2 a kilo within weeks.',
      'The lag. World urea jumped from USD 472 in February 2026 to 857 in April; the FPA national average was still PHP 1,948 in mid-March, PHP 2,567 by early May and PHP 2,658 by mid-June: the shelf lagged the world price by one to two months on the way up. World urea was back to 400 by July while the shelf was still PHP 2,373 in late August: slower on the way down, because dealers hold stock bought at the top and price on a fixed markup. This asymmetry is the empirical basis of the trigger.',
      "Signals in the order the store sees them: the World Bank Pink Sheet monthly maize, soybean meal, urea, DAP and Brent prices (free, monthly); the peso-dollar rate; PSA farmgate corn by month and the quarterly harvest calendar; FPA weekly fertilizer prices by province (whether the store's own province has repriced yet); DA and industry notices; the supplier's own price-increase notice and the price log in the app. The trigger: carrying cost c per year (default 25 percent) makes one extra month of stock cost c / 12 = 2.08 percent; buy h months ahead when the expected rise over h months exceeds h x c / 12 plus the risk margin (default 2 points), the stock stays within shelf life and the store can fund it. Urea March to May 2026: plus 31.8 percent in 1.6 months against 3.3 percent of carrying, buy the season ahead. A feed notice of 2.5 to 5 percent with two weeks' lead: one extra month of fast movers at most. The reverse case: urea bought at PHP 2,658 in June and sold at 2,373 in August lost PHP 285 a bag plus PHP 111 of carrying against a normal PHP 30 margin.",
    ],
    sources: ['BS:5.1', 'BS:5.2', 'BS:5.3', 'BS:5.4', 'BS-74', 'FK-108'],
    tags: ['buying', 'carryingCostPctPerYear', 'forwardBuyRiskMarginPts', 'fertilizer', 'feed'],
    related: ['strategy-buy-2-forward-buying', 'fertilizer-prices', 'feed-prices', 'buying-rules', 'store-parameters'],
  },
  {
    id: 'promo-economics',
    title: 'Promo stocking and the cost of overstock',
    section: 'buying',
    summary:
      'A promo wins when its discount beats carrying cost per extra month held times the extra months: 2.6 percent on a 40-sack line offered "buy 100 get 3 free".',
    paragraphs: [
      "Carrying cost is the sum of storage, handling, insurance, pilferage, obsolescence and the opportunity cost of capital; 25 percent of unit value a year is the widely quoted average and the app's default, 2.08 percent a month. For this store the capital component alone is the funding rate (5.5 to 14 percent on programme or bank money, 30 on microfinance); the rest is space, labour, shrinkage in repacking, moisture and pest damage on feeds, expiry on agrochemicals and seeds. Fertilizer bags burst and some grades go stale; untreated seed gets stored-product pests; pesticide containers deform in long storage.",
      "Worked (terms illustrative): a feed selling 40 sacks a month at PHP 2,000 cost, offered buy 100 get 3 free (3 percent). Holding 100 sacks instead of 40 means the extra 60 sit about 1.25 months longer: carrying PHP 52 a sack, PHP 3,125; freebies PHP 6,000; net gain PHP 2,875, 1.4 percent of the order, before expiry risk on the last sacks and before finding PHP 200,000 instead of 80,000 that month. Break-even: the promo discount must exceed (c / 12) x extra months held, here 2.6 percent; a 2 percent promo loses. The same promo on a 100-sack line is a pure 3 percent gain. The engine evaluates every promo against the product's own velocity, shelf life and the store's cash, never as a headline discount.",
    ],
    sources: ['BS:6', 'FK:15', 'FK-108'],
    tags: ['buying', 'carryingCostPctPerYear'],
    related: ['strategy-buy-3-promo-and-rebate-stocking', 'carrying-cost', 'buying-rules'],
  },
  {
    id: 'consignment-and-returns',
    title: 'Consignment and returns for slow movers',
    section: 'buying',
    summary:
      "Under consignment the supplier keeps title until the sale and the store's capital cost on that stock is zero; returns are a negotiated term recorded per supplier.",
    paragraphs: [
      "No Philippine source describes consignment or return terms for agrochemicals or veterinary products, so this is general practice: under consignment the supplier keeps title until the sale and the store remits sold units per period; the store's capital cost on that stock falls to zero but it still bears space, handling, shrinkage and the regulatory duties of a licensed dealer (FPA storage and display rules for pesticides, FDA rules for vet drugs); suppliers usually pay a lower margin on consigned goods and count returns against the dealer. Returns for damaged or near-expiry stock are a negotiated term: record the return window in days before expiry, the restocking fee and who pays freight per supplier. The app keeps a consigned stock ledger apart from owned stock and the dead-stock flag proposes return, transfer, markdown, then write-off.",
    ],
    sources: ['BS:7', 'SK:8.4'],
    tags: ['buying', 'pesticide', 'vetDrug'],
    related: ['strategy-buy-5-consignment-and-returns', 'dead-stock', 'receiving-and-returns'],
  },
  {
    id: 'assortment',
    title: 'Assortment: exclusive versus multi-brand, house brands and pooled buying',
    section: 'buying',
    summary:
      'Farmers switch fertilizer brands at a PHP 50 gap, so a second source is the default on fertilizer; feeds follow the local species mix; pooling reaches the truckload.',
    paragraphs: [
      "Fertilizer buyers pick on price rather than loyalty; on a brand they will not switch for PHP 10 to 20 a sack but shop around at about PHP 50; brands dominate near their port of entry; distributors face intense competition from adjoining provinces and cannot raise the markup. The multi-brand default follows: on fertilizer the store must be able to match a PHP 50 gap or lose the customer, which requires a second source. Feeds are formulated products with feeding programs; the documented dealership built its position by introducing new products and pioneering a brand in its region, and San Miguel's free-range and layer feed growth reminds that assortment follows the local species mix. House-brand or toll-milled feeds from local millers are a lower-cost alternative for the price-sensitive backyard segment, scored like any other supplier on landed cost and lead time, with BAI registration and label claims verified.",
      "Pooled buying: a dealer may be a farmer cooperative returning part of the margin as patronage refund; a store can join a cooperative's pooled order or organise a shared truckload with neighbouring stores. Records: sales and margin by brand, supplier terms and promo support by brand, a lost-sale log (the brand or price the store could not match), dated competitor price checks, and the BAI and FPA registration of each brand and supplier.",
    ],
    sources: ['BS:8', 'IS:8'],
    tags: ['buying', 'fertilizer', 'feed'],
    related: ['strategy-buy-4-assortment', 'strategy-buy-6-direct-and-pooled', 'cooperatives', 'margins-by-tier'],
  },
  {
    id: 'stock-financing',
    title: 'Stock financing: supplier credit, programme loans, banks and microfinance',
    section: 'buying',
    summary:
      'Supplier credit first when the discount forgone is small; then ANYO at 5.5 percent, ACEF at 2, SB Corp at 8 to 12, banks at 7 to 14, microfinance at 30.',
    paragraphs: [
      'Supplier credit is the first and cheapest source when the discount forgone is small. Programme loans open to an agri-supply enterprise (all dated; verify availability): ACPC ANYO, micro up to PHP 300,000 and small to PHP 15 million, 2 percent interest plus up to 3.5 percent service fee (5.5 a year), up to five years, through cooperative and rural bank conduits, for registered micro and small agri-fishery enterprises, applied through acpcaccess.ph; LandBank ACEF, up to PHP 5 million for MSEs and cooperatives, 2 percent a year per the LandBank page snippet; SB Corp RISE UP Tindahan for retail stores (needs a track record in consumer goods, so an agrivet may not qualify) at 10 or 8 percent, and RISE UP Multi-purpose at 12 percent diminishing; SB Corp P3 through microfinance conduits up to PHP 300,000 at up to 2.5 percent a month all-in, no collateral; bank SME loans 7.4 to 14 percent effective in June 2026; multipurpose cooperatives about 1 to 1.25 percent a month to members; the "5-6" lender at 20 percent a cycle.',
      'The app lets the owner pick one of these as the marginal funding rate in the store parameters (default 12 percent, the SB Corp formal rate) and the projection shows ANYO at 5.5 percent as the "if qualified" scenario and 30 percent as the microfinance case.',
    ],
    sources: ['BS:9', 'FK:11', 'FK-89'],
    tags: ['buying', 'fundingRatePctPerYear'],
    related: ['strategy-buy-6b-programme-loan-stock', 'capital-sources', 'cash-discount-arithmetic', 'store-parameters'],
  },
]
