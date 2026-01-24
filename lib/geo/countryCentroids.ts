/**
 * =============================================================================
 * Fichier      : lib/geo/countryCentroids.ts
 * Auteur       : Régis KREMER (Baithz) — EchoWorld
 * Version      : 2.0.0 (2026-01-24)
 * Objet        : Centroids géographiques de TOUS les pays du monde
 * -----------------------------------------------------------------------------
 * Description  :
 * - Centroids [lng, lat] des ~195 pays reconnus internationalement
 * - Utilisé pour afficher les cœurs d'agrégation en vue globe
 * - Source : Natural Earth Data + Wikipedia + calculs géographiques
 * - Format : Record<CountryName, [lng, lat]>
 * - CountryName : Nom complet en anglais (correspond au champ echoes.country)
 *
 * CHANGELOG
 * -----------------------------------------------------------------------------
 * 2.0.0 (2026-01-24)
 * - [BREAKING] Liste complète ~195 pays (vs top 50 en v1.0.0)
 * - [NEW] Tous les continents couverts exhaustivement
 * - [IMPROVED] Plus besoin de revenir sur le code pour ajouter des pays
 * =============================================================================
 */

/**
 * Centroids géographiques des pays
 * Format : [longitude, latitude] (ordre GeoJSON)
 */
