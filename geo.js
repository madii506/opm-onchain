// Where a question lives on the map: the first keyword that matches picks the city its story happens in.
// Countries come before the US catch-all, so "will Maduro stay president" lands in Caracas, not Washington.
const P = [
  [/ukrain|kyiv|zelensk/, 50.45, 30.52, 'kyiv'], [/russia|putin|moscow|kremlin/, 55.75, 37.62, 'moscow'],
  [/\biran|tehran|khamenei/, 35.69, 51.39, 'tehran'], [/israel|gaza|netanyahu|hamas|west bank/, 31.77, 35.21, 'jerusalem'],
  [/lebanon|hezbollah|beirut/, 33.89, 35.5, 'beirut'], [/syria|damascus/, 33.51, 36.29, 'damascus'], [/yemen|houthi/, 15.37, 44.19, "sana'a"],
  [/saudi|riyadh/, 24.71, 46.68, 'riyadh'], [/turkey|türkiye|erdogan|ankara/, 39.93, 32.86, 'ankara'], [/qatar|doha/, 25.29, 51.53, 'doha'],
  [/north korea|kim jong|pyongyang/, 39.03, 125.75, 'pyongyang'], [/south korea|seoul/, 37.57, 126.98, 'seoul'],
  [/taiwan|taipei/, 25.03, 121.56, 'taipei'], [/china|chinese|beijing|xi jinping/, 39.9, 116.4, 'beijing'], [/japan|tokyo/, 35.68, 139.69, 'tokyo'],
  [/\bindia\b|indian|modi|delhi/, 28.61, 77.21, 'delhi'], [/pakistan|islamabad/, 33.68, 73.05, 'islamabad'],
  [/venezuela|maduro|caracas/, 10.48, -66.9, 'caracas'], [/mexico|sheinbaum/, 19.43, -99.13, 'mexico city'], [/canada|carney|ottawa/, 45.42, -75.7, 'ottawa'],
  [/brazil|lula|bolsonaro/, -15.79, -47.88, 'brasília'], [/argentin|milei/, -34.6, -58.38, 'buenos aires'], [/colombia/, 4.71, -74.07, 'bogotá'],
  [/\bchile\b/, -33.45, -70.67, 'santiago'], [/\bcuba|havana/, 23.11, -82.37, 'havana'], [/panama/, 8.98, -79.52, 'panama city'], [/greenland/, 64.18, -51.72, 'nuuk'],
  [/\bu\.?k\.?\b|britain|british|starmer|london|england|premier league|wimbledon/, 51.51, -0.13, 'london'], [/france|french|macron|paris/, 48.86, 2.35, 'paris'],
  [/german|merz|berlin|bundesliga/, 52.52, 13.4, 'berlin'], [/\bital(y|ian)|meloni|serie a/, 41.9, 12.5, 'rome'],
  [/spain|spanish|madrid|barcelona|la liga/, 40.42, -3.7, 'madrid'], [/poland|polish|warsaw/, 52.23, 21.01, 'warsaw'], [/sweden|swedish|stockholm/, 59.33, 18.07, 'stockholm'],
  [/\bnato\b|\beu\b|european union|brussels|\becb\b|champions league|eurovision/, 50.85, 4.35, 'brussels'],
  [/egypt|cairo/, 30.04, 31.24, 'cairo'], [/nigeria/, 9.08, 7.4, 'abuja'], [/south africa/, -25.75, 28.19, 'pretoria'], [/australia/, -35.28, 149.13, 'canberra'],
  [/openai|chatgpt|\bgpt|anthropic|claude|nvidia|apple|google|\bai\b|spacex|starship|tesla|robotaxi|microsoft|\bmeta\b/, 37.77, -122.42, 'san francisco'],
  [/oscar|grammy|emmy|movie|film|box office|album|taylor swift|netflix|hollywood|billboard/, 34.05, -118.24, 'los angeles'],
  [/\bfed\b|interest rate|rate cut|inflation|recession|\bgdp\b|s&p|nasdaq|dow jones|stock|\bipo\b|earnings|tariff|unemployment/, 40.71, -74.01, 'new york'],
  [/\bnba\b|\bnfl\b|\bmlb\b|\bnhl\b|super bowl|world series|stanley cup|ncaa|thunder|celtics|lakers|chiefs|eagles|yankees|dodgers/, 40.75, -73.99, 'new york'],
  [/\bu\.?s\.?\b|united states|america|trump|biden|harris|vance|newsom|senate|congress|house|midterm|governor|white house|supreme court|democrat|republican|president/, 38.9, -77.04, 'washington'],
];
export function geoOf(text) { const t = String(text || '').toLowerCase(); for (const [re, lat, lon, name] of P) if (re.test(t)) return { lat, lon, name }; return null; }
