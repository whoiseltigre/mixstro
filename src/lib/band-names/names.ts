/**
 * Hand-written band names, by genre and by vibe. These carry the generator: real band names
 * are found phrases, odd specific objects, places and small scenes, not random word mashups.
 *
 * Rules for adding names: say it out loud; it should sound like a band someone already likes.
 * No respellings, no two nouns glued together unless it reads as one word (Pyreward, Ironwake),
 * no well-known band names, and nothing the `clean` filter rejects. Names are split on "|".
 */

const list = (s: string) => s.split("|").map((n) => n.trim()).filter(Boolean);

export type GenreWords = {
  /** Complete names. Most of every batch comes from here. */
  names: string[];
  /** "The <adj> <plural>": every adjective must work with every plural. */
  adj: string[];
  plural: string[];
  /** Endings for a word you type: "<Word> Revival", "<Word>grave" (glued when it starts lowercase). */
  suffix: string[];
};

export const GENRE_WORDS = {
  rock: {
    names: list(`Copper Engine|Gasoline Choir|The Night Porters|Rust Belt Saints|Highway Static|Velvet Static|Red Line Radio|The Loose Screws|Twin Exhaust|Mile Marker|The Gravel Kings|Thunder Motel|Blacktop Prophets|Smoke Signal Club|Rattlesnake Radio|Electric Barn|The Tailgates|Last Exit West|Overdrive Union|Muscle Car Gospel|Neon Diner|Iron Horse Social|Jukebox Rebels|Junkyard Saints|The Spark Plugs|Burnt Rubber|Desert Highway|Gravel Gospel|Big Engine|Fuse Box|Downshift|The Roadhouse Kings|Cherry Bomb Social|Muddy Boots|Long Haul|Rusted Chrome|Static Kings|Bonfire Avenue|The Loud Neighbors|Wild Engines|Heavy Weather Club|Motor City Ghosts|Copper Sun|Exit Wound Radio|The Amp Thieves|Feedback Loop|Gas Station Roses|Brake Lights|Blown Speaker|The Late Model|Rear View Revival|Riverside Riot|The Pawn Shop Kings|Crooked Lightning|Six Lane Gospel|Cold Engine|The Hot Rods|Tin Can Thunder|Sunset Mechanics`),
    adj: list(`Midnight|Loose|Wild|Electric|Rusty|Highway|Gravel|Burning|Restless|Neon|Copper|Thunder`),
    plural: list(`Motors|Saints|Wildcats|Pistons|Kings|Prophets|Ramblers|Engines|Rebels|Outlaws|Headlights|Strays|Drifters|Sparks|Mechanics`),
    suffix: list(`Highway|Motors|Revival|Overdrive|Radio|Engine|Kings|Union|Riot|Static`),
  },
  indie: {
    names: list(`Porch Weather|Parking Receipt|Sunday Paper|Guest Room|Pocket Pigeon|Moth Radio|Glass Orchard|Paper Satellites|Sunday Practice|Copper Season|Call Again in June|Meet Me Sunday|The Borrowed Lights|Low Tide Choir|Quiet Engines|Library Fines|Soft Weather|The Spare Keys|Attic Fan|Postcard Club|Small Hours Society|Teacup Parade|Lost Mitten|Laundromat|Window Seat|Kite Season|The Night Bus|Lemon Ghost|Cardigan Weather|Holiday Sweater|Rooftop Garden|Orange Juice Sky|The Small Print|Hotel Stationery|Weekend Friends|Fern Club|Spare Room|Coin Laundry|Cassette Weather|Telephone Wire|Lamp Store|Grocery Flowers|Bus Shelter|The Paperweights|Sleepy Driver|Cloud Department|Library Ghosts|Lighthouse Keeper|Bird Feeder|Thrift Store Saints|Pen Pal|Open Window|Pocket Change Choir|Late Checkout|The Houseplants|Rainy Matinee|Corner Booth|Dog Ear|Shoebox Letters|The Lost Umbrellas`),
    adj: list(`Borrowed|Paper|Sleepy|Quiet|Sunday|Pocket|Crooked|Small|Lost|Spare|Distant|Rented`),
    plural: list(`Lights|Keys|Umbrellas|Houseplants|Satellites|Postcards|Pigeons|Kites|Lanterns|Neighbors|Cassettes|Tourists|Bicycles`),
    suffix: list(`Weather|Season|Club|Radio|Practice|Society|Receipt|Parade|Department|Choir`),
  },
  punk: {
    names: list(`The Late Fees|Noise Complaint|Pay Cut|Rent Strike|Spare Change Riot|The Overdrafts|Busted Lip Club|The Parking Tickets|Basement Lease|Bad Credit|Safety Pin Saints|The Landlords|Eviction Notice|Teenage Overtime|Cheap Rent|The Dropouts|Minimum Wage|Petty Theft|Broken Turnstile|Wet Paint|No Refunds|Discount Saints|The Fire Exits|Gutter Cats|Fake ID|The Detentions|Bus Fare|Out of Order|Dead Battery|Cold Pizza Riot|The Shoplifters|Static Cling|Sour Milk|Off Brand|The Repo Men|Zip Tie|The Hall Monitors|Unpaid Interns|Second Notice|The Bad Checks|Wrong Address|Last Warning|Cracked Screen|Loitering|The Trespassers|Wrong Bus|Bent Spoons|Vending Machine|Sticky Floors|The Strays|Tow Zone|Snooze Button|Broken Lease|The Cheap Seats|Overdue|Bad Haircut|The Stage Divers|No Parking|Spilled Soda|Rusty Stapler`),
    adj: list(`Cheap|Broke|Feral|Bent|Busted|Overdue|Teenage|Rotten|Sour|Angry|Unpaid|Loud`),
    plural: list(`Landlords|Dropouts|Strays|Tickets|Neighbors|Interns|Rats|Sirens|Vandals|Shoplifters|Trespassers|Hall Monitors`),
    suffix: list(`Riot|Strike|Violation|Complaint|Problem|Club|Notice|Kids|Union|Overdrive`),
  },
  metal: {
    names: list(`Iron Reliquary|Pyreward|Grave Orchard|Cinder Throne|The Hollow Choir|Bone Lantern|Black Tithe|Ossuary Bloom|Wolves of the Barrow|Anvilborn|Night Sepulchre|Gallows Weather|Saltgrave|The Ninth Furnace|Cathedral of Rust|Hexmouth|Charnel Moon|Ironwake|Ash Covenant|Crypt Lantern|Vultures at Vespers|Ember Tomb|The Drowned Bell|Coldforge|Throne of Wasps|Grimward|Barrow King|Blackthorn Rite|Sulfur Hymnal|The Iron Hour|Mausoleum Sun|Dread Meridian|Funeral Weather|Obsidian Mass|Hollowcrown|Thornmother|Glacier Tomb|Scorched Psalm|Wolfspire|Ninefold Ash|The Gallows Choir|Cairnbreaker|Lead Saint|Witchfire Engine|Basalt Oath|Skull Orchard|Viper Liturgy|Shroudwalker|Grave Machinery|Black Salt Rite|Ironmoss|Plague Bell|Cinderghast|Rust Chapel|Carrion Crown|Pale Furnace|The Ash Kings|Tomb of Antlers|Wraithwake|Hammer of Embers`),
    adj: list(`Iron|Ashen|Hollow|Black|Drowned|Burning|Pale|Frozen|Cursed|Ancient|Silent|Bleeding`),
    plural: list(`Kings|Wolves|Crowns|Furnaces|Graves|Thrones|Bells|Ravens|Altars|Serpents|Gallows|Wraiths|Hammers|Pyres|Tombs`),
    suffix: list(`grave|wake|forge|Pyre|Rite|Throne|Hymnal|Covenant|Tomb|Liturgy`),
  },
  jazz: {
    names: list(`Last Set|Blue Hour|Night Porter|The Blue Hour Union|After Midnight Quartet|Late Train Trio|The Velvet Room|Smoke Ring Sextet|Brass Tacks|Lenox Avenue Trio|The Last Call Five|Saturday Brass|Crescent Street Quartet|Half Note Social|Moonlight Standards|Amber Lamp Trio|Walking Bass Club|Ballroom Ghosts|Cigar Box Quartet|Sharp Eleven|Blue Lantern|The Swing Shift|Satin Hour|Night Owl Trio|The Brushwork|Uptown Standard|Rooftop Sessions|Copper Mute|The Gin Rummy Five|Supper Club Quartet|Dim Lights Trio|Velvet Changes|Second Line Social|Low Lamp|The Coat Check|Back Room Trio|Bluebird Quintet|Downbeat Society|The Late Shift|Midnight Matinee|Lamp Post Quartet|Rainy Day Standards|The Cufflinks|Hotel Lobby Trio|Brass Lantern|Seventh Street Sextet|The Ninth Chord|Smoky Room|Satin Doll Society|Last Train Home Trio|The House Band|Tuesday Night Quartet|Valve & Reed|Corner Table Trio|Moon Over Lenox|The Slow Burners`),
    adj: list(`Late|Velvet|Midnight|Blue|Satin|Uptown|Smoky|Golden|Lazy|Rainy|Copper|Quiet`),
    plural: list(`Standards|Changes|Lanterns|Porters|Cufflinks|Brushes|Hours|Saxophones|Matinees|Owls|Regulars|Bandstands|Ballads`),
    suffix: list(`Trio|Quartet|Quintet|Standard|After Hours|Sessions|Society|Brass|Sextet|Hour`),
  },
  "hip-hop": {
    names: list(`Corner Store|Paper Route|Night Shift|Crate Diggers Union|Boom Box Society|Block Party Collective|The Cypher Club|Dusty Fingers|Golden Era Collective|Sample Clearance|Second Hand Beats|Cassette Kids|The Loop Kings|Bus Stop Poets|Lunch Money|Fire Escape|Street Lamp Collective|Rooftop Cypher|Late Pass|The Mixtape Saints|Double Dutch|Block Captains|Corner Kings|Sidewalk Chalk|Laundromat Lyrics|Brick City Collective|Turntable Ghosts|Sneaker Box|Vinyl Ledger|Bodega Cats|Stoop Kids|Subway Sermon|The Night Ledger|Headphone Weather|Gold Chain Choir|Pager Era|Payphone Poets|Tape Deck Society|Concrete Choir|The Lunch Table|Fresh Batteries|Rent Party|Crosstown Collective|Free Throws|The Night Owls|Bus Pass|Sample Library|Breakbeat Society|Penny Candy|Block Radio|Two Turntables|Back Seat Cypher|Cardboard Kings|Rooftop Radio|The Late Bloomers`),
    adj: list(`Golden|Dusty|Late|Fresh|Crosstown|Uptown|Rooftop|Corner|Night|Basement|Boom Bap|Brick`),
    plural: list(`Poets|Kings|Captains|Cyphers|Diggers|Tapes|Owls|Breaks|Loops|Saints|Scribes|Stoops`),
    suffix: list(`Collective|Cypher|Tapes|Society|Radio|Edition|Ledger|Kings|Crew|Union`),
  },
  country: {
    names: list(`County Line|Gravel Road|Last Acre|Dust Bowl Choir|Prairie Fire Revival|Tin Roof Sunday|Rusty Spur|Back Forty|Hollow Creek Ramblers|The Feed Store|Lonesome Pine Union|Red Dirt Revival|The Fence Menders|Pickup Truck Gospel|Sagebrush Social|Mesa Drifters|Creek Bed|Two Lane Highway|The Hay Bales|Barn Dance Saints|Cattle Guard|Copper Canyon Ramblers|Front Porch Preachers|Windmill Choir|Grain Elevator|Dry County|Truck Stop Angels|The Prairie Dogs|Lantern Hill|Stockyard|Rain Barrel|Silver Buckle|Tumbleweed Motel|Lonesome Mile|High Plains Choir|Muddy Creek Revival|Cotton Gin|Dusty Boots|Bootleg County|Old Mill Road|Sunday Supper Band|Blackwater Creek|Rattlesnake Ridge|The Wildflowers|Gravel Saints|Porch Swing|Long Gone Ramblers|The Fiddle Back|Saddle Soap|Hometown Static|Grange Hall|The Fence Line|Cottonwood|Chicken Wire|Barbed Wire Choir|Salt Lick|Cast Iron Sunday`),
    adj: list(`Dusty|Lonesome|Red Dirt|Rusty|Muddy|Gravel|Prairie|Sunday|Rambling|Painted|Blackwater|High Plains`),
    plural: list(`Ramblers|Drifters|Spurs|Saints|Preachers|Cowhands|Wildflowers|Fence Menders|Mules|Riders|Lanterns|Pickups|Fiddlers|Bandits|Horseshoes`),
    suffix: list(`County|Ramblers|Creek|Revival|Ridge|Drifters|Sunday|Road|Choir|Line`),
  },
  folk: {
    names: list(`Field Notes|Mill Pond|Wool Thread|The Willow Choir|Orchard Lantern|Hollow Oak Society|Wren & the Woodpile|Kindling Song|River Birch|Fox Hollow|The Hedgerows|Quiet Harvest|Spindle & Hearth|The Low Meadows|Juniper Hymnal|Bramble Union|The Lamplighters|Old Ferry|Wild Thyme|Cedar Smoke|Acorn Almanac|Barn Owl Choir|Moss & Lantern|Stone Bridge Singers|Little Fieldmouse|Woodstove|Linen & Lark|Hearthstone|The Brook Trout|Northwind Almanac|Copper Kettle|Lantern Fair|Morning Chores|The Weathervanes|Honeycomb Hollow|Pinecone Parade|Thistle & Thorn|Hayloft|Dandelion Clocks|Rowan Tree|The Wanderlings|Blackberry Bramble|Little Lamp|Cider House|Maple Hollow|Salt Marsh Singers|The Driftwood Choir|Riverstone|Firefly Almanac|The Apple Pickers|Quilting Bee|Woodsmoke|Lark Ascending|The Ferrymen|Birch & Bell`),
    adj: list(`Willow|Woven|Mossy|Quiet|Little|Wandering|Hollow|Northern|Cedar|Morning|Wild|Gentle`),
    plural: list(`Wrens|Larks|Lamplighters|Hedgerows|Ferrymen|Weathervanes|Fiddles|Orchards|Meadows|Pickers|Lanterns|Thistles|Foxes|Kettles|Shepherds`),
    suffix: list(`Almanac|Hollow|Hymnal|Singers|Choir|Society|Union|Ferry|Meadow|Fair`),
  },
  electronic: {
    names: list(`Phase Drift|Relay Signal|Glass Grid|Night Arcade|Neon Ferry|Signal Bloom|Quiet Satellite|Pixel Harbor|Low Orbit|Prism Club|Static Garden|Circuit Choir|Soft Machinery|Pulse Motel|Afterglow Systems|Laser Botany|Echo Department|Mirror Ball Union|Sine Garden|Magnetic North|Modem Hymns|Late Data|Night Mode|Glow Stick Saints|Analog Ghost|Chrome Lagoon|Ultraviolet Club|Sub Station|Sleep Mode|Halogen|Electric Orchard|Binary Sunset|Satellite Gardens|Coolant|Vapor Trail|Neon Tide|Data Rain|Hologram Choir|Cold Start|Strobe Season|The Night Servers|Midnight Uplink|Fiber Optic|Glass Signal|Velvet Circuit|Polar Pulse|Lumen Drive|Tape Hiss|Screen Glow|Airplane Mode|Night Bus Radio|Ghost Frequency|Sodium Lights|Server Farm|Quartz Hour`),
    adj: list(`Neon|Liquid|Modular|Binary|Silent|Chrome|Ultraviolet|Polar|Glass|Velvet|Analog|Magnetic`),
    plural: list(`Signals|Satellites|Circuits|Servers|Prisms|Relays|Frequencies|Pixels|Lasers|Arcades|Strobes|Modems|Orbits|Machines`),
    suffix: list(`Signal|Systems|Mode|wave|Club|Frequency|Station|Circuit|Garden|Drive`),
  },
  pop: {
    names: list(`Peach Soda|Flash Photo|Day Trip|Candy Weather|Summer Receipt|Glitter Hour|Pink Lemonade Club|Sugar Rush Social|Bubblegum Weather|Rollerskate Summer|Velvet Sky|Sunday Sundae|Strawberry Static|Shiny Things|Mirror Selfie|Neon Peach|Prom Weather|Bright Side Club|Tangerine Radio|Pool Party|Cherry Cola Club|Lip Gloss Summer|Disco Daydream|Gold Star|Cotton Candy Kids|Holiday Glow|Starlight Mall|Spark Parade|Honey Rush|Pastel Hour|Sunroof|Twinkle Club|Shooting Star Social|Lemon Drop|Afterparty|Main Character|Weekend Mode|Sticker Book|Flower Crown Club|Popsicle Summer|Bright Lights Club|Group Chat|Polaroid Party|Glitter Gym|Sundress Weather|Confetti Hour|Phone Case|Mall Rats Club|Pink Sky Radio|Sparkle Motion|Sunny Side Club|Scrunchie|Bubble Bath|Rooftop Party|Gold Hoops`),
    adj: list(`Candy|Silver|Fizzy|Peach|Golden|Pink|Shiny|Sunny|Bubblegum|Pastel|Glitter|Cherry`),
    plural: list(`Ribbons|Balloons|Sparklers|Popsicles|Sequins|Daydreams|Mirrors|Sodas|Stickers|Starlets|Afterparties|Polaroids|Charms`),
    suffix: list(`Summer|Club|Pop|Radio|Party|Hour|Parade|Social|Weather|Season`),
  },
} satisfies Record<string, GenreWords>;