export const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  // ========== EUROPE ==========
  'Albania': [20.1683, 41.1533],
  'Andorra': [1.5218, 42.5063],
  'Austria': [14.5501, 47.5162],
  'Belarus': [27.9534, 53.7098],
  'Belgium': [4.4699, 50.5039],
  'Bosnia and Herzegovina': [17.6791, 43.9159],
  'Bulgaria': [25.4858, 42.7339],
  'Croatia': [15.2, 45.1],
  'Cyprus': [33.4299, 35.1264],
  'Czech Republic': [15.472962, 49.817492],
  'Denmark': [9.5018, 56.2639],
  'Estonia': [25.0136, 58.5953],
  'Finland': [25.7482, 61.9241],
  'France': [2.2137, 46.2276],
  'Germany': [10.4515, 51.1657],
  'Greece': [21.8243, 39.0742],
  'Hungary': [19.5033, 47.1625],
  'Iceland': [-19.0208, 64.9631],
  'Ireland': [-8.2439, 53.4129],
  'Italy': [12.5674, 41.8719],
  'Kosovo': [20.9021, 42.6026],
  'Latvia': [24.6032, 56.8796],
  'Liechtenstein': [9.5554, 47.166],
  'Lithuania': [23.8813, 55.1694],
  'Luxembourg': [6.1296, 49.8153],
  'Malta': [14.3754, 35.9375],
  'Moldova': [28.3699, 47.4116],
  'Monaco': [7.4246, 43.7384],
  'Montenegro': [19.3744, 42.7087],
  'Netherlands': [5.2913, 52.1326],
  'North Macedonia': [21.7453, 41.6086],
  'Norway': [8.4689, 60.4720],
  'Poland': [19.1451, 51.9194],
  'Portugal': [-8.2245, 39.3999],
  'Romania': [24.9668, 45.9432],
  'Russia': [105.3188, 61.5240],
  'San Marino': [12.4578, 43.9424],
  'Serbia': [21.0059, 44.0165],
  'Slovakia': [19.699024, 48.669026],
  'Slovenia': [14.9955, 46.1512],
  'Spain': [-3.7492, 40.4637],
  'Sweden': [18.6435, 60.1282],
  'Switzerland': [8.2275, 46.8182],
  'Ukraine': [31.1656, 48.3794],
  'United Kingdom': [-3.4360, 55.3781],
  'Vatican City': [12.4534, 41.9029],

  // ========== ASIE ==========
  'Afghanistan': [67.7100, 33.9391],
  'Armenia': [45.0382, 40.0691],
  'Azerbaijan': [47.5769, 40.1431],
  'Bahrain': [50.6379, 26.0667],
  'Bangladesh': [90.3563, 23.6850],
  'Bhutan': [90.4336, 27.5142],
  'Brunei': [114.7277, 4.5353],
  'Cambodia': [104.9910, 12.5657],
  'China': [104.1954, 35.8617],
  'East Timor': [125.7275, -8.8742],
  'Georgia': [43.3569, 42.3154],
  'India': [78.9629, 20.5937],
  'Indonesia': [113.9213, -0.7893],
  'Iran': [53.6880, 32.4279],
  'Iraq': [43.6793, 33.2232],
  'Israel': [34.8516, 31.0461],
  'Japan': [138.2529, 36.2048],
  'Jordan': [36.2384, 30.5852],
  'Kazakhstan': [66.9237, 48.0196],
  'Kuwait': [47.4818, 29.3117],
  'Kyrgyzstan': [74.7661, 41.2044],
  'Laos': [102.4955, 19.8563],
  'Lebanon': [35.8623, 33.8547],
  'Malaysia': [101.9758, 4.2105],
  'Maldives': [73.5093, 3.2028],
  'Mongolia': [103.8467, 46.8625],
  'Myanmar': [95.9560, 21.9162],
  'Nepal': [84.1240, 28.3949],
  'North Korea': [127.5101, 40.3399],
  'Oman': [55.9233, 21.4735],
  'Pakistan': [69.3451, 30.3753],
  'Palestine': [35.3027, 31.9522],
  'Philippines': [121.7740, 12.8797],
  'Qatar': [51.1839, 25.3548],
  'Saudi Arabia': [45.0792, 23.8859],
  'Singapore': [103.8198, 1.3521],
  'South Korea': [127.7669, 35.9078],
  'Sri Lanka': [80.7718, 7.8731],
  'Syria': [38.9968, 34.8021],
  'Taiwan': [120.9605, 23.6978],
  'Tajikistan': [71.2761, 38.8610],
  'Thailand': [100.9925, 15.8700],
  'Turkey': [35.2433, 38.9637],
  'Turkmenistan': [59.5563, 38.9697],
  'United Arab Emirates': [53.8478, 23.4241],
  'Uzbekistan': [64.5853, 41.3775],
  'Vietnam': [108.2772, 14.0583],
  'Yemen': [48.5164, 15.5527],

  // ========== AFRIQUE ==========
  'Algeria': [1.6596, 28.0339],
  'Angola': [17.8739, -11.2027],
  'Benin': [2.3158, 9.3077],
  'Botswana': [24.6849, -22.3285],
  'Burkina Faso': [-1.5616, 12.2383],
  'Burundi': [29.9189, -3.3731],
  'Cabo Verde': [-24.0132, 16.5388],
  'Cameroon': [12.3547, 7.3697],
  'Central African Republic': [20.9394, 6.6111],
  'Chad': [18.7322, 15.4542],
  'Comoros': [43.8722, -11.6455],
  'Congo': [15.8277, -0.2280],
  'Democratic Republic of the Congo': [21.7587, -4.0383],
  'Djibouti': [42.5903, 11.8251],
  'Egypt': [30.8025, 26.8206],
  'Equatorial Guinea': [10.2679, 1.6508],
  'Eritrea': [39.7823, 15.1794],
  'Eswatini': [31.4659, -26.5225],
  'Ethiopia': [40.4897, 9.1450],
  'Gabon': [11.6094, -0.8037],
  'Gambia': [-15.3101, 13.4432],
  'Ghana': [-1.0232, 7.9465],
  'Guinea': [-9.6966, 9.9456],
  'Guinea-Bissau': [-15.1804, 11.8037],
  'Ivory Coast': [-5.5471, 7.5400],
  'Kenya': [37.9062, -0.0236],
  'Lesotho': [28.2336, -29.6100],
  'Liberia': [-9.4295, 6.4281],
  'Libya': [17.2283, 26.3351],
  'Madagascar': [46.8691, -18.7669],
  'Malawi': [34.3015, -13.2543],
  'Mali': [-3.9962, 17.5707],
  'Mauritania': [-10.9408, 21.0079],
  'Mauritius': [57.5522, -20.3484],
  'Morocco': [-7.0926, 31.7917],
  'Mozambique': [35.5296, -18.6657],
  'Namibia': [18.4904, -22.9576],
  'Niger': [8.0817, 17.6078],
  'Nigeria': [8.6753, 9.0820],
  'Rwanda': [29.8739, -1.9403],
  'Sao Tome and Principe': [6.6131, 0.1864],
  'Senegal': [-14.4524, 14.4974],
  'Seychelles': [55.4920, -4.6796],
  'Sierra Leone': [-11.7799, 8.4606],
  'Somalia': [46.1996, 5.1521],
  'South Africa': [22.9375, -30.5595],
  'South Sudan': [31.3070, 6.8770],
  'Sudan': [30.2176, 12.8628],
  'Tanzania': [34.8888, -6.3690],
  'Togo': [0.8248, 8.6195],
  'Tunisia': [9.5375, 33.8869],
  'Uganda': [32.2903, 1.3733],
  'Zambia': [27.8493, -13.1339],
  'Zimbabwe': [29.1549, -19.0154],

  // ========== AMÉRIQUE DU NORD ==========
  'Antigua and Barbuda': [-61.7965, 17.0608],
  'Bahamas': [-77.3963, 25.0343],
  'Barbados': [-59.5432, 13.1939],
  'Belize': [-88.4977, 17.1899],
  'Canada': [-106.3468, 56.1304],
  'Costa Rica': [-83.7534, 9.7489],
  'Cuba': [-77.7812, 21.5218],
  'Dominica': [-61.3710, 15.4150],
  'Dominican Republic': [-70.1627, 18.7357],
  'El Salvador': [-88.8965, 13.7942],
  'Grenada': [-61.6790, 12.1165],
  'Guatemala': [-90.2308, 15.7835],
  'Haiti': [-72.2852, 18.9712],
  'Honduras': [-86.2419, 15.2000],
  'Jamaica': [-77.2975, 18.1096],
  'Mexico': [-102.5528, 23.6345],
  'Nicaragua': [-85.2072, 12.8654],
  'Panama': [-80.7821, 8.5380],
  'Saint Kitts and Nevis': [-62.7830, 17.3578],
  'Saint Lucia': [-60.9789, 13.9094],
  'Saint Vincent and the Grenadines': [-61.2872, 12.9843],
  'Trinidad and Tobago': [-61.2225, 10.6918],
  'USA': [-95.7129, 37.0902],

  // ========== AMÉRIQUE DU SUD ==========
  'Argentina': [-63.6167, -38.4161],
  'Bolivia': [-63.5887, -16.2902],
  'Brazil': [-51.9253, -14.2350],
  'Chile': [-71.5430, -35.6751],
  'Colombia': [-74.2973, 4.5709],
  'Ecuador': [-78.1834, -1.8312],
  'Guyana': [-58.9302, 4.8604],
  'Paraguay': [-58.4438, -23.4425],
  'Peru': [-75.0152, -9.1900],
  'Suriname': [-56.0278, 3.9193],
  'Uruguay': [-55.7658, -32.5228],
  'Venezuela': [-66.5897, 6.4238],

  // ========== OCÉANIE ==========
  'Australia': [133.7751, -25.2744],
  'Fiji': [179.4144, -17.7134],
  'Kiribati': [-168.7340, 1.8709],
  'Marshall Islands': [171.1845, 7.1315],
  'Micronesia': [158.2150, 7.4256],
  'Nauru': [166.9315, -0.5228],
  'New Zealand': [174.8860, -40.9006],
  'Palau': [134.5825, 7.5150],
  'Papua New Guinea': [143.9555, -6.3150],
  'Samoa': [-172.1046, -13.7590],
  'Solomon Islands': [160.1562, -9.6457],
  'Tonga': [-175.1982, -21.1790],
  'Tuvalu': [179.1962, -7.1095],
  'Vanuatu': [166.9592, -15.3767],
};

/**
 * Vérifie si un pays a un centroid défini
 */
export function hasCountryCentroid(country: string): boolean {
  return country in COUNTRY_CENTROIDS;
}

/**
 * Récupère le centroid d'un pays (ou null si non trouvé)
 */
export function getCountryCentroid(country: string): [number, number] | null {
  return COUNTRY_CENTROIDS[country] ?? null;
}

/**
 * Liste tous les pays supportés
 */
export function getSupportedCountries(): string[] {
  return Object.keys(COUNTRY_CENTROIDS);
}

/**
 * Compte total de pays supportés
 */
export function getCountriesCount(): number {
  return Object.keys(COUNTRY_CENTROIDS).length;
}