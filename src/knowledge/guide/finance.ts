import type { GuideTopic } from '../guide'

// The accounting conventions and the KPI definitions of research/finance-and-kpis.md (FK),
// which the P6 reports and the P8 dashboard implement. Each KPI of section 16 has its own
// topic tagged with the KPI id.
export const FINANCE_TOPICS: GuideTopic[] = [
  {
    id: 'weighted-average-cost',
    title: 'Cost of goods by weighted average cost',
    section: 'finance',
    summary:
      'Every purchase recomputes the average cost of the units on hand; every sale consumes stock at that average; tingi consumes kilos from the sack pool.',
    paragraphs: [
      "The app keeps perpetual inventory (every receipt and every sale posts a stock move) and values stock at weighted average cost. After a purchase, the new average is (quantity on hand x old average + quantity bought x unit cost) / (quantity on hand + quantity bought); a sale's cost is quantity sold x the average at the time of sale, and a sale does not change the average; ending stock is quantity on hand x the average. A tingi sale consumes kilos from the sack pool at the average per kilo. The unit cost bought is the landed cost: the price paid plus freight and handling to the store, net of discounts and rebates known at receipt. Invariant: the average is never negative and the value on hand always equals receipts less cost of sales.",
      "Worked example: buy 20 sacks at PHP 1,600 (average 1,600); sell 5 at 1,750 (cost 8,000); buy 20 at 1,700 (average 58,000 / 35 = 1,657.14, PHP 33.14 a kilo); sell 12 kg tingi at 40 (cost 397.71); sell 3 sacks at 1,850 (cost 4,971.43). Revenue 14,780, cost 13,369.14, gross margin 1,410.86 or 9.55 percent; ending stock 1,588 kg x 33.14 = 52,630.86. A periodic average for the whole period (1,650 a sack) would overstate this period's cost by 226.86 because the first five sacks sold before the dearer lot arrived; the app uses perpetual so a morning tingi sale and an afternoon receipt each carry the cost true at the time.",
    ],
    sources: ['FK:1', 'FK-108'],
    tags: ['gross-margin-pct', 'inventory-days'],
    related: ['periodic-vs-perpetual', 'gross-margin', 'lot-tracking', 'income-statement-and-cash-flow'],
  },
  {
    id: 'periodic-vs-perpetual',
    title: 'Periodic versus perpetual inventory',
    section: 'finance',
    summary:
      'Perpetual updates stock on every move and knows the cost per sale; periodic counts once and buries shrinkage in cost of sales; the app is perpetual with a periodic reconciliation.',
    paragraphs: [
      'Perpetual: quantity and value updated on every receipt, sale, repack, return and count adjustment; cost known per sale; shrinkage is book stock minus counted stock. It is required for FEFO, reorder points and the credit-sale margin check. Periodic: cost of sales = opening stock + purchases - counted closing stock; shrinkage is buried inside it; typical of a notebook-run feed counter. The app is perpetual with a periodic reconciliation: the monthly cycle count posts the difference as a shrinkage move so that opening + purchases - cost of sales - shrinkage = counted closing stock.',
    ],
    sources: ['FK:2', 'SK:9'],
    tags: ['shrinkage-pct'],
    related: ['weighted-average-cost', 'counts-and-shrinkage'],
  },
  {
    id: 'gross-margin',
    title: 'Gross margin: definitions and benchmarks',
    section: 'finance',
    summary:
      'Gross margin is net sales less cost of goods; the trade thinks in pesos per bag; fertilizer runs about 3 percent and the sector average is 25 percent.',
    paragraphs: [
      'Definitions: gross margin = net sales - cost of goods sold; gross margin percent = margin / net sales; markup percent = margin / cost; margin percent = markup / (1 + markup). The Philippine trade thinks in pesos per bag (a fixed markup), not in percent; the app stores the target margin as a percent and shows the peso-per-sack equivalent. Net sales exclude VAT and are after returns.',
      'Evidence: fertilizer dealers keep about PHP 30 a bag, 2.8 to 3.5 percent, net about 1.3 percent, earning only through rapid turnover; the cooperative dealer selling on credit earned PHP 80, a credit premium of about 5 percent for a season. The PSA 2022 business survey puts "retail sale of other goods in specialized stores" (where agri-supply sits with hardware and pharmacies) at 25.05 percent gross margin with compensation 5.8 percent of revenue and total expenses 92.6 percent, which bounds a mixed assortment from above; a feed-heavy store sits far below because feeds behave like fertilizer, fixed pesos on a PHP 1,500 to 2,000 sack. The app\'s target margin per category is user-entered between the fertilizer floor of 3.5 percent and the sector ceiling of 25.05, and the margin report shows the realised figure per product and category.',
    ],
    sources: ['FK:3', 'FK-16', 'SS-106'],
    tags: ['gross-margin-pct', 'targetMarginPct', 'fertilizer'],
    related: ['markup-practice', 'weighted-average-cost', 'kpi-gross-margin-pct', 'margins-by-tier'],
  },
  {
    id: 'operating-expenses',
    title: 'Operating expense structure',
    section: 'finance',
    summary:
      "Rent, helper wages at the regional minimum plus on-costs, owner's compensation, electricity, transport, permits, shrinkage, bad debt, tax, fees, interest and depreciation.",
    paragraphs: [
      "The lines the projection carries with their anchors: rent (no sourced provincial figure, user input); helper wages (the regional daily minimum for retail establishments of ten or fewer workers x 26 days, plus SSS, PhilHealth, Pag-IBIG and a twelfth of pay accrued for the 13th month: PHP 525 a day is PHP 13,650 a month before on-costs, about 22 percent more with them); owner's compensation (a draw or a salary, always carried so break-even is not flattered); electricity (Meralco PHP 14.78 per kWh in August 2026; provincial cooperatives differ); water, internet and load; transport and delivery (fuel and rider time per trip, motorcycle depreciation); permits and licences amortised monthly; spoilage and shrinkage (1.6 percent of sales as the general benchmark); bad debt as a percent of credit sales; percentage tax or VAT; bank and e-wallet fees; interest on borrowed capital; depreciation. In the sector survey compensation was 5.8 percent of revenue and revenue per employee PHP 5.06 million a year.",
      "A registered Barangay Micro Business Enterprise (assets up to PHP 3 million) is exempt from the minimum wage law while employees keep their social benefits, and from income tax on the enterprise's income. In the app expenses are ledger entries by category; the income statement groups them below gross profit and excludes stock purchases, which are assets until sold.",
    ],
    sources: ['FK:4', 'FK:4.1', 'RT:5.1', 'RT:4.3'],
    tags: ['break-even-coverage', 'compensation-per-employee'],
    related: ['break-even', 'minimum-wage', 'bmbe', 'income-statement-and-cash-flow', 'depreciation-and-owner-draw'],
  },
  {
    id: 'receivables-aging',
    title: 'Receivables aging and the allowance for bad debts',
    section: 'finance',
    summary:
      'Unpaid credit sales are bucketed by age; the allowance is a percentage per bucket; a write-off removes the account against the allowance, not as a new expense.',
    paragraphs: [
      "Every unpaid credit sale is bucketed by days since the sale: current (0 to 30 days), 31 to 60, 61 to 90, over 90. The allowance method applies a percentage to each bucket and sums; the period's bad-debt expense is the amount needed to bring the allowance to that total; when an account is judged uncollectible it is removed from receivables against the allowance. For tax, bad debts are deductible only when actually ascertained worthless and charged off in the year, and recoveries are income when received.",
      'Worked (the allowance percentages are an assumption until the store has history): current 30,000 at 1 percent, 31 to 60 days 15,000 at 5, 61 to 90 days 9,000 at 20, over 90 days 6,000 at 50: receivables 60,000, allowance 5,850 (9.75 percent); with 2,000 already provided, this month\'s expense is 3,850; writing off a PHP 1,200 account next month lowers receivables and the allowance with no new expense. Receivable days = average receivables / net sales x 365; on credit sales only it becomes "credit customers pay in N days". The Receivables page shows the aging per customer and the dashboard the total past 30 days.',
    ],
    sources: ['FK:5', 'FK-52', 'SS-32'],
    tags: ['receivable-days', 'bad-debt-pct', 'allowancePct', 'creditTermsDays'],
    related: ['credit-policy', 'kpi-receivable-days', 'kpi-bad-debt-pct', 'store-parameters'],
  },
  {
    id: 'payables-and-supplier-credit',
    title: 'Payables and supplier credit',
    section: 'finance',
    summary:
      "Payables are recorded at invoice date with the supplier's terms; payable days = average payables / cost of goods x 365; an early-payment discount is compared with the cost of capital.",
    paragraphs: [
      "Payables are recorded at invoice date with the supplier's terms (cash on delivery, 7, 15 or 30 days); payable days = average payables / cost of goods sold x 365. A cash discount for early payment is compared with the cost of capital as an annualised rate: discount / (1 - discount) x 365 / (full term - discount days); 2 percent for paying in 7 instead of 30 days is 32.4 percent a year, which beats every formal loan rate, so a store with cash takes it. In the app a purchase received on terms creates a payable with its due date; payments settle the oldest invoice first; the Payables page shows what is due this week and what is overdue, and the dashboard totals them.",
    ],
    sources: ['FK:6', 'BS:4'],
    tags: ['cash-conversion-cycle', 'fundingRatePctPerYear'],
    related: ['cash-discount-arithmetic', 'cash-conversion-cycle', 'trade-terms'],
  },
  {
    id: 'cash-conversion-cycle',
    title: 'The cash conversion cycle',
    section: 'finance',
    summary: 'Inventory days plus receivable days less payable days: how many days of cost of goods the store funds from its own money.',
    paragraphs: [
      'Cash cycle = inventory conversion period + receivables collection period - payables deferral period. In day form: inventory days = average inventory at cost / cost of goods for twelve months x 365; receivable days = average receivables / net sales x 365; payable days = average payables / cost of goods x 365; the cycle is the first two less the third, and the working capital tied up is about the cycle / 365 x annual cost of goods.',
      "Worked (illustrative store): sales 3,000,000 a year at 12 percent margin so cost of goods 2,640,000; average inventory 220,000, average listahan 100,000, average payables 110,000. Inventory days 30.4, receivable days 12.2 (30.4 on credit sales alone: credit customers pay in about 30 days), payable days 15.2, cycle 27.4 days, cash tied up PHP 198,000. If suki paid in 45 days instead of 30 the cycle rises to 33.2 days and the cash to PHP 240,200. Cash supplier terms lengthen the cycle by the credit days forgone: the buying document's 100-sack store funds 50 days on cash terms against 20 on net 30.",
    ],
    sources: ['FK:7', 'BS:4'],
    tags: ['cash-conversion-cycle', 'inventory-days', 'receivable-days'],
    related: ['kpi-cash-conversion-cycle', 'cash-discount-arithmetic', 'receivables-aging', 'payables-and-supplier-credit'],
  },
  {
    id: 'turnover-and-gmroi',
    title: 'Inventory turnover and GMROI',
    section: 'finance',
    summary:
      'Turnover is cost of goods over average stock; GMROI is gross margin over average stock: a thin-margin fast line can out-earn a fat-margin slow one per peso of stock.',
    paragraphs: [
      "Inventory turnover = cost of goods sold / average inventory at cost; inventory days = 365 / turnover. GMROI = gross margin / average inventory at cost, equivalently margin percent / (1 - margin percent) x turnover. Worked: the illustrative store turns 12 times a year (30 days) and earns GMROI 1.64 (each peso of stock earns PHP 1.64 of margin a year). Feeds at 8 percent margin turning 18 times give 1.57; pesticides at 25 percent turning 4 times give 1.33: the thin fast line out-earns the fat slow one, which is why the buying rules rank lines by GMROI and not by margin alone. No Philippine benchmark for inventory days by line exists; the app derives them from the store's own velocity and caps them by shelf life less the expiry warning window.",
    ],
    sources: ['FK:8', 'FK:16'],
    tags: ['gmroi', 'inventory-days'],
    related: ['kpi-gmroi', 'kpi-inventory-days', 'buying-rules', 'reorder-point'],
  },
  {
    id: 'break-even',
    title: 'Break-even sales and the margin of safety',
    section: 'finance',
    summary:
      'Break-even sales = fixed costs / contribution margin ratio; on a feed-heavy store a contribution margin of a few percent makes break-even a large number.',
    paragraphs: [
      'Break-even in sales pesos = fixed costs / contribution margin ratio. For a retailer the contribution margin ratio is the gross margin percent less the variable costs that scale with sales: percentage tax on the share of sales subject, shrinkage, bad debt on the credit share, payment fees on the e-payment share. Margin of safety = (actual - break-even) / actual; the payback month is the first month in which cumulative net cash flow reaches zero.',
      "Worked at two sizes (sourced items marked in the research, the rest illustrative): a small counter store with PHP 31,107 of monthly fixed costs (rent 8,000, one helper 13,650, electricity 2,957, motorcycle 3,000, permits 1,000, depreciation 1,500, sundries 1,000) at 12 percent margin, 3 percent tax on all sales, 1 percent shrink and 1 percent bad debt on 40 percent credit has a contribution margin of 7.6 percent and breaks even at PHP 409,298 a month (PHP 13,643 a day); a medium dealer store with PHP 87,213 of fixed costs at 14 percent margin breaks even at 918,035. At 15 percent margin the small store's break-even falls to 293,459; if only 30 percent of its sales bear percentage tax, to 320,687. The margin and the tax base are the two levers, which is why the sensitivity set starts with sales and purchase prices.",
    ],
    sources: ['FK:9', 'FK:17'],
    tags: ['break-even-coverage'],
    related: ['kpi-break-even-coverage', 'operating-expenses', 'projection-method', 'sensitivity-set'],
  },
  {
    id: 'startup-capital',
    title: 'Startup capital and the capital to add a line',
    section: 'finance',
    summary:
      'Registration, fixtures, opening stock, the listahan float, a cash float and two months of fixed costs, plus contingency; the number to finance is the deepest point of the cash curve.',
    paragraphs: [
      'Startup capital = registration and licences + fixtures and equipment + opening stock + working capital for credit + cash float + pre-opening rent and deposits + contingency. Opening stock is the sum over SKUs of days of cover x expected daily units x unit cost, rounded to pack size; the working capital for credit is monthly sales x credit share x credit days / 30; the capital requirement peak is the lowest point of cumulative cash in the projection, which is the number to finance, not the day-one sum.',
      'Itemised (sourced lines cited in the research, the rest placeholders the owner replaces): a small counter store about PHP 365,000 (fixtures 30,000; 60 sacks of feed 99,000; 20 bags of urea 22,800; seeds, pesticides and tools 30,000; a PHP 120,000 listahan float on 300,000 of monthly sales at 40 percent credit and 30 days; a cash float and two months of fixed costs 62,000) and a medium dealer store about PHP 1.36 million with a motorcycle. Two student business plans for provincial agrivets came to PHP 430,000 and 630,000. Adding the veterinary line later costs a 2 to 8 C refrigerator, the FDA licence, initial stock, a pharmacist or veterinarian arrangement and extra working capital.',
    ],
    sources: ['FK:10', 'IS:9.2'],
    tags: ['opening', 'break-even-coverage'],
    related: ['startup-capital-evidence', 'capital-sources', 'projection-method', 'opening-cash-balance'],
  },
  {
    id: 'capital-sources',
    title: 'Capital sources and interest rates (dated)',
    section: 'finance',
    summary:
      'ACPC SURE at 0 percent and ANYO at 2 plus fees, SB Corp RISE UP at 10 to 12, P3 microfinance up to 2.5 a month, cooperatives 1 to 1.25 a month, the 5-6 lender at 20 a cycle.',
    paragraphs: [
      'Observed in September 2026: DA-ACPC SURE up to PHP 25,000 at 0 percent with a 3 percent conduit fee, up to three years; ANYO up to PHP 300,000 for an individual and 15 million for an enterprise at 2 percent plus up to 3.5 percent service fee; SB Corp RISE UP Tindahan up to PHP 300,000 at 10 percent diminishing and Multi-purpose up to PHP 20 million at 12 percent plus a 3 percent fee; SB Corp P3 through microfinance institutions at up to 2.5 percent a month all-in with a 0.5 percent monthly late penalty; multipurpose cooperatives 1 to 1.25 percent a month to members; rural and cooperative banks lend a fifth of their portfolio to micro and small enterprises against 1.5 percent for universal banks; the "5-6" lender at 20 percent a cycle, about 792 percent a year compounded monthly.',
      "The app's default interest rate for capital is 12 percent a year diminishing (the formal rate a registered store can actually get) with 2 percent (ANYO, if qualified) and 30 percent (P3) as scenario alternatives; monthly interest = balance x annual rate / 12; a monthly quoted rate compounds to (1 + r)^12 - 1 (2.5 percent a month is 34.5 a year).",
    ],
    sources: ['FK:11', 'BS:9', 'FK-89'],
    tags: ['fundingRatePctPerYear'],
    related: ['stock-financing', 'strategy-buy-6b-programme-loan-stock', 'store-parameters', 'startup-capital'],
  },
  {
    id: 'records-and-bir-books',
    title: 'Record templates and the BIR books',
    section: 'finance',
    summary:
      "The app's sales book, purchase book, stock cards, credit ledger, cash count, delivery log and expense book map onto the BIR journals and ledgers.",
    paragraphs: [
      'Every taxpayer keeps bookkeeping records authorized by the Department of Finance; those with gross sales above PHP 3 million have their books audited yearly; a VAT-registered person also keeps a subsidiary sales journal and a subsidiary purchase journal; under the Ease of Paying Taxes Act a taxpayer under PHP 3 million is classified micro. Books and invoices are preserved five years.',
      'The records the app produces, each a printable table: the daily sales book (date, invoice, customer, product, quantity, unit, price, amount, payment mode, VAT class) for the cash receipts and subsidiary sales journals; the purchase book (supplier, invoice, product, quantity, unit cost, freight, discount, landed cost, terms, due date, VAT class, input VAT) for the disbursements and subsidiary purchase journals; the stock card per product and lot; the credit ledger per customer; the daily cash count sheet (float, cash sales, collections, paid-outs, expected against counted by denomination, e-wallet balances); the delivery log; the expense book by category with VAT class; and the journal and ledger. Cadence: daily for the cash count, monthly for the journals, year-end for the ledger balances that feed the income tax return.',
    ],
    sources: ['FK:12', 'RT:1.4'],
    tags: ['tax'],
    related: ['bir-registration', 'invoicing-eopt', 'counts-and-shrinkage', 'income-statement-and-cash-flow'],
  },
  {
    id: 'depreciation-and-owner-draw',
    title: "Depreciation basics; owner's draw versus salary",
    section: 'finance',
    summary:
      "Straight-line over the useful life with a 5 percent residual; a sole proprietor's takings are drawings, not a deductible salary, but the projection always carries owner's compensation.",
    paragraphs: [
      "Depreciation for tax is a reasonable allowance for wear and tear and obsolescence; a useful life the taxpayer adopts and the BIR does not object to is binding. The app uses straight-line: (cost - residual) / useful life, monthly a twelfth; Philippine public-sector practice keeps a residual of at least 5 percent. Defaults until a schedule is fetched, as assumptions: a delivery motorcycle 5 years, shelving and counters 5, a refrigerator 5, a weighing scale and small equipment 3. Worked: a PHP 80,000 motorcycle with 4,000 residual over 5 years is PHP 15,200 a year, 1,266.67 a month; PHP 30,000 of shelving 475 a month; the motorcycle's carrying value after 24 months is 49,600.",
      "Owner's draw versus salary: a sole proprietor is taxed on the business's taxable income and cannot be their own employee, so what the owner takes is a drawing against equity, not a deductible salary; in a corporation an owner-manager's salary is deductible and taxed as compensation. The projection always carries an owner's compensation line (the opportunity cost of the owner's time) so break-even is not flattered; the books post it as a drawing or a salary by the registration type. In the app a drawing is a cash-flow entry outside the income statement.",
    ],
    sources: ['FK:14', 'FK:4'],
    tags: ['equipment', 'break-even-coverage'],
    related: ['operating-expenses', 'break-even', 'income-statement-and-cash-flow'],
  },
  {
    id: 'carrying-cost',
    title: 'Inventory carrying cost',
    section: 'finance',
    summary:
      "Cost of capital plus storage share plus shrinkage and spoilage plus handling, about 15 percent a year with an owned bodega and 32 rented; the app's default is 25.",
    paragraphs: [
      "Carrying cost percent per year = cost of capital + storage share + shrinkage and spoilage + insurance and handling, applied to average inventory at cost. The Philippine build-up: capital 12 percent (the formal SB Corp rate) or 15.6 (a cooperative's diminishing rate); shrinkage 1.6 percent of sales, 1.8 percent of cost on a 12 percent margin store; storage as the bodega's share of rent (40 percent of PHP 8,000 is 38,400 a year on 220,000 of stock, 17.5 percent); handling and insurance 1 percent: 32 percent for the small rented store, about 15 for a store that owns its bodega. The app's default is 25 percent a year, mid-range and an assumption to be replaced. It feeds the forward-buy signal (a rise must beat carrying cost x holding days / 365: 4.1 percent for 60 days) and the promo and consignment arithmetic.",
    ],
    sources: ['FK:15', 'FK-108', 'BS:6'],
    tags: ['carryingCostPctPerYear'],
    related: ['promo-economics', 'price-signals', 'store-parameters', 'strategy-buy-2-forward-buying'],
  },
  {
    id: 'income-statement-and-cash-flow',
    title: 'The income statement and the cash flow report',
    section: 'finance',
    summary:
      'Revenue less cost of goods is gross profit; write-offs and expenses follow; stock purchases are not expenses. The cash flow splits operating, capital and financing.',
    paragraphs: [
      'The income statement for a period: revenue (sales including delivery fees, plus other revenue) less cost of goods sold at weighted average cost gives gross profit and the gross margin percent; write-offs (expired, spoiled, lost stock at cost) and operating expenses by category follow; net profit is what remains. Stock purchases are excluded: they become cost of goods when sold, so a month of heavy buying does not show a loss. Drawings and loan movements are not expenses either.',
      "The cash flow for the same period reads the ledger by kind: operating (cash sales, collections from customers, payments to suppliers, expenses paid), capital (the owner's capital in and drawings out) and financing (loans received and repaid); the net is the change in cash. Cash on hand on the dashboard is the cumulative cash flow from the first dated entry, so a store that started recording after its real opening shows the change since then unless the opening balance is typed in as a capital entry. Both reports are on the Finance page by month, and the dashboard tiles link to them.",
    ],
    sources: ['FK:1', 'FK:4', 'FK:12', 'FK:13'],
    tags: ['gross-margin-pct', 'daily-sales'],
    related: ['weighted-average-cost', 'operating-expenses', 'opening-cash-balance', 'tax-modes', 'dashboard-figures'],
  },
]