/** Mixed into any genre's batch when a vibe is picked. */
export const VIBE_NAMES: Record<string, string[]> = {
  dark: list(`Black Lantern|Hollow Hour|Ghost Orchard|Midnight Ferry|The Pale Hours|Raven Hotel|Shadow Department|Grave Weather|Night Cathedral|Ashfall|Bone Garden|Cold Chapel|Crow Season|The Vespers|Dead Letter Office|Thornfield|Low Moon|Velvet Coffin|Blackwater|Haunted Motel|The Last Lamp|Nightshade Union|Widow's Walk|Candle Smoke|The Long Night`),
  dreamy: list(`Soft Focus|Lunar Garden|Pillow Fort|Halo Motel|Slow Satellite|Dream Pool|Lagoon Hour|Velvet Fog|Petal Static|Glass Swans|Sleepwalk Club|Daydream Union|Haze Garden|Silver Lagoon|Floating Lanterns|Starlight Laundry|Feather Weather|Pastel Ghosts|The Sleepy Hours|Cloudberry|Nightlight|Drift Club|Moon Pool|Sea Glass|Cotton Clouds`),
  funny: list(`Pickle Diplomacy|Kazoo Emergency|Soggy Waffles|Noodle Incident|Spatula Union|The Wobbly Chairs|Crispy Pigeons|Lukewarm Coffee|Parallel Parking|The Lost Socks|Dad Joke Society|Reply All|Wrong Number|Assembly Required|The Expired Coupons|Tax Season|Group Project|Out of Office|Extra Pickles|Free Refills|Small Talk|Grandma's Wifi|Microwave Dinner|Loading Screen|The Forgotten Passwords`),
  gritty: list(`Rivet & Brick|Cracked Asphalt|Diesel Choir|Steel Toe|Scrap Yard|Brick Dust|Grease Trap|Concrete Hymns|Cinder Block|Burnt Coffee|Night Shift Union|Oil Rag|Loading Dock|Freight Yard|Gravel Mouth|Rough Cut|Busted Knuckles|Smokestack|Sandpaper|Stray Bolts|Back Alley|Dirt Floor|Rebar|Pipe Wrench|Shift Whistle`),
  retro: list(`Jukebox Weather|Analog Summer|Velvet Ballroom|Drive-In Saints|Sepia Hour|Rotary Phone|Vinyl Saturday|Malt Shop|Reel to Reel|Chrome Bumper|Soda Fountain|Transistor Radio|Station Wagon|Roller Rink|Polaroid Summer|Motel Neon|Hi-Fi Club|Sock Hop|Diner Lights|Phonograph|Starlite Drive-In|Atomic Lounge|Wood Paneling|Shag Carpet|Ballroom Ghosts`),
};

