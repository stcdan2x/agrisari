import type { GuideTopic } from '../guide'

// Demand drivers, calendars and price histories from
// research/philippine-market-and-seasonality.md (PM). Prices are dated observations.
export const MARKET_TOPICS: GuideTopic[] = [
  {
    id: 'demand-drivers',
    title: 'Demand drivers: hog and poultry inventory, farm types and cycles',
    section: 'market',
    summary:
      'The hog herd is 30 percent below 2019 and 79 percent backyard; chickens keep growing but broilers and layers are commercial; the retail customer is the small raiser.',
    paragraphs: [
      'Swine inventory has not recovered from ASF: 12.7 million head in January 2019, 8.9 million in July 2026, with commercial farms down 60 percent, so smallhold farms now hold 79 percent of the herd. The DA aims to restore about 13 million head by 2028. For an agrivet the hog feed customer base is overwhelmingly backyard raisers buying by the bag, still shrinking on the commercial side. Chicken inventory grew to 228 million in July 2026, driven by commercial layers and broilers: smallhold farms hold 39 percent of chickens but 1 percent of broilers and layers, while native chickens are 99.9 percent smallhold and gamefowl 82 percent. The retail broiler feed customer is a raiser of a few hundred birds; retail poultry feed volume is native chickens, gamefowl and small layer flocks.',
      'Cycles set how far ahead feed is bought: broilers grow 28 to 35 days to 1.45 to 2.0 kg, layers are kept about 100 weeks, native chickens 150 to 180 days; hog fattening of about five to six months is the working assumption. Slaughter volume peaks in the fourth quarter (hog index 1.074, chicken 1.077, eggs 1.036), so feed demand is pulled into the third and fourth quarters. Feed is 60 percent of broiler production cost and 52 to 64 percent of hog cost, up to 80 percent for backyard farms.',
    ],
    sources: ['PM:1', 'IS:6'],
    tags: ['feed', 'hog', 'broiler', 'layer', 'gamefowl', 'seasonalIndex'],
    related: ['integrators', 'disease-status', 'seasonal-indices', 'fiesta-and-christmas'],
  },
  {
    id: 'fiesta-and-christmas',
    title: 'Fiesta, Holy Week and Christmas: timing and lead times',
    section: 'market',
    summary:
      'Pork and chicken demand peaks in November and December; farmgate hog prices are strongest in March to June; chicks for Christmas go in early November, piglets in June to July.',
    paragraphs: [
      'Pork demand peaks in November and December, Lunar New Year adds demand, and pork prices typically decline in March during Holy Week; Metro Manila retail pork rose 11 percent between Christmas 2024 and late January 2025. Farmgate hog liveweight is highest in March to June (index 1.026 to 1.039) and lowest in September and October (0.954), rising into December; slaughter volume peaks in the fourth quarter: raisers stock and grow in the third quarter for the fourth-quarter sale.',
      'Lead times for the store: broilers for the Christmas table start 28 to 35 days before sale, so chick and starter demand begins in the first half of November and finisher runs to mid-December; for a May fiesta, chicks go in late March to April. Hogs at five to six months: piglets for December are bought in June to July, grower feed peaks August to October, finisher October to December. Layers respond to the egg price, which peaks in the fourth quarter and dips in April to June.',
    ],
    sources: ['PM:3', 'PM:11'],
    tags: ['feed', 'hog', 'broiler', 'layer', 'seasonalIndex'],
    related: ['demand-drivers', 'seasonal-pushes', 'broiler-feeding-program', 'hog-feeding-program'],
  },
  {
    id: 'crop-calendars',
    title: 'Crop calendars by region: when seed, fertilizer and pesticide are bought',
    section: 'market',
    summary:
      'Rice plants April to August and September to February with peaks in June to July and November to December; corn follows the May rains; cool-season vegetables October to January.',
    paragraphs: [
      'Rice (national): the wet-season planting window is April to August with the peak in June to July; the dry-season window September to February with the peak in November to December; windows exceed 100 days in most regions. Seed purchases cluster in May to July and October to December; basal fertilizer (complete, ammophos) is bought at planting and urea top-dress three to six weeks later. Corn: Cagayan Valley plants the wet-season crop in May and the dry-season crop in October to November; Western Visayas and Northern Mindanao start with the May rains with a lean second quarter; Davao plants most in the third and fourth quarters; Caraga is wet all year with a fourth-quarter peak. The dry-season corn harvest peaks April to May, the wet-season harvest June to October.',
      'Region types the app uses for the planting-calendar defaults: Luzon (rice wet season May to July, dry season November to January; corn May to June and October to November); Visayas (rainfed corn and rice from the May rains, second crop September to October, second quarter lean); Mindanao (rain onset May, main crop May to July, second crop October to December; Caraga and the eastern seaboard year-round with a fourth-quarter peak). Vegetables: cabbage, Chinese cabbage, carrot, potato and squash October to January; tomato January to May and September to October; ampalaya, eggplant, okra, sitao and snap bean all season.',
    ],
    sources: ['PM:4', 'PM:11'],
    tags: ['seed', 'fertilizer', 'pesticide', 'rice', 'corn', 'vegetables', 'seasonalIndex'],
    related: ['rice-inputs', 'corn-inputs', 'vegetable-inputs', 'seasonal-pushes', 'seasonal-indices', 'strategy-buy-6a-seasonal-cover'],
  },
  {
    id: 'rainy-season-pests',
    title: 'Rainy-season pest and disease demand',
    section: 'market',
    summary:
      'Brown spot, stem borer, blast, sheath blight and tungro in the wet season put fungicide, insecticide and molluscicide demand in July to September, herbicide two to three weeks after each planting.',
    paragraphs: [
      "PhilRice's wet-season alerts name brown spot, deadheart and whitehead (stem borer), leaf blast and sheath blight, with losses of 15 percent or more unmanaged; the inputs recommended are quality seed, potassium-rich fertilizer and fungicide for brown spot, nitrogen management for blast and sheath blight, and no insecticide for 30 to 40 days after planting to protect beneficial insects. Bacterial leaf blight, blast, sheath blight and tungro are prevalent in the rains; chemical control of bacterial leaf blight is not economical, resistant varieties are (PSB Rc10 for blast, Rc242 for blight, Rc120 for tungro). Pests thrive in the cloudy, rainy wet season and PhilRice promotes synchronized planting to reduce build-up.",
      'For the store: fungicide (mancozeb, tricyclazole types), insecticide (stem borer, planthopper) and molluscicide demand in July to September for the wet-season rice crop, a second smaller wave in December to February for the dry-season crop, and herbicide (butachlor, pretilachlor, 2,4-D, glyphosate) in the two to three weeks after each planting peak. The pesticide category index is 1.35 in the third quarter.',
    ],
    sources: ['PM:5', 'PM:11', 'PK:2.4'],
    tags: ['pesticide', 'rice', 'seasonalIndex'],
    related: ['pesticide-classes', 'crop-calendars', 'seasonal-indices', 'counter-pesticides'],
  },
  {
    id: 'derby-calendar',
    title: 'Gamefowl derby calendar',
    section: 'market',
    summary:
      'The World Slasher Cup runs in late January and May; the stag season is September to November; conditioning lines sell three to four months before each.',
    paragraphs: [
      'The World Slasher Cup ran 26 January to 1 February 2026 (over 300 breeders) and 19 to 25 May 2026 (over 275 entries); the FIGBA National Bakbakan stag derby runs in early October with eliminations in Camarines Sur, Ilocos Norte and Laguna and 267 derby schedules nationwide in a year; the National Cockers Alliance held stag derbies in late October and early November. Gamefowl inventory is 9.4 to 10 million birds, 82 percent smallhold; the farmgate price for gamefowl averaged PHP 6,265 to 7,418 a head in 2023 to 2025. Derived pattern: stag derbies September to November, the big cock derbies January to February and May, so conditioning feed, vitamins and supplements sell from three to four months before each (June to August; October to December; February to April). The gamefowl category index is 1.10 in the first quarter. Sabong-related sales are legal-status sensitive.',
    ],
    sources: ['PM:6', 'PM:11'],
    tags: ['feed', 'gamefowl', 'vitamin', 'seasonalIndex'],
    related: ['gamefowl-feeding-program', 'seasonal-pushes', 'seasonal-indices', 'counter-gamefowl'],
  },
  {
    id: 'feed-prices',
    title: 'Feed prices and their drivers',
    section: 'market',
    summary:
      "No official retail feed series exists; one miller's prices rose 8 percent a year from 2020 to 2024; corn, soybean meal, wheat and the peso drive the cost.",
    paragraphs: [
      "The PSA publishes no retail feed price series. Vitarich's filings give the trend: selling prices up 3 percent in 2021, 18 in 2022 (inputs up 23), 16 in 2023, down 3 in 2024, a modest decline in 2025; a cumulative index of 137 on 2020, about 8 percent a year. Level observations: the DA-BAI 2021 broiler cost table values feed at PHP 26.88 a kilo; an online listing of B-MEG Premium Grower at PHP 2,515 in September 2026 is an upper bound because platform prices include fees and shipping. The industry statement that \"PHP 1 a kilo or PHP 50 a bag\" equals 2.5 percent implies a PHP 2,000 sack. Record the dealer list price and the counter price on the first purchase: the app's price log is the store's own series.",
      'Drivers: yellow corn farmgate averaged PHP 13.98 a kilo in 2021, 17.89 in 2023, 14.86 in 2025 and rose from 17.25 in January to 19.06 in June 2026; feed millers switch between local corn, imported corn and feed wheat on price. World maize averaged USD 203 a tonne in 2025, soybean meal 366, wheat 243, fish meal 1,706; the peso averaged 57.51 to the dollar in 2025 and 60.36 in January to August 2026, and with wheat, soybean meal and corn about 70 percent of feed cost and roughly half imported, a 5 percent depreciation lifts feed cost by about 1.5 to 2.5 percent if passed through, a sensitivity rather than a forecast. Corn is seasonally highest in the second quarter (index 1.035 in June) and lowest in October to December.',
    ],
    sources: ['PM:7', 'PM:11', 'BS:5.1'],
    tags: ['feed', 'feedIngredient'],
    related: ['price-signals', 'strategy-buy-2-forward-buying', 'markup-practice', 'price-disclaimer'],
  },
  {
    id: 'fertilizer-prices',
    title: 'Fertilizer prices by grade, 2010 to 2026',
    section: 'market',
    summary:
      'Urea was flat around PHP 1,700 from 2024 to January 2026, jumped 55 percent to PHP 2,629 by June 2026 and eased to 2,373 by August; prices differ by a third between regions.',
    paragraphs: [
      'PSA dealer prices (annual, per 50 kg bag): urea PHP 981 in 2010, 1,296 in 2012, 913 in 2017, 1,140 in 2019; complete 14-14-14 PHP 1,083 to 1,270; ammosul 544 to 766. The FPA weekly reports from 2024: urea prilled 1,704 in January 2024, 1,620 in January 2025, 1,694 in January 2026, then 2,461 in April, 2,567 in May, 2,629 in early June and 2,373 in late August 2026; complete moved from 1,656 to 1,941 and back to 1,886; ammosul 831 to 1,259 to 1,217; DAP 2,768 to 3,103; MOP fell from 2,265 to about 1,650. The world market explains the jump: World Bank urea USD 415 in January 2026, 857 in April, 400 in July, with crude oil from 64 to 104 dollars a barrel and a diesel spike in March. The 2022 spike is the precedent; retail followed with a one to three month lag and gave back about a third of the rise within four months.',
      'Seasonality of retail fertilizer prices is weak: the PSA monthly index drifts within plus or minus 1.5 percent over the year, so timing is about world price and freight, not the planting calendar; demand, not price, is seasonal. Regional spread in the same week (August 2026, urea): Region III 2,105 lowest, Region IX 2,826 highest (plus 34 percent), Nueva Ecija 1,950 against Nueva Vizcaya 2,599; freight and dealer density explain most of it.',
    ],
    sources: ['PM:8', 'PM:11', 'PM:13', 'BS:5.2'],
    tags: ['fertilizer'],
    related: ['fertilizer', 'price-signals', 'strategy-buy-2-forward-buying', 'regional-differences', 'price-disclaimer'],
  },
  {
    id: 'pesticide-prices',
    title: 'Pesticide dealer prices',
    section: 'market',
    summary:
      "The PSA farm-chemicals series ends in 2018 (cypermethrin PHP 396, glyphosate 438, mancozeb 532); the FPA weekly sheet gives 2024 observations; the store's own log takes over.",
    paragraphs: [
      "The PSA dealer price tables run to 2018 for usable years: cypermethrin (Cymbush) PHP 350 in 2015 to 396 in 2018, lambda-cyhalothrin (Karate) 923 to 1,039, malathion about 300, butachlor (Machete) 526 to 569, glyphosate (Round-up) 420 to 438, mancozeb (Dithane) 560 to 532, cartap 1,451 to 1,706, methomyl (Lannate) 1,753 to 2,141; pack size is not stated. Stable liquids rose 1 to 4 percent a year. Monthly values swing with a thin sample, so no monthly index is computed; pesticide demand follows the crop calendar, not price. The FPA weekly fast-mover sheet of May 2024 gives regional observations (Cymbush PHP 460 to 490 a litre, Karate 795 to 970, Machete 540 to 680, Dithane 200 to 250 per 250 g); after that the store's own purchase records and the price log are the series.",
    ],
    sources: ['PM:9', 'PC:5.2'],
    tags: ['pesticide'],
    related: ['pesticides', 'pesticide-classes', 'price-disclaimer'],
  },
  {
    id: 'customer-income-prices',
    title: 'The prices that drive customer income',
    section: 'market',
    summary: 'Hog liveweight, broiler, egg, palay and corn farmgate prices say when raisers and farmers have cash and when they need credit.',
    paragraphs: [
      "PSA farmgate annual averages: hog liveweight PHP 121 a kilo in 2018, 167 in 2021, 200 in 2025 and 172 in the first half of 2026 (19 percent below the same months of 2025 while pork imports rose 10 percent); broiler 89 to 126; eggs 4.85 to 7.00 a piece; palay 20.06 in 2018, 23.48 in the 2024 spike, 17.70 in 2025, 22.25 in 2026; yellow corn 13.72 to 17.89. The backyard panel sells hogs at about an 18 percent discount to the establishment price. Hog prices peak in March to June; palay is seasonally lowest in October to November (the wet-season harvest) and highest in April to August: rice farmers have cash at harvest and need credit at planting, which is the timing of the store's listahan exposure. The NFA buys palay at PHP 17 to 23 fresh and 23 to 30 dry, above farmgate.",
    ],
    sources: ['PM:10', 'PM:11'],
    tags: ['hog', 'broiler', 'layer', 'rice', 'corn'],
    related: ['credit-policy', 'demand-drivers', 'seasonal-indices'],
  },
  {
    id: 'seasonal-indices',
    title: 'Seasonal indices: how the app spreads demand over the year',
    section: 'market',
    summary:
      "Quarterly demand indices per category, built from the slaughter, planting and derby calendars, replaced by the store's own history after its first year.",
    paragraphs: [
      "A seasonal index is the month's (or quarter's) value divided by the year's mean, averaged over the years listed; 1.000 is an average period. Supply-side indices from PSA and World Bank series: yellow corn farmgate Q2 1.024 high and Q4 0.979 low; palay Q4 0.961 low; hog farmgate Q2 1.032, Q3 0.969; broiler Q3 to Q4 1.02; eggs Q4 1.037, Q2 0.961; PSA urea flat within 1.5 percent; world urea Q4 1.094 and Q2 0.927.",
      "Demand-side indices by store category, the app's defaults in the store parameters (quarters Q1 to Q4, summing to 4.00): hog and poultry feed 0.97, 0.96, 0.99, 1.07 (the only row that is sourced arithmetic, from the slaughter volume index); rice and corn seed 0.75, 1.35, 0.70, 1.20; fertilizer 0.85, 1.25, 0.80, 1.10; pesticide 0.85, 0.90, 1.35, 0.90; herbicide 0.80, 1.25, 0.85, 1.10; vegetable seed 1.10, 0.85, 0.80, 1.25; gamefowl feed and supplements 1.10, 1.05, 0.90, 0.95. The calendar-based rows are the weakest numbers in the research and should be replaced by the store's own sales history after the first year; the projection multiplies the ramp curve by them and the Plan page's seasonal rule reads them.",
    ],
    sources: ['PM:11', 'PM-127'],
    tags: ['seasonalIndex', 'feed', 'seed', 'fertilizer', 'pesticide'],
    related: ['projection-method', 'store-parameters', 'seasonal-pushes', 'crop-calendars', 'demand-drivers'],
  },
  {
    id: 'subsidy-programs',
    title: 'Input subsidy programmes that displace or add to retail demand',
    section: 'market',
    summary: 'Fertilizer vouchers are redeemed at accredited dealers; RCEF gives inbred rice seed free; NFA palay buying and fuel support prop up farmer cash.',
    paragraphs: [
      'Fertilizer discount vouchers (2021 to 2023): PHP 2,000 to 3,000 per hectare for RSBSA-registered rice farmers who received DA seed, redeemable at accredited merchants who claim reimbursement through DBP (93 percent of PHP 2.78 billion claimed by mid-2021); PHP 1,131 per hectare for urea in the 2022 wet season. An accredited store captures the voucher sales in the planting month, paid with a lag; a non-accredited one loses those bags. RCEF certified inbred seed is free to registered farmers each season, now funded at PHP 30 billion a year to 2031 with PHP 6 billion for seed: it displaces retail inbred seed in the wet season and leaves hybrid rice seed (dry season), corn and vegetable seed as the commercial lines. NFA palay procurement at PHP 17 to 30 a kilo and the PHP 150 million fuel support after the March 2026 diesel spike support farmer cash flow.',
    ],
    sources: ['PM:12', 'SS:Cooperative and LGU program tie-ups'],
    tags: ['fertilizer', 'seed', 'rice'],
    related: ['program-tie-ups', 'seeds', 'fertilizer', 'strategy-sell-15-channels'],
  },
  {
    id: 'regional-differences',
    title: 'Regional differences that matter for a provincial store',
    section: 'market',
    summary:
      "Fertilizer differs by a third between regions in the same week; Luzon has one dry season, Mindanao's rain starts in May, Caraga is wet all year; the ASF map changes monthly.",
    paragraphs: [
      "Prices: urea PHP 2,105 in Region III against 2,826 in Region IX in the same August 2026 week, and 1,950 in Nueva Ecija against 2,599 in Nueva Vizcaya; freight and dealer density explain most of it, and a store's fertilizer cost depends on its region more than on its negotiating skill. Feed millers are expanding distribution in the Visayas and Mindanao, and Mindanao corn is shipped to Luzon mills. Calendars: Luzon has a marked dry season and one main rainfed crop; Mindanao's rain starts in May; Caraga is wet all year. Livestock: the ASF map changes monthly and a store's hog feed demand depends on its province's zoning status. Gamefowl: the stag eliminations ran in Camarines Sur, Ilocos Norte and Laguna, where the breeder base is. The app carries the region on the store record for the planting calendar and lets the owner edit the seasonal indices.",
    ],
    sources: ['PM:13', 'PM:8', 'IS:2'],
    tags: ['fertilizer', 'feed', 'seasonalIndex'],
    related: ['fertilizer-prices', 'crop-calendars', 'location-factors', 'disease-status'],
  },
]
