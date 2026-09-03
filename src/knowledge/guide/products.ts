import type { GuideTopic } from '../guide'

// Product knowledge by category, species and crop, compiled from
// research/product-catalog-and-categories.md (PC) and
// research/product-knowledge-for-counter-advice.md (PK), with the licence and tax rules of
// research/regulations-permits-and-tax.md (RT) and the storage rules of
// research/storekeeping-and-inventory-practice.md (SK). Every category of the catalog is
// tagged by its topic; the feeding programs and crop inputs carry the arithmetic the counter
// and the bundle recommender use.
export const PRODUCT_TOPICS: GuideTopic[] = [
  {
    id: 'feeds',
    title: 'Commercial feeds',
    section: 'products',
    summary:
      'Stage-based lines per species in 50 kg sacks, VAT-exempt except specialty feeds, sold under the BAI feed licence, with a 30 to 40 day shelf life.',
    paragraphs: [
      'Every major miller sells a stage-based line per species in a premium and a value tier, in 50 kg polypropylene sacks, with young-animal feeds in 25 kg and 1 kg packs. The stage names printed on the sack are the ones suki use when ordering: booster, pre-starter, starter, grower, finisher and the sow feeds for hogs; chick booster, starter and finisher for broilers; booster, starter, grower, pre-lay and two layer phases for layers; booster, developer, maintenance and conditioning for gamefowl; layer pellets for ducks and quail; concentrates for goats and cattle; fry mash to finisher pellet for tilapia. The brands a provincial counter meets are B-MEG, Pigrolac and Sarimanok (UNAHCO), Pilmico and Vitarich.',
      "Licence and label. Feeds are regulated by the BAI under RA 1556: a retailer needs a BAI licence to operate as a feed establishment and every product needs a certificate of feed product registration. Every package carries a label with net weight, brand, manufacturer, minimum protein and fat, maximum fibre and moisture, and the ingredients. Selling by the kilo out of a sack is universal practice and is not prohibited for a retailer, but the store should keep the sack label and the lot on view; formally, a store that opens sacks is a feed repacker and needs the manufacturer's written authorization.",
      'Tax. Livestock and poultry feeds and their ingredients are VAT-exempt under NIRC section 109(1)(B). The exception is specialty feed: gamefowl (fighting cock), pet, aquarium fish and racehorse feeds are VATable at 12 percent, so a Thunderbird or Salto sack is a feed for the BAI and a VATable sale for the BIR. The app carries a VAT-exempt flag per product with the category default, and a gamefowl line overrides it.',
      'Shelf life and storage. The B-MEG guides print 30 to 40 days; the app gives a feed lot received without a date an expiry 40 days after receipt. Compounded feed keeps one to two months in Philippine heat and humidity, 60 days in the rainy season and 90 in the dry season when it is under 14 percent moisture. Store sacks on pallets in small stacks off the walls, oldest first; refuse damp or mouldy deliveries at the door.',
    ],
    sources: ['PC:1.1', 'PC:1.6', 'PC:10', 'RT:2.3', 'RT:4.1', 'SK:2.2', 'SK:2.3'],
    tags: ['feed', 'baiFeed'],
    related: [
      'hog-feeding-program',
      'broiler-feeding-program',
      'layer-feeding-program',
      'gamefowl-feeding-program',
      'feed-storage',
      'bai-feed-licence',
      'vat-exemption',
    ],
  },
  {
    id: 'feed-ingredients',
    title: 'Feed ingredients sold at retail',
    section: 'products',
    summary:
      'Rice bran, corn, copra meal, soybean meal, fish meal, molasses, salt and limestone, by the sack and by the kilo, for raisers who mix their own ration.',
    paragraphs: [
      'Backyard raisers buy single ingredients by the sack and by tingi kilo to mix their own ration. The Philippine National Standard for feed ingredients sets the trade grades that appear on labels and price boards: rice bran D1 or cono (minimum 11 percent protein, maximum 7 percent fibre, minimum 12 percent fat), rice bran D2 or kiskis (9 percent protein, 12 percent fibre), yellow or white corn whole or cracked, copra cake or meal (18 to 20 percent protein), soybean meal (43 or 46 percent protein), local fish meal in grades of 45 to 60 percent protein, plus molasses, salt, limestone and branded premixes and concentrates.',
      'Rice bran is the ingredient that spoils first: it is oily and turns rancid, and the standard requires a fresh odour, not rancid or musty. Keep D1 turnover to weeks, not months; the app gives feed ingredients a 30-day lot life. The ingredients listed on commercial hog and poultry sacks (ground corn, soybean meal, fish meal, wheat pollard, rice bran, copra meal, molasses, limestone, salt, lysine, methionine) are the same items a backyard mixer buys, so the store can stock them as a set.',
      "Tax. Ingredients used in the manufacture of finished feeds are VAT-exempt with the feeds. RMC 55-2014 adds a condition for ingredients that could also feed people: corn grits, rice bran, copra meal and soybean meal sold as such are exempt only with the manufacturer's or supplier's certification that the grade is feed grade, unfit for human consumption. Keep that certificate with the supplier record.",
    ],
    sources: ['PC:2', 'RT:4.1', 'SK:2.2'],
    tags: ['feedIngredient', 'baiFeed'],
    related: ['feeds', 'feed-storage', 'vat-exemption'],
  },
  {
    id: 'seeds',
    title: 'Seeds: rice, corn and vegetables',
    section: 'products',
    summary:
      'Certified rice seed in 20 kg tagged bags, hybrid corn in 9 kg bags, vegetable seed in foil packets; VAT-exempt, sold under seed dealer registration.',
    paragraphs: [
      'Rice. Seed classes under RA 7308 are breeder, foundation, registered and certified, each the progeny of the class above, certified by BPI-NSQCS. Certified seed must have at least 80 percent germination (PhilRice asks 85) and at most 14 percent moisture; the bag carries the variety, lot number, date of harvest and net weight, and a blue certified tag. Certified inbred seed is sold in 20 kg bags; PhilRice recommends 40 kg per hectare transplanted and 60 to 80 kg direct-seeded, though many farmers still use 100 to 150 kg. Hybrid rice (SL-8H, SL-18H, Corteva hybrids) comes in smaller packs at about 20 kg per hectare. In RCEF provinces registered farmers get inbred seed free each season, so the commercial rice seed line is hybrid seed for the dry season.',
      "Corn. Hybrid and GM corn seed is packed in 9 kg bags, one bag per half hectare, at PHP 4,700 to 6,000 per bag in the 2021 Isabela dealer sample; open-pollinated white or yellow corn in 18 kg bags for one hectare at about PHP 2,500. Pioneer PowerCore hybrids carry a refuge rule (5 percent of the field planted with the non-Bt refuge seed). Processed hybrid seed keeps about one year in the seed company's controlled storage; treat that as the shelf life.",
      "Vegetables. East-West Seed, Allied Botanical and Ramgo sell hybrid and open-pollinated packets (F1 packs around PHP 180, OPV packs PHP 60 to 80 in 2026 listings); pack weight per variety is not published and stays a user-entered attribute. Foil packets at 5 to 7 percent moisture survive a shop shelf; open bags of rice seed do not. Store the packet's date tested and treat viability as per-lot data.",
      'Licence and tax. A seed dealer registers under the RA 7308 seed control rules; the dealer-specific fee was not reachable, the nearest analogue being PHP 500 for three years. Seeds and seedlings are VAT-exempt. Sell certified rice and corn seed only in the sealed tagged bag: a split bag loses its certification.',
    ],
    sources: ['PC:3.1', 'PC:3.2', 'PC:3.3', 'PC:10', 'RT:2.2', 'SK:3', 'SK:5'],
    tags: ['seed', 'seedDealer'],
    related: ['rice-inputs', 'corn-inputs', 'vegetable-inputs', 'seed-storage', 'seed-dealer-registration', 'subsidy-programs'],
  },
  {
    id: 'fertilizer',
    title: 'Fertilizers',
    section: 'products',
    summary:
      'The six FPA-monitored grades in 50 kg bags plus foliar packs; VAT-exempt, sold under the FPA dealer licence, tingi only as a licensed dealer-repacker.',
    paragraphs: [
      'Grades. The FPA monitors six major grades weekly per 50 kg bag: urea prilled and granular 46-0-0, ammonium sulfate (ammosul) 21-0-0, complete 14-14-14, ammophos 16-20-0, muriate of potash 0-0-60 and DAP 18-46-0. Atlas, Amigo, Ranger and the other branded grades add blends for basal and top-dress use; foliar and water-soluble fertilizers (Grow More 20-20-20 and the like) come in kilo and litre packs. Organic fertilizers are regulated by BAFS under RA 10068, not by the FPA.',
      "Margin. Fertilizer is a traffic line priced by a fixed peso markup per bag: the 2021 field data put the dealer gross margin at PHP 10 to 80 per urea bag, average PHP 30 to 35, net about PHP 14 after labour and transport; the app's default target margin of 3.5 percent comes from that. Customers pick brands on price, hold at a PHP 10 to 20 gap and shop around at PHP 50, which is why a second brand and the buying price matter more than the selling price.",
      'Licence, repacking and tax. Retailing fertilizer needs the FPA licence to operate as dealer (PHP 1,800, three years) with an Accredited Safety Dispenser on staff. Tingi is legal only under the separate dealer-repacker licence: repacking into 1, 2 and 5 kg packs with the FPA label, the whole 50 kg bag repacked at once, never kept open and scooped as needed. Fertilizer sale is VAT-exempt.',
      'Storage. No expiry is printed; quality loss is physical. Urea starts absorbing water above 72.5 percent relative humidity at 30 C and the wet season runs at 80 to 90 percent, so every open bag cakes. Keep bags dry, off the floor, apart from feed, and FEFO by bag condition rather than date. The app gives fertilizer no expiry warning.',
    ],
    sources: ['PC:4.1', 'PC:4.2', 'PC:10', 'SS:Pricing and markup practice by line', 'RT:2.1', 'SK:4.3'],
    tags: ['fertilizer', 'fpaDealer', 'fpaDealerRepacker', 'targetMarginPct'],
    related: ['rice-inputs', 'fertilizer-prices', 'fpa-dealer-licence', 'fertilizer-repacking', 'strategy-buy-2-forward-buying'],
  },
  {
    id: 'pesticides',
    title: 'Pesticides',
    section: 'products',
    summary:
      "FPA-registered insecticides, herbicides, fungicides, molluscicides and rodenticides in the registrant's pack, VATable, never repacked, with a toxicity colour band.",
    paragraphs: [
      'What sells. The FPA weekly fast-mover sheet is the best public list of what provincial dealers sell: cypermethrin and lambda-cyhalothrin insecticides (Cymbush, Karate, Magnum, Bullseye) in 100 mL to 1 L; methomyl (Lannate) and chlorantraniliprole (Prevathon); glyphosate and 2,4-D herbicides in bottles and gallons, butachlor and bispyribac for rice; mancozeb (Dithane M45) and copper fungicides in 250 g to 1 kg and sachet boxes; niclosamide and metaldehyde molluscicides in 35 g sachets; coumatetralyl, flocoumafen and zinc phosphide rodenticides in 10 to 20 g sachets. Pack sizes and prices are dated observations in the catalog research.',
      "Registration and label. No pesticide may be sold unless registered with the FPA. Every container carries the active ingredient and percentage, the registration number, directions, warnings with first aid, the hazard pictogram, disposal instructions and the lot number and year of formulation. No pesticide may be repacked by an unlicensed person and no label may be detached or altered: a dealer licence is not a repacker licence, so pesticides are sold only in the registrant's sealed pack, and a punctured, rusted, leaking or unreadable container may not be offered for sale.",
      'Toxicity bands. A colour band below the label shows toxicity to mammals: red (dangerous, category I, already banned), yellow (harmful, category II), blue (caution, category III), green (least toxic, category IV). Banned actives include DDT, endosulfan, aldrin, dieldrin, endrin, heptachlor, chlordane, parathion and strychnine; paraquat is restricted to institutional use with a separate FPA certificate; monocrotophos, lindane and the fumigants carry use conditions. The app refuses to list a banned active.',
      'Licence, tax and storage. Retailing needs the FPA pesticide dealer licence (PHP 2,500, or PHP 4,000 with fertilizer, three years) with an Accredited Safety Dispenser. Pesticides are VATable at 12 percent. Store them locked, ventilated, away from feed and food, powders above liquids, herbicides on the lowest shelf; assume a two-year shelf life from formulation when the label is silent, and the app warns 90 days before expiry.',
    ],
    sources: ['PC:5.1', 'PC:5.2', 'PC:5.3', 'PC:10', 'PK:2.5', 'RT:2.1', 'SK:4.2'],
    tags: ['pesticide', 'fpaDealer', 'fpaRestricted'],
    related: ['pesticide-classes', 'pesticide-safety', 'pesticide-storage', 'banned-and-restricted-pesticides', 'fpa-dealer-licence', 'pesticide-prices'],
  },
  {
    id: 'tools-and-equipment',
    title: 'Tools and equipment',
    section: 'products',
    summary: 'Knapsack sprayers, watering cans, seedling trays, feeders and drinkers, syringes and hand tools; VATable, no licence, no expiry.',
    paragraphs: [
      'A provincial agrivet stocks a short hardware list next to the inputs: Matibay knapsack sprayers (the 16 L standard, battery models), plastic watering cans of 1.5 to 8 litres, seedling trays and gusseted seedling bags, pruning shears, twine, potting media; and, by general practice, plastic and steel feeders and drinkers, nets and tarpaulins, syringes and needles, rubber boots, sacks and sack needles, bolo, spade, rake and hoe, small pumps and hoses.',
      "The app keeps tool and equipment apart: equipment is the depreciated or serialised kind (sprayers, pumps), tool the consumable hand kind. Both are VATable at 12 percent, need no licence and carry no expiry, so they get no expiry warning and no lot life. Sprayer parts and PPE (gloves, goggles, masks) belong with the pesticide advice: the label's protective gear is what the counter recommends.",
    ],
    sources: ['PC:6', 'PC:10', 'RT:4.1'],
    tags: ['tool', 'equipment'],
    related: ['pesticide-safety', 'depreciation-and-owner-draw'],
  },
  {
    id: 'veterinary-drugs',
    title: 'Veterinary drugs (extension line)',
    section: 'products',
    summary:
      'Prescription (Rx) and over-the-counter (OTC) drugs sold by a licensed veterinary outlet with a pharmacist or veterinarian; VATable; withdrawal periods on every food-animal sale.',
    paragraphs: [
      'Classes. Prescription veterinary drugs are dispensed only on the written order of a licensed veterinarian; OTC drugs are approved for animal use without one and are sold in their original packs. An agrivet selling prescription drugs is a veterinary drug outlet: a signboard, a ventilated area of at least 12 square metres, a refrigerator where the label requires one, a BAI-registered pharmacist or veterinarian, a prescription book and a numbered prescription file kept two years. The FDA licenses the outlet and registers the drugs; the BAI registers vaccines and biologics and regulates veterinary outlets whether or not they carry them.',
      "Products. Univet's range shows the shape: chlortetracycline water-soluble powders in 5 g sachets (withdrawal chicken 1 day, swine 5 days), doxycycline-tiamulin capsules for gamefowl, apramycin anti-scour sachets (14 days), long-acting oxytetracycline injectable (swine 14 days, cattle 28), ivermectin injectable (swine 28 days, cattle 21), praziquantel-albendazole tablets, B-complex and iron injectables, electrolyte powders. Feed with a therapeutic claim or a medicinal ingredient is a drug, not a feed.",
      "What the counter does. Sells antimicrobials only against a veterinarian's prescription and records it; never sells the banned actives (chloramphenicol, nitrofurans, carbadox, olaquindox, the beta-agonists); reads the dose, route, days and the meat or milk withdrawal period from the label at every sale and prints it on the receipt. The app carries an Rx class, withdrawal days per species and the prescription number on Rx sales. Vet drugs are VATable and the vitamin category holds the OTC supplements a store may carry before it has a pharmacist or veterinarian.",
    ],
    sources: ['PC:7', 'PC:10', 'RT:3.1', 'RT:3.2', 'PK:4.2'],
    tags: ['vetDrug', 'baiVetOutletRx', 'baiVetOutletOtc'],
    related: ['dosage-and-withdrawal', 'animal-health-basics', 'vet-line-licences', 'vitamins-and-supplements'],
  },
  {
    id: 'vaccines',
    title: 'Vaccines and the cold chain',
    section: 'products',
    summary: 'BAI-registered biologics sold by the vial, kept at 2 to 8 C, never frozen, never repacked, FEFO by vial expiry.',
    paragraphs: [
      'The BAI registers veterinary vaccines and biologics and the outlets carrying them; selling a vaccine without batch certification is a licence-revocation ground. The common hog vaccine at the counter is the classical swine fever (hog cholera) vaccine in 10-dose vials, 2 mL deep intramuscular per head; poultry and gamefowl vaccines (Newcastle disease, fowl pox, infectious bronchitis, Gumboro) follow the same channel. The ASF vaccine is under a government-controlled programme and is not for counter sale until the BAI issues a commercial release certificate; no avian influenza vaccine is sold at the counter.',
      'Cold chain. Vaccines are transported and stored at +2 to +8 C at all times, protected from light and from freezing, from manufacture to administration. The store keeps a dedicated refrigerator with a min-max thermometer, checks and records the temperature twice a day aiming at 5 C, keeps water bottles in the door for thermal mass, has a written power-outage plan (door shut, cold box with conditioned ice packs, record the excursion, quarantine the lot until the supplier or vet advises) and never sells a vial that has been out of the cold chain. Customers carry vaccines home in an ice box, away from disinfectants and chlorinated water, and use them the same day.',
      'In the app a vaccine SKU is sold by the vial with the dose count as an attribute, flagged cold chain with a refrigerator location and a temperature log, FEFO by the vial expiry with a 90-day warning, VATable, and blocked until the store records its BAI biologics licence.',
    ],
    sources: ['PC:8', 'PC:10', 'RT:3.3', 'SK:12', 'PK:4.4', 'PK:4.5'],
    tags: ['vaccine', 'baiBiologic', 'coldChain'],
    related: ['vaccination-schedules', 'cold-chain', 'disease-status', 'vet-line-licences'],
  },
  {
    id: 'vitamins-and-supplements',
    title: 'Vitamins, electrolytes and supplements',
    section: 'products',
    summary: 'OTC sachets, bottles and canisters sold by the piece; the 6 g sachet is the tingi unit; VATable; the bulk of what an unlicensed store may carry.',
    paragraphs: [
      'Vitamins, electrolytes and supplements (B-complex injectables, electrolyte-dextrose powders, gamefowl conditioning supplements such as Red Cell, B12 and dextrose powder) are over-the-counter products sold by sachet, bottle or canister. The 6 g sachet is the tingi unit; bottles are not opened. They sell with brooding stress, transport stress, heat stress and the derby conditioning weeks.',
      'The app keeps vitamin as its own category only because OTC supplements are the bulk of what a store may carry before it has a pharmacist or veterinarian; a store that opens fully licensed can fold them into veterinary drugs with the OTC class. They are VATable, carry a label expiry with a 90-day warning, and the dose is read from the label at the counter.',
    ],
    sources: ['PC:9', 'PC:10', 'PC:11', 'PK:5'],
    tags: ['vitamin', 'baiVetOutletOtc'],
    related: ['veterinary-drugs', 'gamefowl-feeding-program', 'broiler-feeding-program'],
  },
  {
    id: 'disinfectants',
    title: 'Disinfectants and biosecurity products',
    section: 'products',
    summary:
      "FPA-registered chemicals for animal facilities, sold in the registrant's pack, VATable; footbaths, lime and disinfectant are the counter's answer to ASF and bird flu.",
    paragraphs: [
      "Disinfectants for animal facilities are FPA-registered agricultural chemicals since 2021 (moved from the BAI), sold under the dealer licence in the registrant's pack and never repacked. Microban GT (glutaraldehyde plus quaternary ammoniums) is the example: 10 mL per gallon for routine disinfection with animals present, 40 mL per gallon for terminal disinfection and footbaths, effective against the ASF virus at 1 percent, never mixed with bleach or acid; 20 mL to 4 L packs.",
      'When a customer asks about ASF or bird flu, the counter sells biosecurity, not a vaccine: disinfectant, a footbath, lime, and a referral to the municipal veterinarian or the BAI hotline. Disinfectants are VATable and carry a label expiry with a 90-day warning.',
    ],
    sources: ['PC:9', 'PC:10', 'PC:5.1', 'PK:4.4'],
    tags: ['disinfectant', 'fpaDealer'],
    related: ['disease-status', 'pesticides', 'vaccines'],
  },
  {
    id: 'pet-supplies',
    title: 'Pet food and pet supplies',
    section: 'products',
    summary: 'Dog and cat food is a VATable specialty feed sold under the BAI feed licence; dry food by the kilo is common.',
    paragraphs: [
      'Pet food (Pilmico Maxime and Woofy, UNAHCO Doggiessentials, Tommy cat food) is a feed for the BAI and a specialty feed for the BIR: RR 16-2005 defines specialty feeds as feeds for racehorses, fighting cocks, aquarium fish, zoo animals and other animals generally considered as pets, and they are VATable at 12 percent. Dry pet food by the kilo is common at the counter; the app treats the category as repackable with a 40-day lot life and VATable by default.',
      'Pet supplies (collars, bowls, shampoos) and the rabies question sit in this line: rabies vaccination of dogs is by a veterinarian or a supervised vaccinator in the municipal campaigns, so the counter refers the owner to the municipal veterinary office; owners who fail to register and vaccinate are fined PHP 2,000 under the Anti-Rabies Act.',
    ],
    sources: ['PC:9', 'PC:10', 'RT:4.1', 'PK:4.3'],
    tags: ['pet', 'baiFeed'],
    related: ['feeds', 'vat-exemption', 'vaccination-schedules'],
  },
  {
    id: 'other-lines',
    title: 'Other lines: cash-in, day-old chicks, water and ice',
    section: 'products',
    summary:
      'Float-based and foot-traffic lines with little stock: GCash cash-in and bills payment, day-old chicks as the front end of the chick starter pack, water and ice.',
    paragraphs: [
      'A GCash Pera Outlet earns 1 percent on cash-in, 2 percent on cash-out and about PHP 3 per bills payment; the customer pays PHP 10 per PHP 1,000 cashed in; the distributor may charge up to 0.5 percent on fund-in. PHP 100,000 of monthly cash-in earns about PHP 1,000 gross for the float and the foot traffic. Day-old chicks are the natural front end of the chick starter pack (chicks, booster, starter, finisher, vitamins, the Newcastle doses); water and ice bring the raiser in weekly. No Philippine prices or margins were found for chicks, water or ice, so these are user-entered lines under the category "other", VATable by default, with no expiry.',
    ],
    sources: ['SS:Line extensions', 'SS:Payment methods and merchant fees', 'SS:Bundling and starter kits'],
    tags: ['other'],
    related: ['payment-methods', 'bundles-and-starter-kits', 'strategy-sell-14-line-extensions'],
  },
  {
    id: 'hog-feeding-program',
    title: 'Hog feeding program: weaner to market, sows',
    section: 'products',
    summary: 'About 230 to 270 kg of feed per pig from weaning to 80 to 90 kg over five months, and about 8 sacks per sow per farrowing cycle.',
    paragraphs: [
      'Stages (B-MEG Expert, the value line for crossbred hogs): pre-starter mash from day 10 to 54 at 0.30 kg a day; starter mash day 55 to 82 (10 to 25 kg) at 1.0 to 1.2 kg; grower mash day 83 to 137 (25 to 60 kg) at 2.0 to 2.2 kg; finisher day 138 to 155 (60 to 80 kg) at 2.2 to 2.5 kg. Pigrolac Premium uses calendar days the counter quotes directly: pre-starter day 36 to 60 at 500 to 700 g, starter day 61 to 90 at 1.0 to 1.2 kg, grower day 91 to 120 at 1.7 to 2.0 kg, finisher from day 121 at 2.0 to 2.2 kg. The DA table by liveweight runs 1.2 kg a day at 20 kg to 3.0 kg at 100 kg, one week per 5 kg step. Change rations gradually over at least a week.',
      'Arithmetic. Per pig on the B-MEG Expert schedule: pre-starter 13 kg, starter 30 kg, grower 113 kg, finisher 73 kg, about 229 kg to 80 kg; the DA table gives 228 kg from 20 to 90 kg, within 5 percent. A weaner bought at 30 days and 8 to 10 kg needs about 261 kg to 90 kg. Sows: gestating 2.0 to 2.5 kg a day, lactating up to 4.5 kg or more, about 408 kg per farrowing cycle, 8 sacks.',
      'The bundle for 10 weaners: 3 to 6 bags of 25 kg pre-starter, 6 sacks starter, 23 sacks grower, 23 sacks finisher, 52 to 54 sacks over about five months rising from 2 sacks in month 1 to 14 in month 5; a dewormer one week after weaning, the hog cholera vaccine at weaning, iron on day 3 and 14 for sucklings, vitamins or electrolytes for transport stress, doses per label.',
    ],
    sources: ['PK:1.3', 'PC:1.2', 'PK:5'],
    tags: ['feed', 'hog'],
    related: ['feeds', 'counter-hogs', 'vaccination-schedules', 'bundles-and-starter-kits'],
  },
  {
    id: 'broiler-feeding-program',
    title: 'Broiler feeding program: the 35 to 45 day cycle',
    section: 'products',
    summary: 'About 2.5 to 2.6 kg of feed per bird to 1.5 to 1.6 kg live weight: 100 chicks need 5 to 6 sacks over the cycle.',
    paragraphs: [
      "The DA Cagayan Valley program uses three feeds over 42 to 45 days to 1.6 kg: chick booster 10 g a day for 7 days, broiler starter 60 g for 3 weeks, finisher 90 g for 2 weeks, 2.59 kg per bird. Unifeeds' day-by-day table for 100 heads gives booster days 1 to 10, starter days 11 to 28, finisher days 29 to 35, 249 kg per 100 heads to 1.53 kg at day 35. Sarimanok labels: chick booster day 1 to 15, starter day 16 to 26, finisher day 27 to harvest, 5 to 6 sacks per 100 birds. Nutrient minimums under Philippine conditions: booster 21 percent protein, starter 20, finisher 18.",
      'The counter bundle for 100 chicks: chicks, booster in a small pack (7 to 25 kg), 3 sacks starter, 3 sacks finisher (or 2 sacks plus tingi), a vitamin-electrolyte sachet for brooding stress, and the Newcastle disease doses for days 8 to 10 and 26 to 28. Broilers are marketed at 45 to 60 days by target weight; the DA cost example uses 4 percent mortality. For the Christmas table chicks go in during the first half of November; for a May fiesta, late March to April.',
    ],
    sources: ['PK:1.1', 'PC:1.3', 'PM:3'],
    tags: ['feed', 'broiler'],
    related: ['feeds', 'counter-poultry', 'vaccination-schedules', 'fiesta-and-christmas'],
  },
  {
    id: 'layer-feeding-program',
    title: 'Layer feeding program: chick to point of lay, then laying',
    section: 'products',
    summary: 'About 6.2 kg per pullet to 18 weeks, then 100 to 110 g a day: 100 hens buy about 6 sacks a month.',
    paragraphs: [
      'Pullets: chick booster weeks 1 to 2, chick starter weeks 3 to 8, grower weeks 9 to 16 (about 15.5 percent protein), pre-lay weeks 17 to 18, then layer 1 from week 19 to 45 (17 percent protein, 3.5 to 4.2 percent calcium) and layer 2 to the end of lay. The Unifeeds table sums to 6.23 kg per pullet to 18 weeks, 12 bags per 100 heads; restrict pullets to 85 percent of intake at 16 to 18 weeks then full-feed. Birds start laying at 20 to 22 weeks and peak at 30 to 36.',
      'Laying hens eat 104 to 110 g a day, 3.1 to 3.3 kg a month, so a 100-hen flock buys about 6 sacks of layer feed a month. Layer mash must never be given to chicks: its 3.5 percent calcium against 1 percent in chick feed is for eggshell. Layers respond to the egg price, which peaks in the fourth quarter and dips in April to June. Vaccination adds Gumboro at 2 to 4 weeks and Newcastle boosters during lay.',
    ],
    sources: ['PK:1.2', 'PC:1.3', 'PK:5'],
    tags: ['feed', 'layer'],
    related: ['feeds', 'counter-poultry', 'vaccination-schedules', 'customer-income-prices'],
  },
  {
    id: 'gamefowl-feeding-program',
    title: 'Gamefowl feeding program: chick, stag, maintenance, conditioning',
    section: 'products',
    summary: 'Booster to 30 days, developer to 4 months, then 40 to 50 g twice a day; conditioning feeds and supplements sell in the weeks before each derby.',
    paragraphs: [
      'Stages: game chick booster crumble days 1 to 30 ad libitum (22 percent protein); stag developer 1 to 4 months, 50 to 60 g a day by month 3 to 4; stabilizer or developer 4 to 6 months at 60 to 100 g; maintenance from 6 months at 40 to 50 g twice a day in pure form, 35 to 45 g for a ready-mix; pre-conditioning two months before the fight and conditioning one month before at 35 to 45 g per feeding, with grains and supplements; 14, 21 or 30-day training plans on a fixed schedule, 21 days common. Thunderbird, Thunderbird GMP, Salto and Powermix, Buena Suerte Nutrio are the lines.',
      'Arithmetic: a stag eats about 1.65 kg in month 3 to 4 and 4.8 kg in months 4 to 6; a maintenance cock at 80 to 90 g a day eats 2.4 to 2.7 kg a month, so a 25 kg sack lasts one cock about ten months or ten cocks one month. Gamefowl feed is a VATable specialty feed. Demand runs three to four months before each derby season: June to August for the September to November stag season, October to December and February to April for the January to February and May cock derbies.',
    ],
    sources: ['PK:1.4', 'PC:1.4', 'PM:6', 'RT:4.1'],
    tags: ['feed', 'gamefowl'],
    related: ['feeds', 'derby-calendar', 'vitamins-and-supplements', 'counter-gamefowl'],
  },
  {
    id: 'duck-quail-native-feeding',
    title: 'Ducks, quail and native chicken',
    section: 'products',
    summary: 'Duck layer pellet from 16 weeks at 105 to 120 g a day; quail layer from 5 weeks at about 19 g; native chicken half on farm-mixed ration.',
    paragraphs: [
      "Duck layer feed (20 percent protein) is fed from 16 weeks to culling at 105 to 120 g per duck per day; quail layer (19.5 percent protein) from 5 weeks at 19.25 g a day. B-MEG, Sarimanok, Pilmico Avemax and Vitarich all sell duck and quail layer pellets. Native chicken is 46 percent of the national flock and 99.9 percent smallhold: when range feed is short, supplemental feeding of commercial feed cut with a farm-mixed ration halves the feed cost; no grams-per-bird figure was found in a Philippine source, so the counter sells by the kilo and the customer's own rate.",
    ],
    sources: ['PK:1.5', 'PC:1.1', 'PM:1'],
    tags: ['feed', 'duck', 'quail'],
    related: ['feeds', 'layer-feeding-program', 'demand-drivers'],
  },
  {
    id: 'goat-cattle-feeding',
    title: 'Goats and cattle: concentrate supplementation',
    section: 'products',
    summary: 'Concentrate pellets fed with roughage: 0.2 to 0.7 kg a day for growing goats, 0.3 to 0.5 kg per litre of milk for lactating does.',
    paragraphs: [
      'The DA goat guide: kids get colostrum then 0.5 to 1 litre of milk a day to 16 weeks with forage, a mineral mix and a 22 percent starter; from 4 months, forage ad libitum plus 0.2 to 0.7 kg a day of an 18 to 20 percent concentrate; dry and pregnant does and bucks 16 to 18 percent; lactating does 0.3 to 0.5 kg of concentrate per litre of milk; salt and vitamin-mineral mix always available. Vitarich sells Gromax goat starter, grower and dairy concentrates and calf, cattle dairy and buffalo concentrates; pack sizes are not published. Cattle supplementation rates were not found in a Philippine source. Deworm goats by worm load and season after a faecal check.',
    ],
    sources: ['PK:1.6', 'PC:1.5', 'PK:4.1'],
    tags: ['feed', 'goat', 'cattle'],
    related: ['feeds', 'animal-health-basics'],
  },
  {
    id: 'tilapia-feeding',
    title: 'Tilapia and bangus feeding',
    section: 'products',
    summary: 'Fry mash to finisher pellet by fish size; the daily ration is average weight times number of fish times the feeding rate.',
    paragraphs: [
      "BFAR's leaflet: fry mash under 5 g, starter crumble 5 to 30 g, grower pellet 30 to 90 g, finisher above 90 g; protein 50 percent to 0.5 g falling to 25 to 30 percent at market size. Feeding rate as a percent of body weight a day under complete feeding: fry 30 to 15, fingerlings 10 to 15, juveniles 10 to 5, market size 5 to 2; half those rates with pond fertilization. Daily ration = average body weight x number of fish x rate: 1,000 fingerlings of 20 g at 5 percent is 1.0 kg a day. Feed fry 4 to 8 times a day, others 2 to 4; good feed converts at 1.5 to 2.0; stop feeding 24 hours before harvest. B-MEG sells Premium Tilapia and Bangus feeds; a bangus feeding table was not found.",
    ],
    sources: ['PK:1.7', 'PC:1.5'],
    tags: ['feed', 'tilapia', 'bangus'],
    related: ['feeds', 'counter-poultry'],
  },
  {
    id: 'rice-inputs',
    title: 'Rice: fertilizer bags per hectare, MOET, LCC and seed',
    section: 'products',
    summary:
      'Wet season 5 t target: 4 bags of complete then 1 bag urea per LCC trigger; dry season 7 t: 6 bags then 1.5 bags per trigger; 40 kg of certified seed.',
    paragraphs: [
      'PhilRice PalayCheck without a MOET result: wet season, 5 t per hectare target, 4 bags of 14-14-14-12S at 10 to 14 days after transplanting; dry season, 7 t target, 6 bags. Where phosphorus and potassium are deficient add 0.5 bag of solophos and 0.5 bag of 0-0-60 in the wet season, 2 bags and 1 bag in the dry. Nitrogen after that by the leaf colour chart read weekly from 14 days after transplanting until early flowering: apply 1 bag of urea (1.5 in the dry season) when 6 of 10 leaves read below 4. Zinc deficiency: 25 kg zinc sulfate broadcast at 10 to 14 days. Counter total: 6 to 7 bags per hectare in the wet season, 9 to 10.5 in the dry; hybrid rice 7.6 to 8.3 bags. The PhilRice Abonong Swak budget option for 3 to 4 t: 1 bag complete, 1 bag urea, half a bag of potash and 10 bags of decomposed manure.',
      'Seed. Use certified seed of a variety recommended for the region and ecosystem, with a maturity that escapes the typhoon months (PSB Rc10 at 106 days is the example), at least 85 percent germination, and re-test carry-over seed. Rates: 20 to 40 kg per hectare transplanted (40 is the campaign rate), 40 to 60 kg row-seeded, 60 to 80 kg broadcast, about 20 kg for hybrids. The PhilRice Text Center answers variety questions at 0917 111 7423. The counter bundle per hectare is 1 to 2 bags of 20 kg certified seed or one hybrid pack, the fertilizer set above, and zinc sulfate where the MOET shows deficiency.',
    ],
    sources: ['PK:2.1', 'PK:3.1', 'PC:3.1'],
    tags: ['fertilizer', 'seed', 'rice'],
    related: ['seeds', 'fertilizer', 'counter-rice', 'crop-calendars', 'pesticide-classes'],
  },
  {
    id: 'corn-inputs',
    title: 'Corn: seed rate, fertilizer and fall armyworm',
    section: 'products',
    summary:
      '18 kg of hybrid or 20 kg of OPV seed per hectare; the DA package gives 2 bags of fertilizer; fall armyworm needs traps, biocontrol and a registered insecticide.',
    paragraphs: [
      "Seed: 18 kg per hectare of hybrid or GM corn (two 9 kg bags), 20 kg of improved open-pollinated seed (an 18 kg bag). Fertilizer: the DA 2023 program package supplies 2 bags per hectare of urea or complete, a subsidy package rather than an agronomic rate; a 1987 trial found 2 bags of urea alone lifted yield 41 percent, the same as 1 bag urea plus 2 bags of 16-20-0 or 14-14-14. The full DA rate commonly quoted (4 bags complete basal plus 2 bags urea side-dressed at 25 to 30 days) could not be fetched from a primary page, so quote the seed company's or the DA regional guide.",
      'Fall armyworm infested 8,000 hectares by mid-2020, mostly in Cagayan Valley and SOCCSKSARGEN; the DA deployed pheromone lures, Trichogramma egg parasitoids, earwigs and Metarhizium alongside pesticides. The counter answer: pheromone traps and biocontrol from the DA regional office, and a registered insecticide at the label rate within an IPM program.',
    ],
    sources: ['PK:2.2', 'PK:3.2', 'PK:2.4', 'PC:3.2'],
    tags: ['seed', 'fertilizer', 'corn'],
    related: ['seeds', 'crop-calendars', 'pesticide-classes'],
  },
  {
    id: 'vegetable-inputs',
    title: 'Vegetables: seed and fertilizer by crop',
    section: 'products',
    summary:
      'Tomato and eggplant 100 to 200 g of seed per hectare, ampalaya 3 kg; manure at land preparation, complete at planting, urea side-dressed by the tablespoon.',
    paragraphs: [
      'Tomato: 100 to 200 g of seed per hectare (about 250 seeds per gram), transplant 25 to 30-day seedlings; 20 bags of decomposed manure before land preparation, 14-14-14 at a tablespoon per plant basal, urea a tablespoon per plant at 10 to 15 and 30 days after transplanting with potash; off-season planting May to September earns more; harvest from 55 to 65 days. Ampalaya: 3 kg of seed per hectare, one pre-germinated seed per hill, furrows 2 m apart in the dry season and 3 m in the wet; 14-14-14 at 20 g per hill before planting, urea 10 g per hill at 3 to 4 weeks repeated every two weeks; at 2,500 hills that is one sack of complete and 25 kg of urea per side-dressing. Eggplant: 100 to 200 g per hectare, a starter solution of 16-20-0 to seedlings, the Dumaguete variety for bacterial wilt tolerance.',
      'Cool-season crops (cabbage, Chinese cabbage, carrot, potato, squash) are planted October to January; ampalaya, eggplant, okra, pole sitao and snap bean all season; tomato January to May and September to October. Pests: thrips, whiteflies, fruit fly, leaf miner, aphids and cutworm; downy mildew, blights and wilts; the DA guides say spray a registered product at the label rate as the need arises, bag ampalaya fruits against fruit fly, remove mildewed leaves.',
    ],
    sources: ['PK:2.3', 'PK:3.3', 'PM:4', 'PC:3.3'],
    tags: ['seed', 'fertilizer', 'vegetables'],
    related: ['seeds', 'crop-calendars', 'counter-vegetables'],
  },
  {
    id: 'pesticide-classes',
    title: 'Pesticide classes and what each is for',
    section: 'products',
    summary:
      'Insecticides, herbicides, fungicides, molluscicides and rodenticides, sold by the problem, with the PhilRice thresholds that say when spraying is worth it.',
    paragraphs: [
      'The counter sells by problem. Rice (PhilRice PalayCheck): the first line is a resistant variety, synchronous planting, field monitoring and natural enemies; do not spray against leaf feeders within 30 days after transplanting or 40 after sowing; control weeds within 45 days with land preparation, water, hand and rotary weeding, herbicides as the last option; golden apple snail by keeping the field saturated, canals, screens and a molluscicide when needed; rats by community-wide control, traps up to two weeks before harvest. Action thresholds: stem borer 30 percent deadhearts at early tillering or 20 percent whiteheads at flowering; brown planthopper 25 to 100 per hill by stage; leaf blast 30 percent of the field, neck blast 10 percent, sheath blight 40 percent, bacterial leaf blight 30 percent (chemical control not economical; resistant varieties instead).',
      'Classes on the FPA fast-mover sheet: insecticides (cypermethrin, lambda-cyhalothrin, BPMC-chlorpyrifos, methomyl, chlorantraniliprole, malathion), herbicides (glyphosate, 2,4-D, butachlor-propanil, bispyribac, cyhalofop), fungicides (mancozeb, copper hydroxide, difenoconazole, thiophanate-methyl, chlorothalonil), molluscicides (niclosamide, metaldehyde) and rodenticides (coumatetralyl, flocoumafen, zinc phosphide). Formulation codes: EC emulsifiable concentrate, WP wettable powder, SC or FL flowable, G granule, B bait.',
      "Rates. The rate per 16 L knapsack, the number of sprays, the pre-harvest interval and re-entry precautions are on the label's directions for use; the counter reads the label to the customer and never quotes a rate from memory. Demand follows the crop calendar: fungicide, insecticide and molluscicide in July to September for the wet-season rice crop, herbicide in the two to three weeks after each planting peak.",
    ],
    sources: ['PK:2.4', 'PC:5.2', 'PM:5'],
    tags: ['pesticide'],
    related: ['pesticides', 'pesticide-safety', 'rainy-season-pests', 'counter-pesticides'],
  },
  {
    id: 'pesticide-safety',
    title: 'Pesticide safety: colour bands, PPE, first aid and what the counter must not do',
    section: 'products',
    summary:
      'Green, blue, yellow, red; gloves, goggles and the gear on the label; wash, rinse 15 minutes, do not force vomiting; never a banned or restricted active to a walk-in.',
    paragraphs: [
      'The colour band below the label shows toxicity: green "caution" slightly toxic, blue "warning" moderately toxic, yellow "danger" highly toxic, red "poison" extremely toxic and already banned in the Philippines. The label carries the signal word, precautionary statements, first aid and the directions for use. Minimum PPE when handling stock with no label information is overalls, boots and gloves; for use, gloves, goggles, mask, long sleeves and the gear the label names. The Accredited Safety Dispenser training every dealer attends covers safe handling, poisoning protocols, first aid and the sales rules.',
      'First aid (check the label first): on the skin, drench with water, remove contaminated clothing, wash with soap; in the eye, hold the lid open and rinse with clean running water for at least 15 minutes; swallowed, induce vomiting only if the label or emergency staff say so, because petroleum-based and caustic products do more harm coming back up; inhaled, fresh air, loosen clothing, artificial respiration if breathing stops; then a doctor, with the label. The National Poison Control and Information Service at UP-PGH is the referral centre.',
      'What the counter must not do: sell a banned active; sell paraquat or another restricted active to a walk-in customer (institutional end users with FPA approval only); buy from anyone but an FPA-licensed handler, because fake and smuggled products are in the market; repack or sell from an opened container; sell a damaged or unreadable pack.',
    ],
    sources: ['PK:2.5', 'PK:2.6', 'PC:5.3', 'RT:2.1'],
    tags: ['pesticide', 'fpaRestricted'],
    related: ['pesticides', 'banned-and-restricted-pesticides', 'fpa-dealer-licence', 'counter-pesticides'],
  },
  {
    id: 'animal-health-basics',
    title: 'Animal health basics: common problems and product classes by species',
    section: 'products',
    summary: 'Piglet anaemia, parasites and hog cholera; Newcastle, pox, Gumboro and coccidiosis in poultry; what the counter stocks for each.',
    paragraphs: [
      'Hogs: piglet anaemia (iron dextran on day 3, repeat at 14); internal and external parasites (deworm 1 to 2 weeks after weaning, sows 14 days before farrowing); hog cholera (fever, purple skin, death in 4 to 7 days; vaccinate weanlings, breeders every six months); swine dysentery and scours (antibiotics on advice); pneumonia and the vaccine-preventable diseases (E. coli, erysipelas, pasteurellosis, leptospirosis, PRRS, parvovirus); ASF, with no treatment. Poultry: Newcastle disease, fowl pox, Gumboro, infectious bronchitis, coryza, fowl cholera, coccidiosis (coccidiostats), worms, vitamin deficiencies and heat stress (electrolytes and vitamins in the water). Gamefowl share the poultry diseases. Goats: parasites by season and a mineral and salt need. Dogs and cats: rabies.',
      'Product classes stocked: dewormers, antibiotics (prescription class), vitamins and electrolytes, iron injectables, coccidiostats, disinfectants, vaccines in the cold chain, antiseptics and wound sprays, syringes and needles. A 2020 Luzon study found oxytetracycline on 39 percent of backyard farms, 30 percent buying antimicrobials over the counter from agrivet outlets and most farms treating only when animals are sick; the counter refers a sick animal to the municipal or a private veterinarian rather than diagnosing.',
    ],
    sources: ['PK:4.1', 'PK:4.2'],
    tags: ['vetDrug', 'vaccine', 'vitamin'],
    related: ['veterinary-drugs', 'dosage-and-withdrawal', 'vaccination-schedules', 'counter-animal-health'],
  },
  {
    id: 'dosage-and-withdrawal',
    title: 'Dosage and withdrawal: the label rule, prescriptions and banned drugs',
    section: 'products',
    summary:
      "Dose, route, days and the meat or milk withdrawal period come from the label; antimicrobials need a veterinarian's prescription; some actives are banned in food animals.",
    paragraphs: [
      'The counter rule: the dose per kg, the route, the number of days, the withdrawal period and the storage condition are read from the label or insert and shown to the customer; the counter does not dose from memory and does not change a labelled dose. The legal basis: DA AO 40 s.1990 separates prescription from over-the-counter veterinary drugs; RA 9268 reserves prescribing and dispensing to registered veterinarians, whose registration number appears on the prescription; the joint DOH-DA order makes an agrivet selling prescription drugs a licensed outlet and lets OTC products be sold only in original packs.',
      'Banned in food animals (BAI AO 13): chloramphenicol, carbadox, olaquindox, nitrofurans and the beta-agonists clenbuterol, salbutamol, terbutaline and pirbuterol, by any route; the order also mandates strict withdrawal periods for prescription drugs. Antimicrobial resistance is the policy driver: the FDA warned against indiscriminate use in poultry, livestock and fighting cocks and stopped the advertising of veterinary antimicrobials; under AIDCA jurisdiction over animal health products is moving from the FDA to the BAI.',
      'What the counter does: sells antimicrobials only against a prescription and records it; refers diagnosis to a veterinarian; never sells banned actives; states the withdrawal period from the label at every antimicrobial sale and the app prints it on the receipt.',
    ],
    sources: ['PK:4.2', 'RT:3.2', 'PC:7'],
    tags: ['vetDrug', 'baiVetOutletRx'],
    related: ['veterinary-drugs', 'vet-line-licences', 'counter-animal-health'],
  },
  {
    id: 'vaccination-schedules',
    title: 'Vaccination schedules: hogs, broilers, layers, gamefowl, dogs',
    section: 'products',
    summary:
      'Hog cholera at weaning and breeders every six months; Newcastle at 8 to 10 and 26 to 28 days, pox at 21 to 24; layers add Gumboro; rabies by a veterinarian.',
    paragraphs: [
      "Backyard hogs: hog cholera vaccine to weanlings one week before or after weaning, sows and boars every six months, one to two weeks after weaning or one week after deworming; deworm and treat external parasites 14 days before farrowing; iron on day 3 and 14. Broilers (DA program): Newcastle disease intranasal at 8 to 10 days (as early as 3 days for chicks from unvaccinated parents), fowl pox by wing web at 21 to 24 days where the disease occurs, Newcastle again at 26 to 28 days. Layers (Hy-Line practice): Marek's at the hatchery, Gumboro live between days 15 and 32, Newcastle two to three live vaccinations 4 to 6 weeks apart with boosters every 30 to 60 days in lay, infectious bronchitis with the Newcastle combinations, pox once or twice, coryza and cholera where present; no live respiratory vaccine within 7 days of another.",
      'Gamefowl use the same disease set by oral, nasal, ocular, wing-web and subcutaneous routes, intramuscular under veterinary supervision; live vaccines are heat-sensitive and kept away from disinfectants and chlorinated water. Dogs: the Anti-Rabies Act obliges owners to vaccinate and register; vaccination is by a veterinarian or a supervised vaccinator in the municipal campaigns, and the counter refers to the municipal veterinary office. The counter sells the vaccine and syringes to the farmer for the hog cholera and poultry vaccines, with ice in an insulated bag.',
    ],
    sources: ['PK:4.3', 'PK:4.5', 'PC:8'],
    tags: ['vaccine', 'baiBiologic'],
    related: ['vaccines', 'cold-chain', 'hog-feeding-program', 'broiler-feeding-program', 'counter-animal-health'],
  },
  {
    id: 'disease-status',
    title: "ASF and avian influenza: status and the counter's role",
    section: 'products',
    summary:
      'ASF has cut the national herd by 30 percent since 2019 and its vaccine awaits BAI commercial release; H5N1 is present; the counter sells biosecurity and refers.',
    paragraphs: [
      'African swine fever: first outbreak July 2019, state of calamity May 2021, about 3 million hogs lost; 76 of 82 provinces have had outbreaks and the active map changes monthly (65 barangays in 20 provinces on 7 August 2026). The herd fell from 12.7 million head in 2019 to 8.9 million in July 2026, commercial farms losing most, so the backyard share rose from 64 to 79 percent. The government-controlled vaccination programme reported 90 percent efficacy; the DA targeted commercial release certification by the BAI in the third quarter of 2026, and as of 2 September 2026 no certificate had been found. The app shows the ASF vaccine as not for counter sale until BAI release. A local case suspends hog feed sales in the affected barangays for the quarantine and shifts demand to poultry feed.',
      'Avian influenza: H5N1 has been present since 2022, with outbreaks in South Cotabato, Isabela and Nueva Ecija in January 2026 and a backyard flock in Oriental Mindoro in July 2026; outbreaks are local and short (culling within days), stopping layer and broiler feed sales in the municipality, then restocking demand for chicks and starter. No avian influenza vaccine is sold at the counter. For both diseases the counter sells biosecurity (disinfectant, footbath, lime), advises buying chicks from accredited hatcheries, and refers to the municipal veterinarian or the BAI hotline; keep this status line dated.',
    ],
    sources: ['PK:4.4', 'PM:2', 'PM:1'],
    tags: ['vaccine', 'disinfectant', 'hog', 'broiler', 'layer'],
    related: ['vaccines', 'disinfectants', 'demand-drivers', 'counter-animal-health'],
  },
]