/** Endings any word can take, on top of the genre's own. */
export const COMMON_SUFFIX = list(`Club|Union|Society|Season|Motel|Parade|Radio|Hour|Social|Department|Lights|Choir`);
/** Openings any word can take. */
export const COMMON_PREFIX = list(`Saint|Little|Young|Ghost of|Hotel`);

/** Images for "Just set the mood": words that suggest the place or thing without naming it. */
export const IMAGERY: Record<string, string[]> = {
  garage: list(`Side Door|Bare Bulb|Concrete|Oil Rag|Practice Room|Workbench|Extension Cord`),
  ocean: list(`Low Tide|Breaker|Salt Line|Undertow|Driftwood|Sea Glass|Tide Pool`),
  sea: list(`Low Tide|Breaker|Salt Line|Undertow|Driftwood|Sea Glass|Tide Pool`),
  night: list(`Last Bus|Porch Light|Night Shift|Moon|Streetlight|Small Hours|Night Owl`),
  rain: list(`Downpour|Gutter|Tin Roof|Puddle|Umbrella|Drizzle|Storm Drain`),
  fire: list(`Ember|Ash|Kindling|Smoke|Matchbook|Bonfire|Cinder`),
  river: list(`Riverbend|Ferry|Undertow|Riverstone|Mill Race|Low Water|Delta`),
  city: list(`Crosstown|Fire Escape|Subway|Rooftop|Streetlight|Bodega|Overpass`),
  summer: list(`Heatwave|Sunburn|Pool Day|Lemonade|Firefly|Sprinkler|Long Weekend`),
  winter: list(`Frost|Snow Day|Cold Snap|Woodstove|Black Ice|Sleet|Wool Coat`),
  desert: list(`Mesa|Sagebrush|Dust Devil|Mirage|Saguaro|Heat Shimmer|Dry Wash`),
  forest: list(`Pine|Fern|Hollow|Birch|Moss|Clearing|Deadfall`),
  space: list(`Low Orbit|Satellite|Comet|Moonbase|Starfield|Zero Gravity|Launchpad`),
};