const kpi = (id: string, title: string, summary: string, paragraphs: string[], sources: string[], related: string[]): GuideTopic => ({
  id: `kpi-${id}`,
  title,
  section: 'kpis',
  summary,
  paragraphs,
  sources,
  tags: [id],
  related,
})

export const KPI_TOPICS: GuideTopic[] = [
  kpi(
    'daily-sales',
    'Daily sales',
    'Net sales per calendar day, with 7-day and 28-day moving averages; compare with the break-even per day from the projection.',
    [
      "Daily sales is net sales (after returns, excluding VAT) per calendar day; the dashboard shows today's figure and the period's total, and the sales chart shows the monthly bars. There is no sector benchmark; the store's own target comes from the projection, and the figure to beat is the break-even per day: PHP 13,643 for the research's small counter store, PHP 30,601 for the medium dealer store. A feed store's daily sales are large and its margin thin, so read it beside the gross margin.",
    ],
    ['FK:16', 'FK:9'],
    ['kpi-transactions-per-day', 'kpi-average-basket', 'kpi-break-even-coverage', 'dashboard-figures'],
  ),
  kpi(
    'transactions-per-day',
    'Transactions per day',
    'The count of sales documents in a day; with daily sales it gives the average basket.',
    [
      "Transactions per day is the count of sale documents; the dashboard shows the period's count beside its sales. It separates a fall in sales into fewer customers or smaller baskets, and it is the denominator of the average basket. No benchmark: watch the trend against the same period last year and the planting and fiesta calendar.",
    ],
    ['FK:16'],
    ['kpi-daily-sales', 'kpi-average-basket'],
  ),
  kpi(
    'average-basket',
    'Average basket',
    'Net sales divided by transactions: what a customer buys per visit; bundles and technical service raise it.',
    [
      'Average basket = net sales / transactions. A sack sale sets a high basket; tingi and sachets a low one. Bundles and starter kits (feed with vitamins and the vaccine doses; seed with basal fertilizer and the first top-dress) and the feeding-programme advice raise it without a price cut.',
    ],
    ['FK:16', 'SS:Bundling and starter kits'],
    ['kpi-transactions-per-day', 'bundles-and-starter-kits', 'technical-service'],
  ),
  kpi(
    'gross-margin-pct',
    'Gross margin percent',
    '(Net sales - cost of goods) / net sales by category and in total; fertilizer about 3 percent, the sector ceiling 25 percent.',
    [
      'Gross margin percent = (net sales - cost of goods sold) / net sales, by product, category and total, with cost at weighted average. Benchmarks: fertilizer about 3 to 3.5 percent of price (the per-bag practice, net about 1.3); the PSA sector average for specialized retail 25.05 percent as the ceiling for a mixed assortment. Delivery fees are in revenue on the income statement and excluded from the margin report per product. The dashboard tile shows gross profit and the percent for the period and links to the income statement; the margin report ranks products and categories.',
    ],
    ['FK:16', 'FK:3', 'SS-106', 'FK-16'],
    ['gross-margin', 'markup-practice', 'kpi-gmroi'],
  ),
  kpi(
    'inventory-days',
    'Inventory days',
    'Average inventory at cost / cost of goods x 365: how many days of sales the stock represents; must stay below shelf life less the warning window.',
    [
      "Inventory days = average inventory at cost / cost of goods for the period x 365 (turnover is the inverse). Derived from the store's own velocity; no Philippine benchmark. The upper bound per line is shelf life less the expiry warning window: compounded feed keeps one to two months, so feed inventory days above about 30 are a warning in themselves; pesticides may run to a year. The buying rules cap the order quantity by the same bound.",
    ],
    ['FK:16', 'FK:8', 'SK:13'],
    ['turnover-and-gmroi', 'reorder-point', 'fefo-and-expiry', 'kpi-gmroi'],
  ),
  kpi(
    'receivable-days',
    'Receivable days',
    'Average receivables / net sales x 365, and on credit sales alone "credit customers pay in N days"; must not exceed the terms the store grants.',
    [
      'Receivable days = average receivables / net sales x 365; on credit sales only the same ratio says how many days credit customers take to pay. It must not exceed the terms the store grants (30 days by default, set per customer); production-cycle credit (three to four months for hogs, six for rice) lengthens it by design and must carry the premium. The dashboard shows receivables outstanding and past 30 days; the Receivables page shows the aging per customer. No Philippine benchmark; input dealers see 80 percent on-time repayment.',
    ],
    ['FK:16', 'FK:5', 'SS-32'],
    ['receivables-aging', 'credit-policy', 'kpi-cash-conversion-cycle', 'kpi-bad-debt-pct'],
  ),
  kpi(
    'bad-debt-pct',
    'Bad debt percent',
    'Write-offs / credit sales over the trailing twelve months; the allowance percentages are an assumption until the store has history.',
    [
      "Bad debt percent = write-offs / credit sales, trailing twelve months. No Philippine figure exists for listahan credit in agri retail; the allowance percentages by aging bucket (1, 5, 20 and 50 percent) are an assumption to be replaced by the store's own write-offs, and the ACPC evidence of 20 percent late payment is delay, not loss. The credit-sale check on the new sale uses the expected write-off to say whether a credit sale on a line is self-funding; the break-even write-off rate in the research example is 2.8 percent.",
    ],
    ['FK:16', 'FK:5', 'FK-52'],
    ['receivables-aging', 'credit-policy', 'kpi-receivable-days'],
  ),
  kpi(
    'shrinkage-pct',
    'Shrinkage percent',
    '(Book stock - counted stock) at cost / net sales; the general benchmark is 1.6 percent of sales, reported by cause.',
    [
      'Shrinkage percent = (book stock - counted stock) at cost / net sales. The US retail average was 1.6 percent of sales in 2022 (median 1.4); no Philippine benchmark. The app reports shrink by cause (count variance, repack loss, expired or spoiled, returned, unbooked credit), because for an agrivet the process share (tingi spillage, sack weight variance, mould, credit leakage) is larger than in a chain store. The monthly count posts the variance as a shrinkage move.',
    ],
    ['FK:16', 'SK:9'],
    ['counts-and-shrinkage', 'periodic-vs-perpetual', 'repacking-rules'],
  ),
  kpi(
    'sales-per-sqm',
    'Sales per square metre',
    "Net sales / selling area; no source gives a benchmark, so it is the store's own trend.",
    [
      "Sales per square metre = net sales / selling area. No Philippine or general source with a figure was found (an open question in the research), so the app shows it only when the store records its selling area in Settings, as the store's own trend. A feed store's footprint follows feed volume: a 50 kg sack occupies about 0.08 cubic metres on pallets, so the bodega, not the counter, sets the area.",
    ],
    ['FK:16', 'IS:1.1'],
    ['store-formats', 'kpi-sales-per-employee'],
  ),
  kpi(
    'sales-per-employee',
    'Sales per employee',
    'Net sales / full-time equivalents; the sector figure is PHP 5.06 million per employee per year.',
    [
      'Sales per employee = net sales / full-time equivalents. The PSA 2022 survey gives PHP 5,056,161 per employee per year for retail of other goods in specialized stores (the derived figure: revenue over employment in the group). A one-helper store at PHP 300,000 of monthly sales is at PHP 1.8 million per employee counting the owner; the figure says whether a second helper pays.',
    ],
    ['FK:16', 'FK:4'],
    ['kpi-compensation-per-employee', 'operating-expenses'],
  ),
  kpi(
    'compensation-per-employee',
    'Compensation per employee',
    'Wages and benefits / full-time equivalents; the sector figure is PHP 293,399 a year; a minimum-wage helper costs about 22 percent above the daily rate.',
    [
      'Compensation per employee = wages and benefits / full-time equivalents. The sector figure is PHP 293,399 a year (compensation over employment in the PSA group). A helper at the regional minimum for small retail (PHP 485 to 525 a day in most regions in 2026) costs the daily rate x 26 days plus SSS at 10 percent employer share, half of the 5 percent PhilHealth premium, PHP 200 Pag-IBIG and a twelfth of pay for the 13th month: about 22 percent above the basic wage.',
    ],
    ['FK:16', 'FK:4.1', 'RT:5.1', 'RT:1.5'],
    ['kpi-sales-per-employee', 'minimum-wage', 'operating-expenses'],
  ),
  kpi(
    'dead-stock-share',
    'Dead stock share',
    'Value of SKUs with no sale in N days / total stock value; N is the dead-stock days parameter (90 to start), shelf life for perishables.',
    [
      "Dead stock share = value at cost of the lots with no sale in N days / total stock value. N is the dead-stock days store parameter (90 to start, no Philippine source gives a number), and for perishables the lot's shelf life. The dashboard tile shows the dead-stock value and links to the Inventory page, whose alerts list the lots; the actions are return, transfer, markdown, bundle, write-off, in that order.",
    ],
    ['FK:16', 'SK:8.4', 'SK-101'],
    ['dead-stock', 'inventory-alerts', 'store-parameters'],
  ),
  kpi(
    'gmroi',
    'GMROI: gross margin return on inventory',
    'Gross margin / average inventory at cost; rank lines by it, because a thin fast line can beat a fat slow one.',
    [
      "GMROI = gross margin / average inventory at cost, equivalently margin percent / (1 - margin percent) x turnover; each peso of stock earns that many pesos of margin a year. Worked: feeds at 8 percent turning 18 times give 1.57, pesticides at 25 percent turning 4 times give 1.33, the illustrative store overall 1.64. The buying rules rank lines by GMROI and not by margin alone; no benchmark beyond the store's own lines.",
    ],
    ['FK:16', 'FK:8'],
    ['turnover-and-gmroi', 'kpi-gross-margin-pct', 'kpi-inventory-days', 'buying-rules'],
  ),
  kpi(
    'cash-conversion-cycle',
    'Cash conversion cycle',
    "Inventory days + receivable days - payable days: the days of cost of goods funded from the store's own money.",
    [
      "Cash conversion cycle = inventory days + receivable days - payable days; working capital tied up is about the cycle / 365 x annual cost of goods. The research's illustrative store runs 27.4 days and PHP 198,000; suki paying in 45 instead of 30 days lifts it to 33.2 days and 240,200; cash supplier terms lengthen it by the credit days forgone. The dashboard shows the three balances (stock at cost, receivables, payables) and the reports the flows behind them.",
    ],
    ['FK:16', 'FK:7'],
    ['cash-conversion-cycle', 'kpi-inventory-days', 'kpi-receivable-days', 'cash-discount-arithmetic'],
  ),
  kpi(
    'break-even-coverage',
    'Break-even coverage',
    'Actual sales / break-even sales; above 1.0 the month covered its fixed costs.',
    [
      "Break-even coverage = actual sales / break-even sales, where break-even sales = fixed costs / contribution margin ratio for the period. Above 1.0 the period covered its fixed costs; the margin of safety is (actual - break-even) / actual. The Finance page's break-even report shows the figure per month from the ledger's fixed expenses and the realised margin; the projection shows it per scenario with the payback month. The research's small store needs PHP 409,298 a month at a 7.6 percent contribution margin.",
    ],
    ['FK:16', 'FK:9'],
    ['break-even', 'kpi-daily-sales', 'projection-method', 'sensitivity-set'],
  ),
]
