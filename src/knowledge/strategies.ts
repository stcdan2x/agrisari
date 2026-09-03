import type { ParameterKey } from './parameters'

// The strategy catalog of PLAN.md section 9 as P1 confirmed, extended and priced it:
// buying entries 1 to 6 plus 6a and 6b (research/buying-strategies.md "Strategy catalog")
// and selling entries 7 to 15 plus 15a and 15b (research/selling-strategies.md "Strategy
// catalog"), each with the research's own fields condensed. A saved scenario names one of
// these by id (Scenario.strategy); the Guide and the Plan page show the entry beside it.
// `sources` are the [Sn] entries of the named research document.

export type StrategySide = 'buying' | 'selling'

export interface Strategy {
  id: string
  number: string
  side: StrategySide
  title: string
  description: string
  cashCycle: string
  costStructure: string
  revenueUnit: string
  whenItWins: string
  whenItLoses: string
  risks: string
  records: string
  parameters: ParameterKey[] // the store parameters its arithmetic reads
  doc: 'BS' | 'SS'
  sources: string[]
}

export const STRATEGIES: Strategy[] = [
  {
    id: 'buy-1-cash-discount-vs-credit',
    number: '1',
    side: 'buying',
    title: 'Distributor credit terms vs cash discount',
    description:
      "Every purchase is settled at the cash (or discounted) price or on the supplier's credit days at list price. The discount forgone is interest paid to the supplier.",
    cashCycle:
      "Cash terms lengthen the cash conversion cycle by the supplier's credit days; with 30-day listahan credit to suki, cash terms mean funding inventory days plus receivable days from the store's own money.",
    costStructure:
      'Taking the discount costs the funding rate on the working capital (5.5 to 14 percent on programme or bank money, 30 on microfinance). Taking credit costs d / (1 - d) x 365 / (N - D) per year: 24.8 percent for 2 percent net 30, 12.3 for 1 percent, 37.6 for 3 percent.',
    revenueUnit:
      "The discount adds to gross margin per unit: PHP 40 on a PHP 2,000 feed sack at 2 percent, PHP 19.90 on a PHP 995 urea bag, more than the dealer's whole PHP 14 net margin on urea.",
    whenItWins:
      'Cash discount wins with programme or bank funding below the implied rate, short receivables (cash and GCash sales) and on fertilizer. Credit wins when the only funding is microfinance at 2.5 percent a month or none, with long listahan receivables, or when the discount is 1 percent or less on net 30.',
    whenItLoses:
      'Paying credit late loses supplier goodwill and promo allocation; taking the discount with borrowed money loses if sales stall and the loan still runs.',
    risks:
      'Liquidity (cash terms drain the float that funds credit sales); supplier concentration; interest-rate changes; late-payment penalties (P3 charges 0.5 percent a month).',
    records:
      "Per supplier: discount percent and days, net days, credit limit. Per invoice: date, due date, paid date, discount taken or forgone. The store's marginal funding rate; receivables aging; monthly purchases per supplier.",
    parameters: ['fundingRatePctPerYear'],
    doc: 'BS',
    sources: ['S8', 'S13', 'S18', 'S19', 'S22', 'S23', 'S24'],
  },
  {
    id: 'buy-2-forward-buying',
    number: '2',
    side: 'buying',
    title: 'Forward buying ahead of feed and fertilizer price increases',
    description:
      'Buying more than the reorder quantity when a price rise is foreseen, so stock bought at the old cost sells at the new market price. Dealers price on a fixed peso markup and the shelf follows the world price up within one to two months, so owning stock before the rise is the only way to earn a rising market.',
    cashCycle:
      'Lengthens inventory days by the months bought ahead; the cash outlay is front-loaded (a two-month forward buy of 100 urea bags at PHP 1,918 is PHP 383,600 up front).',
    costStructure: 'Carrying cost c / 12 per month held (2.08 percent at the 25 percent default); shelf-life and damage risk; the risk of a price fall.',
    revenueUnit:
      'Gain per unit = (new market price - old cost) - carrying cost - any markdown if the price falls instead. Urea March to May 2026: PHP 589 net per bag, about 20 times the normal PHP 30 dealer margin. Feeds on a 2.5 to 5 percent notice: PHP 833 to 5,833 net on a 100-sack month, marginal.',
    whenItWins:
      'Fertilizer and other long-shelf-life lines when the world price or fuel has jumped and the local FPA sheet has not repriced; before the planting season that follows a lean corn quarter; on a dated supplier price-increase notice; when the buy is funded at programme or bank rates.',
    whenItLoses:
      'On short-shelf-life feeds, seeds near season end and anything the store cannot sell within shelf life; at the top of a spike (urea June 2026); when it consumes the listahan float; when the policy move is downward.',
    risks:
      'Price reversal (world urea fell 53 percent in three months in 2026); expiry and spoilage; storage and pest damage; theft; the supplier not honouring old prices; stockholding limits on pesticides.',
    records:
      'Supplier price log per product with dates; Pink Sheet monthly proxies and FPA weekly provincial prices; PSA farmgate corn by month; stock on hand and days of cover; shelf life per lot; funding rate; a log of price-increase notices.',
    parameters: ['carryingCostPctPerYear', 'forwardBuyRiskMarginPts', 'fundingRatePctPerYear'],
    doc: 'BS',
    sources: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S13', 'S14', 'S16'],
  },
  {
    id: 'buy-3-promo-and-rebate-stocking',
    number: '3',
    side: 'buying',
    title: 'Promo and rebate stocking: volume thresholds, the cost of overstock',
    description: "Taking a supplier's volume promo (freebies, bundled discounts) or reaching a rebate tier by buying more than current sales need.",
    cashCycle:
      'Cash outlay rises to the promo quantity at once; inventory days rise by the extra months of cover; rebates arrive one to three months after the period.',
    costStructure: 'Carrying cost c / 12 per extra month held; expiry and damage on the slowest units; cash tied up; handling and space.',
    revenueUnit:
      'Effective discount p = freebie value / order value or the rebate rate; net gain per unit = p - (c / 12) x extra months held - expected expiry loss. A 40-sack-a-month line on "buy 100 get 3 free": net 1.4 percent of the order, break-even discount 2.6 percent.',
    whenItWins:
      'Fast movers where the promo quantity is at most about one month above normal cover; long-shelf-life lines; cheap funding; before a seasonal peak when the extra stock sells anyway.',
    whenItLoses:
      'Slow movers, short-shelf-life feeds, promo quantities above about two months of cover; when it crowds out the listahan float or a better forward buy.',
    risks: 'Overstock and expiry; tier rules changed mid-period; rebate paid in product; a supplier price cut after the promo leaving the store above market.',
    records:
      'Promo terms per offer (quantity, freebies or percent, dates); rebate tiers per supplier per period; product velocity and days of cover; shelf life per lot; a promo log with the realised net gain.',
    parameters: ['carryingCostPctPerYear'],
    doc: 'BS',
    sources: ['S8', 'S13', 'S15', 'S16'],
  },
  {
    id: 'buy-4-assortment',
    number: '4',
    side: 'buying',
    title: 'Assortment: exclusive brand vs multi-brand; house-brand feeds from millers',
    description:
      'One brand per line under a dealership (promo, credit and technical support) versus two or more brands (price coverage, resilience to supply interruptions), plus a lower-priced miller house brand for the price-sensitive backyard segment.',
    cashCycle:
      'Exclusive: fewer SKUs, faster turnover per SKU, one credit line. Multi-brand: more stock for the same sales, longer inventory days, more supplier accounts to fund.',
    costStructure:
      'Multi-brand adds carrying cost on the duplicated stock and loses volume-tier benefits with each supplier; exclusive adds the risk cost of a single source.',
    revenueUnit:
      'Fertilizer: dealer gross margin PHP 30 per bag; customers switch at a PHP 50 gap, not at PHP 10 to 20, so a second brand is worth the sales retained when a competitor undercuts by PHP 50. Multi-brand wins by PHP 371 to 1,171 a month on 100 bags whenever such a gap exists.',
    whenItWins:
      "Multi-brand: fertilizer and generic agrochemicals, provinces with several distributors, stores near a provincial boundary. Exclusive: feeds where a mill's programme, promo and credit support are strong and the brand leads locally; a new store that needs one reliable credit line. House brand: backyard raisers who buy by price, with BAI registration verified.",
    whenItLoses:
      "Exclusive loses when the supplier's price moves above competing brands by the switching threshold or supply is interrupted. Multi-brand loses when the duplicated stock is slow and expires and when it forfeits rebate tiers.",
    risks: 'Supplier retaliation when a second brand is added; house-brand quality and complaint risk; demand shifts by species (ASF).',
    records:
      'Sales and margin by brand and product; supplier terms and promo support by brand; lost-sale log; competitor price checks with dates; BAI and FPA registration of each brand and supplier.',
    parameters: ['carryingCostPctPerYear', 'targetMarginPct'],
    doc: 'BS',
    sources: ['S1', 'S11', 'S13', 'S14', 'S16', 'S17'],
  },
  {
    id: 'buy-5-consignment-and-returns',
    number: '5',
    side: 'buying',
    title: 'Consignment and returns for slow movers',
    description:
      "Holding a supplier's stock without buying it (title passes on sale) and negotiating return rights for slow, damaged or near-expiry units: new products, wide but slow pesticide ranges and, later, short-dated veterinary drugs.",
    cashCycle:
      "Consigned stock has zero inventory days on the store's cash; remittance days per the agreement. Returns shorten the effective life of the stock the store did buy.",
    costStructure:
      'The store still bears space, handling, shrinkage, licensing and display; the supplier bears capital cost and price risk; consignment margins are usually lower than purchase margins (user-entered).',
    revenueUnit:
      'Margin per unit as agreed less handling; the gain is the avoided carrying cost on stock the store would otherwise have bought. A PHP 100,000 pesticide range turning once in six months saves PHP 12,500 of carrying per turn against a 3-point margin concession of PHP 3,750.',
    whenItWins:
      'New products with unknown demand; slow-turning agrochemical ranges the store must carry for coverage; later vet drugs and vaccines with cold chain and short dating; whenever funding is scarce.',
    whenItLoses:
      "Fast movers (the margin concession costs more than the carrying saved); remittance terms stricter than the store's sales cycle; returns counted against future allocation.",
    risks:
      'Stock-count disputes over consigned units; shrinkage charged to the store; regulatory responsibility for storage and display regardless of title; the supplier withdrawing the range.',
    records:
      'Consignment agreement per supplier (margin, remittance period, return window, freight); a consigned stock ledger separate from owned stock; sales of consigned units per period; returns log with reasons and credit notes.',
    parameters: ['carryingCostPctPerYear'],
    doc: 'BS',
    sources: ['S15', 'S16', 'S17'],
  },
  {
    id: 'buy-6-direct-and-pooled',
    number: '6',
    side: 'buying',
    title: 'Direct from the manufacturer once volume qualifies; pooled buying with other stores or a cooperative',
    description:
      "Skipping the distributor tier when the store's volume reaches a full drop (a 25-tonne truck, about 500 bags of fertilizer), or pooling orders with neighbouring stores or a cooperative to reach that drop.",
    cashCycle:
      "A full drop is several months of stock for a single store (500 bags at 100 a month is five months), so inventory days and cash outlay jump; pooling keeps each store's share near one month of cover.",
    costStructure:
      "Saving = the distributor's gross margin (PHP 30 to 50 per urea bag) less the transport the store now pays (about PHP 24 per bag alone, PHP 7 with a shared truck) less the carrying cost of the larger drop.",
    revenueUnit:
      'Net saving per bag = distributor margin avoided - own transport per bag - extra carrying per bag. A single store buying a 500-bag drop direct loses PHP 25.5 per bag; five stores pooling the same drop gain PHP 33 per bag.',
    whenItWins:
      'Fertilizer and other long-shelf-life, high-volume lines once the store nears a drop per month, or as soon as three to five nearby stores can pool; with an own vehicle and a backhaul; before planting season.',
    whenItLoses:
      'Feeds and any short-shelf-life line when the drop exceeds about one month of cover; when accreditation demands a warehouse, vehicle or minimum volume the store cannot meet; when pooling partners pay late.',
    risks:
      "Carrying and expiry on a large drop; cash strain; losing the distributor's credit line and promo support; disputes among pooling partners; the manufacturer treating the store as a competitor to its distributor.",
    records:
      'Volume per product per month; landed cost per source (price, transport, handling); supplier accreditation requirements; pooling agreement; own-vehicle cost per trip; storage capacity in bags.',
    parameters: ['carryingCostPctPerYear'],
    doc: 'BS',
    sources: ['S13', 'S14', 'S15', 'S16', 'S17'],
  },
  {
    id: 'buy-6a-seasonal-cover',
    number: '6a',
    side: 'buying',
    title: 'Buying to the harvest and planting calendar (seasonal cover)',
    description:
      'Timing purchases of feed inputs and fertilizer to the corn harvest quarters and the planting seasons: buying before the lean quarter and running stock down into harvest. Yellow corn arrives mainly in Q1 and Q3 and is scarcest in Q2; fertilizer dealers cut prices to clear stock toward the rice harvest.',
    cashCycle: 'Front-loads cash before the season; releases it as the season sells through.',
    costStructure: 'Carrying at c / 12 per month for the pre-season build; clearance markdowns on stock left at season end.',
    revenueUnit:
      "The avoided price rise into the lean quarter and avoided stock-outs at peak demand; on fertilizer, the sale at full margin during planting rather than at a cleared price after it. One extra month of feed cover in April nets 0.4 to 2.9 percent of the month's feed purchases.",
    whenItWins: 'Every year for fertilizer around the two planting seasons; for feeds around the Q2 corn lean season and around fiesta and Christmas demand.',
    whenItLoses: 'In years when the harvest is early or imports are cheap and prices do not rise into the lean quarter.',
    risks: "Weather (typhoon losses in Q3 2025 cut corn output); demand shocks (ASF); the wrong calendar for the store's own province.",
    records:
      "Regional planting and harvest calendar; PSA quarterly corn production and monthly farmgate prices; the store's own monthly sales by product to compute its seasonal index after the first year; FPA weekly prices for the province.",
    parameters: ['carryingCostPctPerYear', 'seasonalIndex'],
    doc: 'BS',
    sources: ['S1', 'S2', 'S3', 'S4', 'S8', 'S14', 'S16'],
  },
  {
    id: 'buy-6b-programme-loan-stock',
    number: '6b',
    side: 'buying',
    title: 'Programme-loan-funded stock (ANYO, ACEF) instead of supplier credit',
    description:
      'Using a low-rate government agri-enterprise loan to buy for cash and take every cash discount and forward-buy opportunity, instead of running on supplier credit or microfinance.',
    cashCycle: 'Converts supplier payables into a term loan repaid over up to five years; payables fall to zero and cash-discount take-up rises.',
    costStructure:
      'ANYO 2 percent interest plus up to 3.5 percent service fee (5.5 percent a year); ACEF 2 percent; against the 12.3 to 37.6 percent implied cost of forgoing 1 to 3 percent discounts and 30 percent on P3 microfinance.',
    revenueUnit:
      'The cash discount captured on every purchase plus forward-buy gains the store could not otherwise fund. A PHP 300,000 ANYO loan costing PHP 16,500 a year earns PHP 48,000 of discounts on PHP 200,000 of monthly feed purchases at 2 percent.',
    whenItWins:
      'When the store qualifies (registered MSE in agriculture or fishery) and a lending conduit serves the area; when discount and forward-buy opportunities exceed the loan cost.',
    whenItLoses:
      'When the application timeline misses the season; when conduit fees or collateral demands make it costlier than shown; when fixed repayments cannot be serviced in a slow year.',
    risks: 'Programme rules change (ANYO interest was zero before 2024); over-borrowing against uncertain sales; fixed repayments during ASF-type shocks.',
    records:
      'Business registration and MSE eligibility documents; a cash-flow projection for repayment; loan terms and schedule; a register of discounts captured and forward-buy gains realised.',
    parameters: ['fundingRatePctPerYear'],
    doc: 'BS',
    sources: ['S18', 'S19', 'S20', 'S21', 'S22', 'S24'],
  },
  {
    id: 'sell-7-suki-loyalty',
    number: '7',
    side: 'selling',
    title: 'Suki loyalty: discounts, freebies, credit priority',
    description:
      'Named regular customers receive preferential treatment: first call on stock, credit priority, occasional price concessions, freebies, delivery priority and technical advice. In small Philippine retail, retention is built on personalised service and credit more than price.',
    cashCycle: 'Neutral for non-price rewards; negative when the reward is credit. Freebies are paid at purchase and recovered over repeat sales.',
    costStructure: 'Discount cost = discount x suki volume; freebie cost = SKU cost x units given; credit cost as in entry 8; staff time for follow-up.',
    revenueUnit:
      'Retained purchases per season per suki; margin per sale reduced by the concession. On a 4-sack-a-month raiser at 5 percent margin, a 2 percent discount keeps 60 percent of the margin, a PHP 30 freebie keeps 92 percent.',
    whenItWins: 'Lines with margin room (vitamins, agrochemicals, tools), customers with a regular production cycle, markets with several competing stores.',
    whenItLoses:
      'Thin-margin lines (fertilizer at 3 percent gross, feeds), or when the concession is a lower tagged price for some buyers, which RA 7394 Article 81 forbids.',
    risks: 'Margin erosion by habit, discounts that become entitlements, credit priority turning into uncollected listahan, unequal-pricing complaints.',
    records: 'Customer master with suki tier and referral, reward given per sale (amount, SKU, cost), purchase recency and frequency, credit status.',
    parameters: ['targetMarginPct'],
    doc: 'SS',
    sources: ['S1', 'S3', 'S4', 'S5', 'S34', 'S37'],
  },
  {
    id: 'sell-8-credit-listahan',
    number: '8',
    side: 'selling',
    title: 'Credit ("listahan") as a growth tool',
    description:
      'Selling inputs on account, repaid at harvest, at hog sale or on payday. Input dealers are 10 percent of all small-farmer loans, averaging PHP 37,161 per loan; maturities follow the production cycle (rice six months, hogs three to four).',
    cashCycle:
      "Strongly negative: the store finances the customer's whole production cycle. Supplier credit to the store is about one month, so the gap is two to three months per cycle plus late payment (about 20 percent of informal loans late).",
    costStructure: 'Cost of money (11 percent a year formal agricultural), late-payment financing, write-offs, collection time, record keeping.',
    revenueUnit:
      'Credit premium per bag or invoice; the one cooperative dealer sampled charged PHP 80 gross per bag for credit to harvest against PHP 35 for cash. On a PHP 18,000 feed invoice at 60 days and 5 percent margin, PHP 150 of the PHP 900 margin is left; break-even write-off 2.8 percent; a 4.2 percent premium restores the cash margin.',
    whenItWins:
      'Customers with a verifiable production cycle and a sales outlet, referrals from the MAO or a cooperative, the premium priced into the invoice, limits set from cash history, a fixed credit budget.',
    whenItLoses:
      'Credit on thin-margin lines without a premium; limits above one cycle of purchases; no aging; natural hazards and low sales hit all borrowers at once after a typhoon or ASF outbreak.',
    risks: 'Bad debt, cash shortfall for restocking, relationship strain on collection, price risk if repayment is taken in produce.',
    records:
      'Customer credit limit and terms, invoice-level due dates, aging buckets (current, 1-30, 31-60, 61-90, 90+), collection log, write-off history, credit premium applied, collection-day calendar.',
    parameters: ['creditTermsDays', 'latePaymentSharePct', 'allowancePct', 'fundingRatePctPerYear'],
    doc: 'SS',
    sources: ['S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'],
  },
  {
    id: 'sell-9-tingi-pricing',
    number: '9',
    side: 'selling',
    title: 'Tingi (repack) pricing',
    description:
      'Selling feed or seed by the kilo from an opened sack at a per-kg price above the sack-equivalent. Pesticides, fertilizers (FPA licence required to repack) and veterinary drugs (original packages only) are not repacked.',
    cashCycle: 'Positive: small cash sales, no credit; the opened sack turns over in days.',
    costStructure: 'Shrink (1.6 percent general retail benchmark), packaging, weighing labour, spoilage of an opened sack in the rainy season.',
    revenueUnit:
      'Per-kg premium over the sack-equivalent price; the cost floor at the illustrative inputs is about 5 percent. A PHP 1,800 sack at PHP 38 per kg (5.6 percent premium) earns about PHP 11 net per sack after packaging and labour; at 10 percent about PHP 90.',
    whenItWins: 'Backyard raisers who buy daily or weekly, sari-sari resellers, seeds sold by the gram, high foot traffic.',
    whenItLoses: 'Regulated products, slow-moving sacks that spoil after opening, a per-kg price that undercuts the sack price and cannibalises sack sales.',
    risks: 'Weighing disputes, moisture and pest damage in opened sacks, FPA and FDA violations if the rule is misapplied, label duties.',
    records: 'Opened-sack lot tracking (kg sold, kg remaining, shrink at close), tingi price list per SKU, dated per-kg and per-sack observations.',
    parameters: ['targetMarginPct'],
    doc: 'SS',
    sources: ['S9', 'S10', 'S11', 'S12', 'S13'],
  },
  {
    id: 'sell-10-bundles-and-starter-kits',
    number: '10',
    side: 'selling',
    title: 'Bundles and starter kits',
    description:
      "Programme packs: chick starter pack (starter feed, vitamins, disinfectant), piglet starter kit (pre-starter, starter, iron and vitamins), planting kit (seed, basal and top-dress fertilizer, herbicide), gamefowl conditioning kit. Modelled on manufacturer programmes and the DA's seed-plus-voucher support.",
    cashCycle: 'Positive when sold for cash (larger basket, one payment); the follow-on purchases in the programme arrive on schedule.',
    costStructure: 'Discount or freebie cost, assembly time, pre-packing of the high-margin components.',
    revenueUnit:
      'Basket value per customer per cycle; blended margin of components less the bundle discount. Starter feed at 5 percent plus vitamins at 25 percent blend to 6.5 percent: a 3 percent discount leaves PHP 69 on PHP 1,950, a 10 percent discount is a loss. Default bundle discount 2 to 3 percent, or a free high-margin item.',
    whenItWins: 'New raisers and first-time growers, seasonal launches (chick season, planting month), locking the grower and finisher sales.',
    whenItLoses:
      'Feed-heavy bundles with percentage discounts, bundles mixing regulated items in broken packs, customers who already buy the whole programme at full price.',
    risks: 'Margin giveaway, dead stock of the low-velocity component, expiry of vitamins and vaccines in pre-assembled kits.',
    records: 'Bundle definition (components, costs, discount), sales by bundle, follow-on purchase tracking per customer.',
    parameters: ['targetMarginPct'],
    doc: 'SS',
    sources: ['S4', 'S16', 'S31'],
  },
  {
    id: 'sell-11-delivery-service',
    number: '11',
    side: 'selling',
    title: 'Delivery service',
    description: 'Delivering sacks to the farm or backyard; free above an order threshold, charged below; route days for batching.',
    cashCycle: 'Negative on the day (fuel or courier paid before or at delivery); neutral if the fee is collected on delivery.',
    costStructure:
      "Lalamove card (2026): motorcycle PHP 49 base plus PHP 6 then 5 per km (20 kg); sedan PHP 100 plus 18 then 15 per km (200 kg); L300 PHP 280 plus 20 per km (1,000 kg). Transport is about 30 percent of a fertilizer dealer's gross margin.",
    revenueUnit:
      'Delivery fee per drop below the threshold; margin on the incremental volume above it. At 10 km: motorcycle PHP 104, sedan with four sacks PHP 265 (PHP 66 per sack), L300 with twenty sacks PHP 480 (PHP 24 per sack). Free-delivery threshold = trip cost / gross margin percent: PHP 5,300 by car at 5 percent.',
    whenItWins:
      'Bulk drops (10 sacks and up), route days that share one trip among several customers, customers without transport who would otherwise buy from a nearer store.',
    whenItLoses: 'Single-sack deliveries, free delivery below the threshold, a long radius with low load, rainy-season roads.',
    risks: 'Vehicle and fuel cost drift, driver time away from the store, damage in transit, cash handling on the road.',
    records:
      'Delivery log (date, customer, km, load, vehicle, cost, fee charged), route-day calendar, threshold and fee settings, dated fuel price observations.',
    parameters: ['deliveryTripCost', 'targetMarginPct'],
    doc: 'SS',
    sources: ['S5', 'S14', 'S34'],
  },
  {
    id: 'sell-12-technical-service',
    number: '12',
    side: 'selling',
    title: 'Technical service',
    description:
      'Feeding programmes, crop-input advice, supplier seminars hosted at the store, later veterinary consult days. Suppliers provide the technical staff.',
    cashCycle: 'Neutral; the cost is time and a venue.',
    costStructure: 'Staff time, venue, snacks, printed feeding charts; supplier technicians usually free.',
    revenueUnit:
      'Programme sales (whole cycles rather than sacks) and higher raiser income that sustains repeat purchases: a 15.8 percent liveweight price gap between backyard and farmgate was attributed to feeding practice. A PHP 3,000 seminar that switches six raisers to one full cycle returns PHP 8,640 of margin.',
    whenItWins:
      'Areas with backyard raisers and small growers, supplier support available, staff with a technical background, before planting and before chick season.',
    whenItLoses: 'No follow-up recording, advice that conflicts with supplier labels, veterinary services offered without a licensed veterinarian.',
    risks: 'Liability for bad advice, staff time, supplier exclusivity pressure.',
    records:
      'Event log, attendee list linked to the customer master, purchases in the 90 days after, programme templates (feeding schedule by animal and stage).',
    parameters: [],
    doc: 'SS',
    sources: ['S4', 'S15', 'S16', 'S17', 'S19', 'S20'],
  },
  {
    id: 'sell-13-seasonal-timing',
    number: '13',
    side: 'selling',
    title: 'Seasonal timing',
    description:
      'Stocking and promotions timed to planting peaks (wet season June to July, dry season November to December), the RCEF seed rollout (16 March to 15 September), holiday livestock finishing (November to December), derby dates (late January and mid-May) and the rainy season.',
    cashCycle: 'Negative before the season (stock build), positive during it; leftover stock after.',
    costStructure: 'Working capital for pre-season stock, storage, expiry risk on agrochemicals and vet products.',
    revenueUnit:
      'Season-peak volume. A hog finished for the December window is on grower-finisher feed for the three to four months before, so feed demand peaks August to November; fertilizer sells in the month before each planting peak and clears at rice harvest.',
    whenItWins:
      'Stock arrives two to four weeks before the peak, promotions match the local cropping calendar, derby products follow the regional derby calendar.',
    whenItLoses: 'Stock bought at the seasonal price peak, leftover seed past the planting window, vaccines and vitamins expiring in low season.',
    risks: 'Weather shifts in planting, ASF or avian influenza collapsing demand, price moves.',
    records: 'Local cropping calendar, event calendar (fiestas, derbies), sales by week by category over years, lot expiry dates.',
    parameters: ['seasonalIndex', 'expiryWarningDays'],
    doc: 'SS',
    sources: ['S4', 'S18', 'S19', 'S20', 'S21', 'S22', 'S23', 'S34'],
  },
  {
    id: 'sell-14-line-extensions',
    number: '14',
    side: 'selling',
    title: 'Line extensions',
    description:
      'Adding the veterinary line (FDA LTO; a livestock and poultry supply store is a veterinary drug outlet), pet supplies, garden, day-old chicks, water and ice, and GCash cash-in and bills payment.',
    cashCycle:
      'GCash outlet: float tied up in the wallet, replenished by distributor fund-in. Vet line: stock with expiry, sold in original packs. Chicks: fast cash, mortality risk.',
    costStructure: 'Licence and compliance for the vet line, wallet float, cold storage for vaccines, chick brooding losses.',
    revenueUnit:
      'Commission per transaction (GCash outlet), margin per pack (vet), traffic that converts to feed and starter-pack sales (chicks, cash-in). PHP 100,000 of monthly cash-in earns about PHP 500 net plus PHP 375 of vitamin margin from converted traffic: a traffic line, not a profit line.',
    whenItWins:
      'When the extension shares customers with the core (raisers who need vet drugs, chick buyers who need starter feed), when the licence is in hand, when the float is affordable.',
    whenItLoses: 'Vet drugs stocked before the LTO, pet supplies in a market without pet owners, chicks without a brooder.',
    risks: "Regulatory (FDA, BAI), expiry, wallet fraud and cash handling, dilution of the store's focus.",
    records: 'Licence register with expiry, GCash transaction log, category margin reports, chick mortality.',
    parameters: ['targetMarginPct', 'expiryWarningDays'],
    doc: 'SS',
    sources: ['S13', 'S15', 'S28', 'S36'],
  },
  {
    id: 'sell-15-channels',
    number: '15',
    side: 'selling',
    title: 'Channels: Facebook and Messenger, cooperative and LGU programme supply, reseller tiers',
    description:
      'Orders through a Facebook page and Messenger; supply to DA voucher holders as an accredited merchant; cooperative supply contracts; sub-dealer and sari-sari reseller tiers on a fixed peso margin per bag.',
    cashCycle:
      'Messenger orders: cash or GCash on delivery. Voucher sales: a government receivable with documented delays. Cooperative contracts: a single large slow payer. Reseller tiers: often credit to the sub-dealer.',
    costStructure: "Delivery for online orders, the QR Ph fee of 1.0 percent, claim paperwork for vouchers, the sub-dealer's margin for reseller sales.",
    revenueUnit:
      'Orders per week per channel; voucher volume at programme prices; reseller volume at distributor-level margin (about 4 percent gross on fertilizer). A two-bag voucher sale reimbursed in 60 days leaves PHP 33 of PHP 70 gross; a 20-bag reseller drop at PHP 20 margin loses against a PHP 480 L300 trip.',
    whenItWins:
      'Messenger for feed and pet supplies with delivery batching; vouchers when accredited early and claims filed exactly; resellers when the store buys at distributor prices.',
    whenItLoses:
      "Online sale and courier hand-over of fertilizers and pesticides (never authorised); voucher stock financed on supplier credit shorter than the reimbursement lag; reseller tiers at the store's own dealer margin.",
    risks: 'Regulatory (online agrochemical sales), government payment delay, channel conflict with sub-dealers, price disputes.',
    records:
      'Order source per sale, accreditation documents and a voucher claims ledger, reseller price list and credit terms, channel-level margin and delivery cost.',
    parameters: ['deliveryTripCost', 'fundingRatePctPerYear'],
    doc: 'SS',
    sources: ['S5', 'S12', 'S14', 'S24', 'S25', 'S29', 'S30', 'S31', 'S32', 'S33'],
  },
  {
    id: 'sell-15a-gcash-qr-ph',
    number: '15a',
    side: 'selling',
    title: 'GCash and QR Ph acceptance as a selling strategy',
    description:
      'Accepting QR Ph at 1.0 percent MDR through a GCash or Maya business account and refusing or surcharging cards (3.2 to 3.5 percent). Removes the "no cash on hand" barrier on the day a raiser sells hogs and is paid by transfer.',
    cashCycle: "Settlement to the bank per GCash's daily settlement; faster than listahan, slower than cash.",
    costStructure: 'MDR only; no setup or monthly fee unless contracted.',
    revenueUnit:
      'A fee of 1.0 percent of the sale: PHP 18 on a PHP 1,800 sack against a PHP 90 margin. Converting one PHP 18,000 credit sale a month into an immediate payment saves PHP 325 of financing and PHP 360 of expected write-off for PHP 180 of MDR.',
    whenItWins: 'Any sale that would otherwise be credit or lost; customers paid by transfer by their buyers.',
    whenItLoses: 'Cards on feed; personal-wallet receipts that never reach the business books.',
    risks: 'Fraudulent payment screenshots (verify in the dashboard), wallet limits, fee changes.',
    records: 'Payment method per sale, MDR per transaction, settlement reconciliation.',
    parameters: ['fundingRatePctPerYear', 'allowancePct'],
    doc: 'SS',
    sources: ['S24', 'S25', 'S26', 'S27'],
  },
  {
    id: 'sell-15b-financed-feeding-programme',
    number: '15b',
    side: 'selling',
    title: 'Financed feeding programme with an output tie-up',
    description:
      "The Negros Occidental model: the raiser funds the pre-starter and starter feed, the store finances grower and finisher, and repayment comes from the hogs sold through the store's tie-up with meat shops.",
    cashCycle: 'Negative for three to four months per batch; recovered at the sale of the animals.',
    costStructure: 'Cost of money for the financed sacks, technical follow-up, the buyer relationship.',
    revenueUnit:
      'Whole-cycle feed sales at market price plus repayment security; possibly a trading margin on the hogs. Financing 40 sacks (PHP 72,000) for four months at 11 percent costs PHP 2,640 against PHP 3,600 of margin unless a 4 percent premium is priced in or repayment is guaranteed through the buyer.',
    whenItWins: 'The store has a buyer tie-up and technical staff; raisers follow the programme; an ASF-free area.',
    whenItLoses:
      'Without the buyer tie-up (repayment depends on the raiser selling elsewhere), during ASF outbreaks, with more batches financed than working capital allows.',
    risks: 'Disease, price collapse at sale time, raiser side-selling.',
    records: 'Batch register (raiser, head count, feed issued by stage, due date, buyer), financed balance per batch, mortality.',
    parameters: ['fundingRatePctPerYear', 'creditTermsDays'],
    doc: 'SS',
    sources: ['S3', 'S4'],
  },
]

export const strategyById = (id: string): Strategy | undefined => STRATEGIES.find((s) => s.id === id)
