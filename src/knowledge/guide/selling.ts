import type { GuideTopic } from '../guide'

// The selling side from research/selling-strategies.md (SS); its headings carry no number,
// so sources quote the heading. The eleven selling strategies of the catalog are generated
// topics beside these (see guide.ts).
const CREDIT = 'SS:Credit ("listahan" / utang) policy: terms, limits, aging, collection and bad debt'

export const SELLING_TOPICS: GuideTopic[] = [
  {
    id: 'suki',
    title: 'Suki loyalty: what the reward really is',
    section: 'selling',
    summary:
      'Retention in Philippine small trade is bought with service and credit priority, not price; on thin-margin lines the affordable suki reward is non-price.',
    paragraphs: [
      'The suki relationship (a regular customer who keeps buying from one seller and is rewarded with preferential treatment, credit and sometimes a lower price) is the retention mechanism of Philippine small trade. The evidence on the reward: Luzon fertilizer dealers keep a PHP 30 a bag markup that "may occasionally fall even lower for long-time customers", a few pesos not a percentage; ten sari-sari stores in Bukidnon all faced daily price competition and relied on personalised service for retention, nine of ten reporting customer debt problems; input dealers extend credit without documents to farmers recommended by the municipal agriculture office; informal lenders lend only to people they know and mostly wait or visit when payment is late. The suki tie is the collateral.',
      'Economics: a suki reward is only affordable inside the gross margin of the line it is given on. On urea a PHP 20 a bag discount would take 57 percent of the PHP 35 gross margin and exceed the PHP 14 net margin. On thin lines the reward is credit priority, free delivery on volume, first call on scarce stock and technical advice; price rewards belong on lines with room in the margin, or as freebies that cost the store less than they are worth to the customer (a sachet of vitamins, a feeding chart). The app records the suki tier and referral source on the customer, purchase frequency and recency, the credit history, and the reward given per sale (discount amount, freebie SKU and its cost) so the true margin per customer is visible.',
    ],
    sources: ['SS:Suki loyalty schemes', 'IS:5'],
    tags: ['selling', 'sell-7-suki-loyalty'],
    related: ['strategy-sell-7-suki-loyalty', 'credit-policy', 'markup-practice'],
  },
  {
    id: 'credit-policy',
    title: 'Credit (listahan) policy: terms, aging, collection and bad debt',
    section: 'selling',
    summary:
      'Input dealers are a major farm lender at production-cycle terms; 80 percent repay on time; credit is self-funding only when the margin covers the cost of money, the delay and the write-offs.',
    paragraphs: [
      'The evidence. In the ACPC 2014 survey loans from input dealers were 10 percent of all small-farm loans, averaging PHP 37,161, the second largest informal source; input dealers charged the highest informal interest, 24 percent per loan cycle; terms follow the production cycle (input dealers averaged eight months, rice six, a feeds distributor is repaid from the hogs after three to four months); approval takes about three days. Lenders reported on-time repayment of 80 percent for input dealers; PIDS interviews found input traders "rarely experience defaults" and restructure in hard cases; late payment is met by waiting (28 percent) or a personal visit (22 percent). An 80 percent repayment rate is on-time recovery, not a write-off rate: the loss is lower after restructuring but the working capital is tied up for the delay. The one cooperative dealer selling urea on after-harvest credit charged PHP 45 a bag more than cash dealers, about 4.5 percent for a season, 9 percent a year.',
      "Aging and provisioning. The buckets are current (up to 30 days), 31 to 60, 61 to 90 and over 90; the IFRS 9 illustration applies expected loss rates of 0.3, 1.6, 3.6, 6.6 and 10.6 percent by bucket, an illustration not a benchmark. Until the store has history the app plans with a 20 percent late-payment share and the allowance percentages of 1, 5, 20 and 50 percent by bucket (an assumption), replaced by the store's own write-off history; the credit terms default to 30 days and are set per customer.",
      "Worked economics of a credit sale: 10 sacks at PHP 1,800 on a 5 percent margin (PHP 900), 60-day terms, 20 percent paid 60 days late, 11 percent cost of money, 2 percent never collected. Financing the term costs PHP 325 (36 percent of the margin), the late fifth PHP 65, the write-off PHP 360: margin after credit PHP 150, 0.8 percent of sales; the break-even write-off rate is 2.8 percent; the premium that keeps the cash margin intact is 4.2 percent, close to the cooperative dealer's 4.5. The rule the engine applies: credit on a line is self-funding only when the gross margin percent exceeds the cost of money times the term in years plus the expected write-off plus the late-payment financing; otherwise the credit sale carries a documented premium or is limited to lines whose margin covers it. The new sale's credit step shows this check.",
    ],
    sources: [CREDIT, 'FK:5', 'SS-32', 'SS-16', 'FK-52'],
    tags: ['selling', 'creditTermsDays', 'latePaymentSharePct', 'allowancePct', 'receivable-days', 'bad-debt-pct', 'sell-8-credit-listahan'],
    related: ['strategy-sell-8-credit-listahan', 'credit-limit', 'receivables-aging', 'suki', 'store-parameters'],
  },
  {
    id: 'credit-limit',
    title: 'Credit limits: a rule of thumb',
    section: 'selling',
    summary:
      "One production cycle of purchases the customer has already paid for in cash, capped by the store's credit budget, frozen when an invoice passes 60 days.",
    paragraphs: [
      "No Philippine source gives a limit formula; the anchors are the PHP 37,161 average input-dealer loan and the fact that informal lenders lend to people they know without collateral. The defensible default the app exposes: the limit is one production cycle of purchases the customer has already paid for in cash (a raiser who bought PHP 12,000 of feed a month for three months in cash may be given a PHP 12,000 line), capped at the store's credit budget (a fixed share of working capital), and reduced or frozen when any invoice passes the 61 to 90-day bucket. A referral by the municipal agriculture office or a cooperative can open a line without cash history. The customer record holds the limit and the app blocks a credit sale that would exceed it.",
    ],
    sources: [CREDIT, 'FK:5'],
    tags: ['selling', 'creditTermsDays'],
    related: ['credit-policy', 'receivables-aging', 'strategy-sell-8-credit-listahan'],
  },
  {
    id: 'bundles-and-starter-kits',
    title: 'Bundles and starter kits',
    section: 'selling',
    summary:
      'Sell the whole production cycle at once; a bundle discount cannot exceed the blended margin, so on feed-heavy kits it is 2 to 3 percent or a free high-margin item.',
    paragraphs: [
      "Feed manufacturers already sell programs rather than sacks (piglets plus feed with seminars; a distributor's starter-equity plus financed grower-finisher program) and the DA bundles seed with a fertilizer voucher for the same planting. Bundles that mirror a production programme (a chick starter pack of starter feed, vitamins-electrolytes and brooder disinfectant; a piglet starter kit of pre-starter and starter feed, iron and vitamins; a planting kit of seed, basal fertilizer, first top-dress and a pre-emergent herbicide) sell the whole cycle at once and lock in the follow-on purchases.",
      "Pricing rule (derived on illustrative margins): a chick starter pack of one sack at PHP 1,800 (5 percent, PHP 90) plus vitamins at PHP 150 (25 percent, PHP 37.50) has a blended margin of PHP 127.50 on PHP 1,950 (6.5 percent); a 3 percent discount leaves PHP 69, a 10 percent discount is a loss. Bundle discounts on feed-heavy kits should be 2 to 3 percent or a free high-margin item rather than a price cut. Pesticides in a bundle stay in the registrant's sealed pack. The Plan page's bundle recommendations use the feeding programs and crop inputs to size the kit.",
    ],
    sources: ['SS:Bundling and starter kits', 'PK:1.1', 'PK:1.3'],
    tags: ['selling', 'sell-10-bundles-and-starter-kits'],
    related: ['strategy-sell-10-bundles-and-starter-kits', 'broiler-feeding-program', 'hog-feeding-program', 'rice-inputs'],
  },
  {
    id: 'tingi-pricing',
    title: 'Tingi pricing: the cost floor of the per-kilo price',
    section: 'selling',
    summary:
      'Store-repacked tingi carries labour, packaging, weighing loss and spoilage, so the per-kg price sits about 5 percent above the sack-equivalent before any tingi margin.',
    paragraphs: [
      "The sachet economy shows how strong small-unit demand is (60 to 70 percent of shampoo sold in sachets in 2012), but that is manufacturer-packed tingi; store-repacked tingi carries the store's own labour, packaging, weighing loss and spoilage, so the per-kg price must sit above the sack-equivalent. What may not be repacked: pesticides and fertilizer without the licence (PD 1144 makes repacking a licensed activity), veterinary drugs (OTC products only in original packs); feeds and seeds carry no such prohibition beyond the labelling duties.",
      'Cost floor (derived): a 50 kg sack bought at PHP 1,710 and sold whole at PHP 1,800 (5 percent); shrink 1.6 percent leaves 49.2 saleable kilos; the sack-equivalent price is PHP 36.00 a kilo and the price that recovers the same PHP 90 from 49.2 kg is PHP 36.59 (1.6 percent above); packaging at PHP 1 a bag and five minutes of labour on a 5 kg sale add PHP 1.20 a kilo (3.3 percent); the floor is about 5 percent above the sack-equivalent, and anything charged above it is the tingi margin. The app stores the observed per-kg and per-sack prices as dated observations, computes the premium, and books the repack shortfall as a loss so the recorded shrinkage is what the per-kg price must recover.',
    ],
    sources: ['SS:Tingi (repack) pricing', 'SK:5', 'SS-106'],
    tags: ['selling', 'feed', 'sell-9-tingi-pricing', 'targetMarginPct'],
    related: ['strategy-sell-9-tingi-pricing', 'repacking-rules', 'markup-practice', 'price-display'],
  },
  {
    id: 'delivery-economics',
    title: 'Delivery service economics',
    section: 'selling',
    summary:
      "Per-sack delivery cost falls from PHP 66 to 24 as the drop grows from four to twenty sacks; free delivery is affordable only when the order's margin covers the trip.",
    paragraphs: [
      "The Lalamove rate card (September 2026) is the outsourcing benchmark for a store without a vehicle: motorcycle PHP 49 base plus PHP 6 a km for the first 5 km and PHP 5 after, up to 20 kg; sedan (200 kg) PHP 100 plus 18 and 15; pickup (800 kg) PHP 240 plus 20; L300 (1,000 kg) PHP 280 plus 20. Trips of 10 km: a motorcycle parcel PHP 104; a sedan with four sacks PHP 265 (PHP 66 a sack); an L300 with twenty sacks PHP 480 (PHP 24 a sack). Load matters more than radius. In the fertilizer chain transport is about 30 percent of the dealer's margin and 60 percent of the distributor's.",
      "Free-delivery threshold: trip cost divided by gross margin percent. With a PHP 265 trip and a 5 percent margin the order must reach PHP 5,300 (about three sacks) before delivery is free without loss; on a ten-sack order (margin PHP 900) the trip is 29 percent of the margin. Below the threshold charge the marginal trip cost (PHP 100 to 150 per drop within 10 km by motorcycle, PHP 250 to 300 by car) or batch drops on a fixed route day so several customers share a trip. Feeds are bulky and low-margin: delivery is the most common way a feed store loses its margin. The app's delivery trip cost parameter (default PHP 265) feeds the selling rule that flags a free delivery below the threshold.",
    ],
    sources: ['SS:Delivery service economics', 'SS-58', 'IS:8'],
    tags: ['selling', 'deliveryTripCost', 'sell-11-delivery-service'],
    related: ['strategy-sell-11-delivery-service', 'delivery-routine', 'selling-rules', 'store-parameters'],
  },
  {
    id: 'technical-service',
    title: 'Technical service as a differentiator',
    section: 'selling',
    summary:
      'A raiser who follows the feeding programme earned about 16 percent more per kilo; the store that relays the advice and hosts the supplier seminar captures the sale that goes with it.',
    paragraphs: [
      "Feed manufacturers sell technical service through their dealers: B-MEG promises its personnel's value-added technical services for shorter grow-out periods; Pilmico shares nutrition, biosecurity and farm-management guidance and paired its livelihood feed with seminars. The value is measurable: a Negros feeds distributor found the gap between the backyard liveweight price (PHP 95 a kg) and the farmgate price (PHP 110) came from incorrect feeding (mixing feeds, reducing the amount) and designed a feeding-plus-financing programme that lifted hog quality; that is 15.8 percent more revenue per kilo for the raiser who follows the programme, and the argument for selling a full programme instead of a sack. For crops, RCEF seed is distributed with extension and PhilRice publishes season-specific advice (typhoon-season varieties, synchronous planting); the store that relays it captures the input sale.",
      "Cost: staff time, the seminar venue and snacks; supplier technical staff usually come free when the store hosts. Revenue effect: no Philippine figure; record attendance and the attendees' purchases over the following 90 days to measure it.",
    ],
    sources: ['SS:Technical service as a differentiator'],
    tags: ['selling', 'sell-12-technical-service'],
    related: ['strategy-sell-12-technical-service', 'hog-feeding-program', 'rice-inputs'],
  },
  {
    id: 'seasonal-pushes',
    title: 'Seasonal pushes',
    section: 'selling',
    summary:
      'Seed, basal fertilizer and pre-emergent herbicide in the month before each planting peak; fungicide and molluscicide in the rains; finisher feed ahead of Christmas; conditioning lines before derbies.',
    paragraphs: [
      "Rice planting runs April to August (peak June to July) and September to February (peak November to December); RCEF seed rolls out March to September for the wet season and the fertilizer vouchers target the dry season. Seeds, basal fertilizer and pre-emergent herbicides sell in the month before each peak; top-dress and pesticides follow three to eight weeks after planting. Rainy season: typhoon and flood-tolerant seed, fungicides, molluscicides. Christmas and fiesta livestock: pork stocks build ahead of November and December, so a hog finished for December is on grower-finisher feed from August or September, and broiler chicks for December go in during early November. Derby season: the World Slasher Cup ran 26 January to 1 February and 19 to 25 May 2026, with regional derbies between; conditioning feeds, vitamins and the gamefowl veterinary line peak in the weeks before. The Plan page's seasonal rule reads the category indices to say what to stock next quarter.",
    ],
    sources: ['SS:Seasonal pushes', 'PM:3', 'PM:4', 'PM:6'],
    tags: ['selling', 'seasonalIndex', 'sell-13-seasonal-timing'],
    related: ['strategy-sell-13-seasonal-timing', 'crop-calendars', 'fiesta-and-christmas', 'derby-calendar', 'seasonal-indices'],
  },
  {
    id: 'payment-methods',
    title: 'Payment methods and merchant fees',
    section: 'selling',
    summary: "QR Ph costs 1 percent and is the only cashless method a feed store can absorb; cards at 3.2 to 3.5 percent eat most of a sack's margin.",
    paragraphs: [
      "Merchant discount rates in 2026: GCash for Business QR Ph 1.0 percent (VAT inclusive, auto-deducted, settled to the bank), Visa or Mastercard 3.2; Maya Business QR Ph 1.0, Maya QR 1.5, cards 3.5, a GCash wallet 2.0, checkout links the rate plus PHP 10 a transaction. GCash charges no setup or monthly fee unless the contract says so. On a PHP 1,800 sack with a PHP 90 margin, QR Ph costs PHP 18 (20 percent of the margin) and a card PHP 57.60 (64 percent): surcharge or refuse cards on feed. A customer's transfer to the owner's personal GCash carries no fee but is not a business account and does not settle to the bank; the app still records it as a GCash receipt. As a service line a GCash Pera Outlet earns 1 percent on cash-in, 2 on cash-out and about PHP 3 per bill payment.",
    ],
    sources: ['SS:Payment methods and merchant fees'],
    tags: ['selling', 'sell-15a-gcash-qr-ph'],
    related: ['strategy-sell-15a-gcash-qr-ph', 'other-lines', 'markup-practice'],
  },
  {
    id: 'social-selling',
    title: 'Social selling: Facebook, Messenger and Marketplace',
    section: 'selling',
    summary:
      'A page plus Messenger ordering reaches nearly every farming household with a phone; fertilizer and pesticides may be advertised online but handed over only at the licensed store.',
    paragraphs: [
      'Facebook had 90.8 million Philippine users in January 2025 (78 percent of the population) and Messenger 61.8 million. The FPA states that online selling of fertilizers and pesticides has never been authorized and its 2026 circular revokes it: products can be advertised, but the sale and hand-over of regulated inputs must happen through the licensed store, not a courier from a platform. Feeds, seeds, tools and pet supplies carry no such restriction. Small-store digitisation is growing (175,000 sari-sari stores on one ordering app in 2024). The app records an order source (walk-in, Messenger, phone, Marketplace) on every sale to report conversion and delivery cost per channel.',
    ],
    sources: ['SS:Social selling: Facebook pages, Messenger orders, Marketplace'],
    tags: ['selling', 'sell-15-channels'],
    related: ['strategy-sell-15-channels', 'delivery-economics', 'fpa-dealer-licence'],
  },
  {
    id: 'program-tie-ups',
    title: 'Cooperative and government programme tie-ups',
    section: 'selling',
    summary:
      'Fertilizer vouchers are credit sales to the government redeemed at accredited merchants; RCEF displaces retail inbred seed; a cooperative contract is volume at a thin margin from one slow payer.',
    paragraphs: [
      "Fertilizer discount vouchers: about a million rice farmers received them in 2021, redeemable at accredited merchants, PHP 1,131 per hectare for inbred seed recipients and 2,262 for hybrid (PHP 2,000 and 3,000 in Ilocos); the 2022 to 2023 dry-season vouchers were shifted to urea for RSBSA-registered farmers with two hectares or less. The cash-flow risk: the DA owed Ilocos merchants PHP 100 million in December 2021 after one merchant's incomplete claim held up the whole batch. Voucher sales are credit sales to the government: the store finances the stock until reimbursement and files claims exactly, and an accredited store captures the voucher sales in the planting month while a non-accredited one loses them.",
      'RCEF certified seed is free to registered farmers each season (1.8 million bags in the 2022 wet season), so in RCEF provinces the store sells the fertilizer, crop protection and non-rice seed around the free seed, and hybrid seed for the dry season. Cooperatives lent 36 percent of formal farm loans at 7.4 percent and sell to members on after-harvest credit; an input distributor tied its financed feeding programme to meat-shop buyers to guarantee repayment. A supply contract with a cooperative gives volume at a thin margin and a single, slower payer.',
    ],
    sources: ['SS:Cooperative and LGU program tie-ups', 'PM:12'],
    tags: ['selling', 'sell-15-channels', 'sell-15b-financed-feeding-programme', 'fertilizer', 'seed'],
    related: ['strategy-sell-15-channels', 'strategy-sell-15b-financed-feeding-programme', 'subsidy-programs', 'cooperatives'],
  },
  {
    id: 'reseller-tiers',
    title: 'Reseller tiers: sub-dealers and sari-sari stores',
    section: 'selling',
    summary:
      "Supplying sub-dealers means taking the distributor's place on a fixed peso margin; it pays on fertilizer only when the store buys at distributor prices.",
    paragraphs: [
      "Each tier of the fertilizer chain works on a fixed peso margin per bag: the distributor PHP 30 to 50 (average 40), the dealer PHP 10 to 80 (average 35, net about 14) in 2021; in 2013 the dealer markup was PHP 30, the distributor's 50 to 60, the importer's 3 percent; distributors cannot raise the markup without losing buyers to adjoining provinces. A store that supplies sub-dealers is taking the distributor's place: its reseller price must leave the sub-dealer the PHP 30 to 35 dealer margin, so reseller sales on fertilizer only pay if the store buys at distributor or importer prices, or earns on delivery and credit. Sari-sari stores buying feed to resell in tingi are a volume channel for feeds where the tingi premium is the sub-dealer's margin. The app tags a customer as a reseller and carries a reseller price per product.",
    ],
    sources: ['SS:Reseller tiers (sub-dealers, sari-sari stores buying to resell)', 'IS:8'],
    tags: ['selling', 'sell-15-channels'],
    related: ['strategy-sell-15-channels', 'margins-by-tier', 'strategy-buy-6-direct-and-pooled'],
  },
  {
    id: 'markup-practice',
    title: 'Pricing and markup practice by line',
    section: 'selling',
    summary:
      "Fertilizer is a traffic line at 3 to 4 percent gross and 1 to 2 net on a fixed peso per bag; every other line's margin is the store's own record.",
    paragraphs: [
      'Sourced margins exist only for fertilizer: the urea dealer markup PHP 30 a bag on a PHP 1,090 price in 2013 (2.8 percent, fixed even in the 2008 spike); six dealers in Regions I and III in 2021 at PHP 10 to 80, average 35 on a 995 purchase price (3.5 percent), net about 14 (1.3 percent), labour and transport 30 percent each of the gross; the distributor at PHP 40 on 926 (4.3 percent); the FPA matrix imputing 8 percent profit per tier as a policy ceiling. Dealers use rule-of-thumb pricing, a fixed margin per bag, and the fixed margin earns only because turnover is rapid. Fertilizer is thus a traffic line: several turns a season at 3 to 4 percent gross.',
      "For feeds, seeds, agrochemicals and veterinary products no percentage margin was found in a fetchable source; the plan's working figures of 3 to 8 percent on feeds and 10 to 25 on agrochemicals remain unverified. The app holds the target gross margin per category as a store parameter, seeded only with the fertilizer 3.5 percent, bounded on screen by that floor and the 25.05 percent sector average as the ceiling, and computes the realised margin from weighted average cost against sales. Record the dealer price list and the counter price on the first purchase so the observed margins replace the defaults.",
    ],
    sources: ['SS:Pricing and markup practice by line', 'FK:3', 'SS-106', 'FK-16'],
    tags: ['selling', 'targetMarginPct', 'gross-margin-pct', 'fertilizer'],
    related: ['gross-margin', 'margins-by-tier', 'suki', 'tingi-pricing', 'store-parameters'],
  },
  {
    id: 'price-display',
    title: 'Price display and the Consumer Act',
    section: 'selling',
    summary:
      'Every product on display needs a price tag in pesos and centavos, sold at that price to all buyers; suki discounts are discounts from the tag, tingi needs its own price list.',
    paragraphs: [
      'The Consumer Act makes it unlawful to offer a consumer product for retail sale without a price tag, label or marking publicly displayed, forbids selling above the tagged price, requires the same price to all buyers without discrimination, prices in pesos and centavos, no erasures; a price list at the display point suffices for small items; first offence PHP 200 to 5,000 or one to six months. The FPA additionally pushes price tags on fertilizer. Consequences: suki discounts are lawful as discounts from the displayed price, not as a lower tag for some buyers; tingi per-kg prices need their own displayed list; every price change means a new tag or list, which the app prints. No Philippine study of 9-ending pricing in agri retail exists; the app allows round and 9-ending display prices and records which the store uses.',
    ],
    sources: ['SS:Price display and psychological pricing', 'RT:5.2'],
    tags: ['selling'],
    related: ['consumer-act', 'markup-practice', 'tingi-pricing'],
  },
]
