import type { GuideTopic } from '../guide'

// What the app computes and from which assumptions: the projection of PLAN.md section 8
// and research/finance-and-kpis.md section 17, the store parameters of
// src/knowledge/parameters.ts, the buying and selling rules of the Plan page, and the
// dashboard figures. The Settings parameters and the Plan explanations link here.
export const APP_TOPICS: GuideTopic[] = [
  {
    id: 'projection-method',
    title: 'How the projection works: ramp-up, seasons and the monthly cash line',
    section: 'app',
    summary:
      "Steady-state sales times a ramp curve times the seasonal index, month by month, with collections and payments lagged by the store's days; the deepest point of cumulative cash is the capital to finance.",
    paragraphs: [
      "Ramp-up evidence: a US specialty retailer discloses that new stores reach mature sales in three to four years with sales rising about 25 percent over that time; another that new stores run lower sales and higher expenses than mature ones; no Philippine small-store ramp data exists. The app's default, derived from that: month-by-month share of steady-state sales rising from 60 percent in month 1 to 100 in month 12 (mean 80 percent in year one), 100 from month 13; a slower variant reaching 100 at month 24 (70 percent in year one, 95 in year two) for a store entering against an established competitor; both editable. The seasonal indices per category multiply the ramp.",
      "The monthly algorithm over 12 to 36 months: sales = steady-state sales x ramp x season; cost of goods = sales x (1 - margin percent); gross margin; fixed and variable expenses by line; tax by mode; net cash = collections - purchases paid - expenses paid - interest - loan repayments, where collections lag credit sales by the receivable days and purchase payments lag receipts by the payable days; stock rolls with the inventory days; the capital requirement peak is the lowest point of cumulative cash and the payback month the first month cumulative net cash reaches zero. Every output carries its explanation and the assumptions it used with their sources and origin: the research default, the store's own setting, or the store's history. A scenario names a strategy from the catalog and its own overrides.",
    ],
    sources: ['FK:17', 'FK:9', 'FK:10', 'PM:11'],
    tags: ['app', 'break-even-coverage', 'seasonalIndex'],
    related: ['sensitivity-set', 'store-parameters', 'seasonal-indices', 'break-even', 'startup-capital', 'scenarios-and-strategies'],
  },
  {
    id: 'sensitivity-set',
    title: 'The fixed sensitivity set',
    section: 'app',
    summary:
      'Sales down 10 and 20 percent, purchase prices up 10 with prices held and with the peso markup held, receivable days up 15, bad debt doubled, rent up 20: the first two break a feed-heavy store.',
    paragraphs: [
      'Each scenario is re-run with six fixed sensitivities and the results shown side by side: sales minus 10 percent; sales minus 20; purchase prices plus 10 with selling prices unchanged (on a 12 percent margin store the margin falls to 3.2 percent) and with prices repriced to hold the peso markup; receivable days plus 15; bad debt doubled; rent plus 20 percent. Each reports break-even sales, the capital peak and the payback month. The first two are the ones that break a feed-heavy store, because its contribution margin is a few percent: a 10 percent fall in sales at a 7.6 percent contribution margin can wipe out the month.',
    ],
    sources: ['FK:17', 'FK:9'],
    tags: ['app', 'break-even-coverage'],
    related: ['projection-method', 'break-even', 'scenarios-and-strategies'],
  },
  {
    id: 'store-parameters',
    title: 'The store parameters in Settings',
    section: 'app',
    summary:
      'Twelve tunables with research defaults: target margins, carrying and funding rates, the forward-buy margin, the service level, dead-stock days, expiry windows, credit terms, late-payment share, allowance percentages, the delivery trip cost and the seasonal indices.',
    paragraphs: [
      "Every rule on the Plan page and every projection reads the store parameters: the store's overrides loaded over the research defaults, each default carrying its research row. Target gross margin percent per category: only fertilizer is sourced (3.5 percent, the per-bag practice); every other category is user-entered between that floor and the 25.05 percent sector ceiling. Carrying cost 25 percent a year (2.08 a month), mid-range of the derived 15 to 32. Funding rate 12 percent a year (the SB Corp formal rate; 5.5 for ANYO, 30 for microfinance). Forward-buy risk margin 2 percentage points on top of carrying cost. Service level Z 1.65 (95 percent; 1.28 for 90, 2.33 for 99). Dead-stock days 90 (no source; user-set). Expiry warning days per category: 30 for feeds, feed ingredients and pet food, 90 for seed, pesticides, disinfectants, vet drugs, vaccines and vitamins, 0 for fertilizer, tools, equipment and other.",
      "Credit terms 30 days (the current aging bucket; production-cycle credit set per customer). Late-payment share 20 percent (input-dealer credit repaid on time 80 percent; delay, not write-off). Allowance percentages by bucket 1, 5, 20 and 50 (an assumption; the IFRS illustration is 0.3 to 10.6). Delivery trip cost PHP 265 (a 10 km sedan trip with four sacks on the Lalamove card; 104 by motorcycle, 480 by L300). Seasonal index per category by quarter (the feed row from the slaughter index, the rest calendar-based). Change a parameter and every recommendation and projection recomputes; the explanation under each shows which value it used and whether it came from the research, the setting or the store's history.",
    ],
    sources: ['FK-108', 'FK-89', 'BS-74', 'SK-86', 'SK-101', 'SK-114', 'SS-32', 'SS-16', 'FK-52', 'SS-58', 'SS-106', 'PM-127'],
    tags: [
      'app',
      'targetMarginPct',
      'carryingCostPctPerYear',
      'fundingRatePctPerYear',
      'forwardBuyRiskMarginPts',
      'serviceLevelZ',
      'deadStockDays',
      'expiryWarningDays',
      'creditTermsDays',
      'latePaymentSharePct',
      'allowancePct',
      'deliveryTripCost',
      'seasonalIndex',
    ],
    related: [
      'buying-rules',
      'selling-rules',
      'projection-method',
      'carrying-cost',
      'capital-sources',
      'reorder-point',
      'dead-stock',
      'credit-policy',
      'delivery-economics',
      'seasonal-indices',
    ],
  },
  {
    id: 'buying-rules',
    title: 'The buying rules on the Plan page',
    section: 'app',
    summary:
      "Reorder, forward buy, promo, cash discount and GMROI ranking, each a pure function over the store's rows and parameters, with an explanation and its assumptions.",
    paragraphs: [
      "Reorder: for every product with sales history, expected demand during the supplier's lead time plus safety stock (Z x the coefficient of variation x the square root of the lead time, in days) against on hand plus on order; the order quantity is capped at what sells within the shelf life remaining less the lead time; the priority rises as days of cover fall below the lead time. Forward buy: when the supplier price log for a product (or the researched proxy for the line) is rising faster than carrying cost per month plus the risk margin, buy h months ahead as long as the stock stays within shelf life; the explanation shows the observed rise, the carrying cost and the margin. Promo: a supplier offer is scored as the effective discount less carrying on the extra months held and expected expiry on the last units, against the product's own velocity. Cash discount: the implied annual rate of forgoing the discount against the funding rate. Ranking: lines by GMROI, not by margin alone, so a thin fast line sits above a fat slow one.",
      'Before the store has history, the rules use the research defaults and say so; a rule that lacks a figure (a category with no target margin, a supplier with no terms recorded) explains what it could not do rather than guessing. Each recommendation card carries the paragraph in words and, on demand, the assumptions with value, source row and origin.',
    ],
    sources: ['SK:8.1', 'SK:8.2', 'BS:5.4', 'BS:6', 'BS:4', 'FK:8'],
    tags: ['app', 'buying', 'serviceLevelZ', 'carryingCostPctPerYear', 'forwardBuyRiskMarginPts', 'fundingRatePctPerYear', 'gmroi'],
    related: ['reorder-point', 'price-signals', 'promo-economics', 'cash-discount-arithmetic', 'turnover-and-gmroi', 'store-parameters'],
  },
  {
    id: 'selling-rules',
    title: 'The selling rules on the Plan page and at the counter',
    section: 'app',
    summary:
      'The credit-sale check, the free-delivery threshold, the tingi floor, the bundle sizing and the seasonal push, each explained with its assumptions.',
    paragraphs: [
      "Credit-sale check: a credit sale on a line is self-funding when the gross margin percent exceeds the funding rate x the term in years plus the expected write-off plus the late-payment financing; the new sale's credit step shows the check for the lines in the basket and the customer's limit and aging. Free delivery: the order's gross margin must cover the delivery trip cost (trip cost / margin percent is the threshold order); below it the rule proposes the marginal trip charge or a route day. Tingi floor: the per-kg price must recover the sack cost, the recorded repack shortfall, packaging and labour, about 5 percent above the sack-equivalent before any tingi margin. Bundles: the feeding programs and crop inputs size the kit (a broiler batch, a weaner batch, a hectare of rice) and the discount is capped by the blended margin. Seasonal push: the category indices say which lines to build before next quarter. Each rule reads the store parameters and explains itself.",
    ],
    sources: [
      'SS:Credit ("listahan" / utang) policy: terms, limits, aging, collection and bad debt',
      'SS:Delivery service economics',
      'SS:Tingi (repack) pricing',
      'SS:Bundling and starter kits',
      'PM:11',
    ],
    tags: ['app', 'selling', 'creditTermsDays', 'latePaymentSharePct', 'deliveryTripCost', 'seasonalIndex', 'targetMarginPct'],
    related: ['credit-policy', 'delivery-economics', 'tingi-pricing', 'bundles-and-starter-kits', 'seasonal-pushes', 'store-parameters'],
  },
  {
    id: 'scenarios-and-strategies',
    title: 'Scenarios and the strategy catalog',
    section: 'app',
    summary: "A saved scenario names one catalog strategy and its overrides; the Plan page shows the strategy's economics beside the projection it produces.",
    paragraphs: [
      'The strategy catalog holds the six buying entries plus 6a and 6b and the nine selling entries plus 15a and 15b of the plan, as the research confirmed, extended and priced them, each with its description, cash cycle, cost structure, margin per unit, when it wins and loses, risks, the records it needs and the store parameters its arithmetic reads. A scenario in the app names one strategy by id and carries its own assumption overrides (steady-state sales, margin by category, credit share, days, rent, the funding rate); the projection runs with them and the sensitivity set, and the Guide page for the strategy is one tap away. Compare scenarios on break-even, capital peak and payback month, and read the strategy\'s "when it loses" before choosing.',
    ],
    sources: ['BS:Strategy catalog', 'SS:Strategy catalog', 'FK:17'],
    tags: ['app', 'buying', 'selling'],
    related: ['projection-method', 'sensitivity-set', 'strategy-buy-1-cash-discount-vs-credit', 'strategy-sell-8-credit-listahan'],
  },
  {
    id: 'dashboard-figures',
    title: 'What each dashboard figure reads',
    section: 'app',
    summary: "Flows are the chosen period's; balances are as of today; stock figures are the live stock; every tile links to the page that explains it.",
    paragraphs: [
      "Sales today and for the period, with the count of sales, from the revenue transactions (delivery fees included). Gross profit and margin percent from the period's income statement. Cash on hand as the cumulative cash flow from the first dated entry to today, with the period's net beside it. Receivables outstanding and the part past 30 days, with the number of customers overdue, from the aging as of today. Payables due within the week, overdue and open, from the schedule as of today. Pending deliveries. Low stock (at or below the reorder point), lots expiring within 30 days, expired lots, dead-stock value at the dead-stock days parameter, and stock value at cost, over the live stock excluding extension lines. The top five sellers by revenue with their margin. The alert banners for stock and for receivables past 30 days.",
      "The charts: sales, cost and margin by month over the twelve months ending in the period; the period's sales by category; receivables by age; month-end stock value at weighted average cost (the stock account, which differs from the tile's lot-cost value only after repacks or costed adjustments); and the supplier price trend per base unit for a chosen product. The period switcher (day, Monday-to-Sunday week, month, quarter, year, custom) is one query shared by the tiles and the charts.",
    ],
    sources: ['FK:16', 'FK:7', 'FK:13', 'SK:8.4'],
    tags: ['app', 'daily-sales', 'transactions-per-day', 'gross-margin-pct', 'receivable-days', 'dead-stock-share', 'inventory-days'],
    related: ['kpi-daily-sales', 'income-statement-and-cash-flow', 'receivables-aging', 'inventory-alerts', 'opening-cash-balance', 'weighted-average-cost'],
  },
  {
    id: 'inventory-alerts',
    title: 'The inventory alerts',
    section: 'app',
    summary:
      'Low stock at the reorder point, expiring lots at 30, 60 and 90 days, expired lots, dead stock past the parameter, and count mismatches; each links to the rule behind it.',
    paragraphs: [
      'Low stock: on hand plus on order at or below the reorder point (lead-time demand plus safety stock at the service level). Expiring: a lot inside its 30, 60 or 90-day window before expiry, the window per category from the store parameters; a feed lot received without a date gets 40 days from receipt. Expired: past its date, to be written off with a reason (expired, spoiled, damaged container, lost). Dead stock: no sale within the dead-stock days, valued at cost. Count mismatch: the last count differs from the book quantity until the adjustment is posted. Extension lines (the veterinary line before it opens) stay out of the figures. The dashboard shows the counts and the Inventory page the lots with the action for each.',
    ],
    sources: ['SK:13', 'SK:8.1', 'SK:8.4', 'SK:1'],
    tags: ['app', 'expiryWarningDays', 'deadStockDays', 'serviceLevelZ', 'dead-stock-share'],
    related: ['reorder-point', 'fefo-and-expiry', 'dead-stock', 'counts-and-shrinkage', 'store-parameters'],
  },
  {
    id: 'opening-cash-balance',
    title: 'Cash on hand and the opening balance',
    section: 'app',
    summary:
      'Cash on hand is the cumulative cash flow from the first entry; a store that started recording after its real opening types its opening balance as a capital entry.',
    paragraphs: [
      "The dashboard's cash on hand is the sum of every cash movement in the ledger from the first dated entry to today: cash sales and collections in, supplier payments and expenses out, capital in and drawings out, loans in and repayments out. A store that began recording after its real opening therefore shows the change since it started, not the cash in the drawer. To make the figure the cash in the drawer, record the cash held on the first day as a capital entry dated that day (the owner's capital in), and record GCash and bank balances the same way if they are to be counted; from then on the daily cash count against the app's figure is the loss-prevention check. The cash flow report shows the operating, capital and financing sections behind the figure.",
    ],
    sources: ['FK:10', 'FK:12', 'FK:13'],
    tags: ['app'],
    related: ['income-statement-and-cash-flow', 'dashboard-figures', 'counts-and-shrinkage', 'startup-capital'],
  },
  {
    id: 'backup-and-sync',
    title: 'Backup, sync and the last-writer-wins limit',
    section: 'app',
    summary:
      'The records live on the device; a backup file or the shared Google account carries them to another device, rows merge by the newest change, and stock is derived from moves so two counters never overwrite each other.',
    paragraphs: [
      "Where the records are. Every sale, purchase, stock move, payment, ledger entry and setting is stored on the device itself, so the app works with no signal and no sign-in. Nothing leaves the device unless it is exported or synced. A lost or wiped phone loses its records, which is why the books the store is obliged to keep need a copy somewhere else: the backup file, or the shared Google account once sync is connected.",
      "Backup file. Settings has a Download backup button that writes one JSON file holding every table, deletions included, named by the date. Keep it on a drive or send it to yourself; one a week after the Sunday close, and one before any phone change, is enough for a small store. Restore from a file offers two modes. Merge keeps whatever is newer on each side, row by row, so an old backup never overwrites a later edit and a record deleted after the backup was made stays deleted. Replace erases every record on the device first and then loads the file; it is for a new or wiped device only, and the app asks for a confirmation before it runs.",
      "Sync. When connected, the app keeps one snapshot of the records in the shared Google account's private app storage, in a space no other app can read. It syncs on opening, every few minutes while the screen is open, and when the app comes back to the front. The Google sign-in expires after about an hour; the app keeps working and queues the changes, and a banner offers a one-tap reconnect that catches up. Every device that runs the store signs in with the same account, so the counter phone and the owner's laptop see the same records.",
      "The limit. Merging keeps the newer change for each record. If two devices edit the same sale or the same customer within one sync window, the later edit wins and the earlier one is lost; each record's stamp comes from the device clock, so keep the clocks on automatic time. Stock is not edited as a number: it is the sum of stock moves, and each move is its own record, so two sales of the same product rung up on two devices at the same moment both survive and the on-hand figure is right after the sync. Counts and adjustments post moves the same way.",
    ],
    sources: ['FK:12', 'SK:11', 'SK:9'],
    tags: ['app', 'backup', 'sync', 'restore', 'google'],
    related: ['dashboard-figures', 'counts-and-shrinkage', 'routines-and-checklists', 'store-parameters'],
  },
]
