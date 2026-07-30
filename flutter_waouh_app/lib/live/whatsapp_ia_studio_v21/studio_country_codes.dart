import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class StudioCountryDialCode {
  const StudioCountryDialCode({
    required this.name,
    required this.iso2,
    required this.dialCode,
  });

  final String name;
  final String iso2;
  final String dialCode;

  String get flag {
    final code = iso2.toUpperCase();
    if (code.length != 2) return '🌐';
    return String.fromCharCodes(
      code.codeUnits.map((unit) => unit + 127397),
    );
  }

  String get label => '$flag +$dialCode';
}

class StudioPhoneParts {
  const StudioPhoneParts({
    required this.country,
    required this.nationalNumber,
  });

  final StudioCountryDialCode country;
  final String nationalNumber;

  String get e164 => '+${country.dialCode}$nationalNumber';
}

class StudioCountryCodes {
  const StudioCountryCodes._();

  static const benin = StudioCountryDialCode(
    name: 'Bénin',
    iso2: 'BJ',
    dialCode: '229',
  );

  static const all = <StudioCountryDialCode>[
    StudioCountryDialCode(name: 'Afghanistan', iso2: 'AF', dialCode: '93'),
    StudioCountryDialCode(name: 'Afrique du Sud', iso2: 'ZA', dialCode: '27'),
    StudioCountryDialCode(name: 'Albanie', iso2: 'AL', dialCode: '355'),
    StudioCountryDialCode(name: 'Algérie', iso2: 'DZ', dialCode: '213'),
    StudioCountryDialCode(name: 'Allemagne', iso2: 'DE', dialCode: '49'),
    StudioCountryDialCode(name: 'Andorre', iso2: 'AD', dialCode: '376'),
    StudioCountryDialCode(name: 'Angola', iso2: 'AO', dialCode: '244'),
    StudioCountryDialCode(name: 'Anguilla', iso2: 'AI', dialCode: '1264'),
    StudioCountryDialCode(
        name: 'Antigua-et-Barbuda', iso2: 'AG', dialCode: '1268'),
    StudioCountryDialCode(name: 'Arabie Saoudite', iso2: 'SA', dialCode: '966'),
    StudioCountryDialCode(name: 'Argentine', iso2: 'AR', dialCode: '54'),
    StudioCountryDialCode(name: 'Arménie', iso2: 'AM', dialCode: '374'),
    StudioCountryDialCode(name: 'Aruba', iso2: 'AW', dialCode: '297'),
    StudioCountryDialCode(name: 'Australie', iso2: 'AU', dialCode: '61'),
    StudioCountryDialCode(name: 'Autriche', iso2: 'AT', dialCode: '43'),
    StudioCountryDialCode(name: 'Azerbaïdjan', iso2: 'AZ', dialCode: '994'),
    StudioCountryDialCode(name: 'Bahamas', iso2: 'BS', dialCode: '1242'),
    StudioCountryDialCode(name: 'Bahreïn', iso2: 'BH', dialCode: '973'),
    StudioCountryDialCode(name: 'Bangladesh', iso2: 'BD', dialCode: '880'),
    StudioCountryDialCode(name: 'Barbade', iso2: 'BB', dialCode: '1246'),
    StudioCountryDialCode(name: 'Belgique', iso2: 'BE', dialCode: '32'),
    StudioCountryDialCode(name: 'Belize', iso2: 'BZ', dialCode: '501'),
    StudioCountryDialCode(name: 'Bermudes', iso2: 'BM', dialCode: '1441'),
    StudioCountryDialCode(name: 'Bhoutan', iso2: 'BT', dialCode: '975'),
    StudioCountryDialCode(name: 'Biélorussie', iso2: 'BY', dialCode: '375'),
    StudioCountryDialCode(name: 'Bolivie', iso2: 'BO', dialCode: '591'),
    StudioCountryDialCode(
        name: 'Bonaire, Saint-Eustache et Saba', iso2: 'BQ', dialCode: '599'),
    StudioCountryDialCode(
        name: 'Bosnie-Herzégovine', iso2: 'BA', dialCode: '387'),
    StudioCountryDialCode(name: 'Botswana', iso2: 'BW', dialCode: '267'),
    StudioCountryDialCode(name: 'Brunei', iso2: 'BN', dialCode: '673'),
    StudioCountryDialCode(name: 'Brésil', iso2: 'BR', dialCode: '55'),
    StudioCountryDialCode(name: 'Bulgarie', iso2: 'BG', dialCode: '359'),
    StudioCountryDialCode(name: 'Burkina Faso', iso2: 'BF', dialCode: '226'),
    StudioCountryDialCode(name: 'Burundi', iso2: 'BI', dialCode: '257'),
    StudioCountryDialCode(name: 'Bénin', iso2: 'BJ', dialCode: '229'),
    StudioCountryDialCode(name: 'Cambodge', iso2: 'KH', dialCode: '855'),
    StudioCountryDialCode(name: 'Cameroun', iso2: 'CM', dialCode: '237'),
    StudioCountryDialCode(name: 'Canada', iso2: 'CA', dialCode: '1'),
    StudioCountryDialCode(name: 'Cap Vert', iso2: 'CV', dialCode: '238'),
    StudioCountryDialCode(name: 'Chili', iso2: 'CL', dialCode: '56'),
    StudioCountryDialCode(name: 'Chine', iso2: 'CN', dialCode: '86'),
    StudioCountryDialCode(name: 'Chypre', iso2: 'CY', dialCode: '357'),
    StudioCountryDialCode(name: 'Colombie', iso2: 'CO', dialCode: '57'),
    StudioCountryDialCode(name: 'Comores', iso2: 'KM', dialCode: '269'),
    StudioCountryDialCode(name: 'Congo', iso2: 'CG', dialCode: '242'),
    StudioCountryDialCode(
        name: 'Congo (Rép. dém.)', iso2: 'CD', dialCode: '243'),
    StudioCountryDialCode(name: 'Corée du Nord', iso2: 'KP', dialCode: '850'),
    StudioCountryDialCode(name: 'Corée du Sud', iso2: 'KR', dialCode: '82'),
    StudioCountryDialCode(name: 'Costa Rica', iso2: 'CR', dialCode: '506'),
    StudioCountryDialCode(name: 'Croatie', iso2: 'HR', dialCode: '385'),
    StudioCountryDialCode(name: 'Cuba', iso2: 'CU', dialCode: '53'),
    StudioCountryDialCode(name: 'Curaçao', iso2: 'CW', dialCode: '599'),
    StudioCountryDialCode(name: 'Côte d\'Ivoire', iso2: 'CI', dialCode: '225'),
    StudioCountryDialCode(name: 'Danemark', iso2: 'DK', dialCode: '45'),
    StudioCountryDialCode(name: 'Djibouti', iso2: 'DJ', dialCode: '253'),
    StudioCountryDialCode(name: 'Dominique', iso2: 'DM', dialCode: '1767'),
    StudioCountryDialCode(name: 'Espagne', iso2: 'ES', dialCode: '34'),
    StudioCountryDialCode(name: 'Estonie', iso2: 'EE', dialCode: '372'),
    StudioCountryDialCode(name: 'Fidji', iso2: 'FJ', dialCode: '679'),
    StudioCountryDialCode(name: 'Finlande', iso2: 'FI', dialCode: '358'),
    StudioCountryDialCode(name: 'France', iso2: 'FR', dialCode: '33'),
    StudioCountryDialCode(name: 'Gabon', iso2: 'GA', dialCode: '241'),
    StudioCountryDialCode(name: 'Gambie', iso2: 'GM', dialCode: '220'),
    StudioCountryDialCode(name: 'Ghana', iso2: 'GH', dialCode: '233'),
    StudioCountryDialCode(name: 'Gibraltar', iso2: 'GI', dialCode: '350'),
    StudioCountryDialCode(name: 'Grenade', iso2: 'GD', dialCode: '1473'),
    StudioCountryDialCode(name: 'Groenland', iso2: 'GL', dialCode: '299'),
    StudioCountryDialCode(name: 'Grèce', iso2: 'GR', dialCode: '30'),
    StudioCountryDialCode(name: 'Guadeloupe', iso2: 'GP', dialCode: '590'),
    StudioCountryDialCode(name: 'Guam', iso2: 'GU', dialCode: '1671'),
    StudioCountryDialCode(name: 'Guatemala', iso2: 'GT', dialCode: '502'),
    StudioCountryDialCode(name: 'Guayane', iso2: 'GF', dialCode: '594'),
    StudioCountryDialCode(name: 'Guernesey', iso2: 'GG', dialCode: '44'),
    StudioCountryDialCode(name: 'Guinée', iso2: 'GN', dialCode: '224'),
    StudioCountryDialCode(name: 'Guinée-Bissau', iso2: 'GW', dialCode: '245'),
    StudioCountryDialCode(
        name: 'Guinée-Équatoriale', iso2: 'GQ', dialCode: '240'),
    StudioCountryDialCode(name: 'Guyane', iso2: 'GY', dialCode: '592'),
    StudioCountryDialCode(name: 'Géorgie', iso2: 'GE', dialCode: '995'),
    StudioCountryDialCode(
        name: 'Géorgie du Sud-et-les Îles Sandwich du Sud',
        iso2: 'GS',
        dialCode: '500'),
    StudioCountryDialCode(name: 'Haïti', iso2: 'HT', dialCode: '509'),
    StudioCountryDialCode(name: 'Honduras', iso2: 'HN', dialCode: '504'),
    StudioCountryDialCode(name: 'Hong Kong', iso2: 'HK', dialCode: '852'),
    StudioCountryDialCode(name: 'Hongrie', iso2: 'HU', dialCode: '36'),
    StudioCountryDialCode(name: 'Inde', iso2: 'IN', dialCode: '91'),
    StudioCountryDialCode(name: 'Indonésie', iso2: 'ID', dialCode: '62'),
    StudioCountryDialCode(name: 'Irak', iso2: 'IQ', dialCode: '964'),
    StudioCountryDialCode(name: 'Iran', iso2: 'IR', dialCode: '98'),
    StudioCountryDialCode(name: 'Irlande', iso2: 'IE', dialCode: '353'),
    StudioCountryDialCode(name: 'Islande', iso2: 'IS', dialCode: '354'),
    StudioCountryDialCode(name: 'Israël', iso2: 'IL', dialCode: '972'),
    StudioCountryDialCode(name: 'Italie', iso2: 'IT', dialCode: '39'),
    StudioCountryDialCode(name: 'Jamaïque', iso2: 'JM', dialCode: '1876'),
    StudioCountryDialCode(name: 'Japon', iso2: 'JP', dialCode: '81'),
    StudioCountryDialCode(name: 'Jersey', iso2: 'JE', dialCode: '44'),
    StudioCountryDialCode(name: 'Jordanie', iso2: 'JO', dialCode: '962'),
    StudioCountryDialCode(name: 'Kazakhstan', iso2: 'KZ', dialCode: '7'),
    StudioCountryDialCode(name: 'Kenya', iso2: 'KE', dialCode: '254'),
    StudioCountryDialCode(name: 'Kirghizistan', iso2: 'KG', dialCode: '996'),
    StudioCountryDialCode(name: 'Kiribati', iso2: 'KI', dialCode: '686'),
    StudioCountryDialCode(name: 'Kosovo', iso2: 'XK', dialCode: '383'),
    StudioCountryDialCode(name: 'Koweït', iso2: 'KW', dialCode: '965'),
    StudioCountryDialCode(name: 'Laos', iso2: 'LA', dialCode: '856'),
    StudioCountryDialCode(name: 'Lesotho', iso2: 'LS', dialCode: '266'),
    StudioCountryDialCode(name: 'Lettonie', iso2: 'LV', dialCode: '371'),
    StudioCountryDialCode(name: 'Liban', iso2: 'LB', dialCode: '961'),
    StudioCountryDialCode(name: 'Liberia', iso2: 'LR', dialCode: '231'),
    StudioCountryDialCode(name: 'Libye', iso2: 'LY', dialCode: '218'),
    StudioCountryDialCode(name: 'Liechtenstein', iso2: 'LI', dialCode: '423'),
    StudioCountryDialCode(name: 'Lituanie', iso2: 'LT', dialCode: '370'),
    StudioCountryDialCode(name: 'Luxembourg', iso2: 'LU', dialCode: '352'),
    StudioCountryDialCode(name: 'Macao', iso2: 'MO', dialCode: '853'),
    StudioCountryDialCode(name: 'Macédoine', iso2: 'MK', dialCode: '389'),
    StudioCountryDialCode(name: 'Madagascar', iso2: 'MG', dialCode: '261'),
    StudioCountryDialCode(name: 'Malaisie', iso2: 'MY', dialCode: '60'),
    StudioCountryDialCode(name: 'Malawi', iso2: 'MW', dialCode: '265'),
    StudioCountryDialCode(name: 'Maldives', iso2: 'MV', dialCode: '960'),
    StudioCountryDialCode(name: 'Mali', iso2: 'ML', dialCode: '223'),
    StudioCountryDialCode(name: 'Malte', iso2: 'MT', dialCode: '356'),
    StudioCountryDialCode(name: 'Maroc', iso2: 'MA', dialCode: '212'),
    StudioCountryDialCode(name: 'Martinique', iso2: 'MQ', dialCode: '596'),
    StudioCountryDialCode(name: 'Mauritanie', iso2: 'MR', dialCode: '222'),
    StudioCountryDialCode(name: 'Mayotte', iso2: 'YT', dialCode: '262'),
    StudioCountryDialCode(name: 'Mexique', iso2: 'MX', dialCode: '52'),
    StudioCountryDialCode(name: 'Micronésie', iso2: 'FM', dialCode: '691'),
    StudioCountryDialCode(name: 'Moldavie', iso2: 'MD', dialCode: '373'),
    StudioCountryDialCode(name: 'Monaco', iso2: 'MC', dialCode: '377'),
    StudioCountryDialCode(name: 'Mongolie', iso2: 'MN', dialCode: '976'),
    StudioCountryDialCode(name: 'Montserrat', iso2: 'MS', dialCode: '1664'),
    StudioCountryDialCode(name: 'Monténégro', iso2: 'ME', dialCode: '382'),
    StudioCountryDialCode(name: 'Mozambique', iso2: 'MZ', dialCode: '258'),
    StudioCountryDialCode(name: 'Myanmar', iso2: 'MM', dialCode: '95'),
    StudioCountryDialCode(name: 'Namibie', iso2: 'NA', dialCode: '264'),
    StudioCountryDialCode(name: 'Nauru', iso2: 'NR', dialCode: '674'),
    StudioCountryDialCode(name: 'Nicaragua', iso2: 'NI', dialCode: '505'),
    StudioCountryDialCode(name: 'Niger', iso2: 'NE', dialCode: '227'),
    StudioCountryDialCode(name: 'Nigéria', iso2: 'NG', dialCode: '234'),
    StudioCountryDialCode(name: 'Niue', iso2: 'NU', dialCode: '683'),
    StudioCountryDialCode(name: 'Norvège', iso2: 'NO', dialCode: '47'),
    StudioCountryDialCode(
        name: 'Nouvelle-Calédonie', iso2: 'NC', dialCode: '687'),
    StudioCountryDialCode(name: 'Nouvelle-Zélande', iso2: 'NZ', dialCode: '64'),
    StudioCountryDialCode(name: 'Népal', iso2: 'NP', dialCode: '977'),
    StudioCountryDialCode(name: 'Oman', iso2: 'OM', dialCode: '968'),
    StudioCountryDialCode(name: 'Ouzbékistan', iso2: 'UZ', dialCode: '998'),
    StudioCountryDialCode(name: 'Pakistan', iso2: 'PK', dialCode: '92'),
    StudioCountryDialCode(name: 'Palaos', iso2: 'PW', dialCode: '680'),
    StudioCountryDialCode(name: 'Palestine', iso2: 'PS', dialCode: '970'),
    StudioCountryDialCode(name: 'Panama', iso2: 'PA', dialCode: '507'),
    StudioCountryDialCode(
        name: 'Papouasie-Nouvelle-Guinée', iso2: 'PG', dialCode: '675'),
    StudioCountryDialCode(name: 'Paraguay', iso2: 'PY', dialCode: '595'),
    StudioCountryDialCode(name: 'Pays-Bas', iso2: 'NL', dialCode: '31'),
    StudioCountryDialCode(name: 'Philippines', iso2: 'PH', dialCode: '63'),
    StudioCountryDialCode(name: 'Pologne', iso2: 'PL', dialCode: '48'),
    StudioCountryDialCode(
        name: 'Polynésie française', iso2: 'PF', dialCode: '689'),
    StudioCountryDialCode(name: 'Porto Rico', iso2: 'PR', dialCode: '1787'),
    StudioCountryDialCode(name: 'Porto Rico', iso2: 'PR', dialCode: '1939'),
    StudioCountryDialCode(name: 'Portugal', iso2: 'PT', dialCode: '351'),
    StudioCountryDialCode(name: 'Pérou', iso2: 'PE', dialCode: '51'),
    StudioCountryDialCode(name: 'Qatar', iso2: 'QA', dialCode: '974'),
    StudioCountryDialCode(name: 'Roumanie', iso2: 'RO', dialCode: '40'),
    StudioCountryDialCode(name: 'Royaume-Uni', iso2: 'GB', dialCode: '44'),
    StudioCountryDialCode(name: 'Russie', iso2: 'RU', dialCode: '7'),
    StudioCountryDialCode(name: 'Rwanda', iso2: 'RW', dialCode: '250'),
    StudioCountryDialCode(
        name: 'République centrafricaine', iso2: 'CF', dialCode: '236'),
    StudioCountryDialCode(
        name: 'République dominicaine', iso2: 'DO', dialCode: '1809'),
    StudioCountryDialCode(
        name: 'République dominicaine', iso2: 'DO', dialCode: '1829'),
    StudioCountryDialCode(
        name: 'République dominicaine', iso2: 'DO', dialCode: '1849'),
    StudioCountryDialCode(
        name: 'République tchèque', iso2: 'CZ', dialCode: '420'),
    StudioCountryDialCode(name: 'Réunion', iso2: 'RE', dialCode: '262'),
    StudioCountryDialCode(
        name: 'Sahara Occidental', iso2: 'EH', dialCode: '212'),
    StudioCountryDialCode(
        name: 'Saint-Barthélemy', iso2: 'BL', dialCode: '590'),
    StudioCountryDialCode(
        name: 'Saint-Christophe-et-Niévès', iso2: 'KN', dialCode: '1869'),
    StudioCountryDialCode(name: 'Saint-Lucie', iso2: 'LC', dialCode: '1758'),
    StudioCountryDialCode(name: 'Saint-Marin', iso2: 'SM', dialCode: '378'),
    StudioCountryDialCode(
        name: 'Saint-Martin (partie française)', iso2: 'MF', dialCode: '590'),
    StudioCountryDialCode(
        name: 'Saint-Martin (partie néerlandaise)',
        iso2: 'SX',
        dialCode: '1721'),
    StudioCountryDialCode(
        name: 'Saint-Pierre-et-Miquelon', iso2: 'PM', dialCode: '508'),
    StudioCountryDialCode(
        name: 'Saint-Vincent-et-les-Grenadines', iso2: 'VC', dialCode: '1784'),
    StudioCountryDialCode(name: 'Sainte-Hélène', iso2: 'SH', dialCode: '290'),
    StudioCountryDialCode(name: 'Salvador', iso2: 'SV', dialCode: '503'),
    StudioCountryDialCode(name: 'Samoa', iso2: 'WS', dialCode: '685'),
    StudioCountryDialCode(
        name: 'Samoa américaines', iso2: 'AS', dialCode: '1684'),
    StudioCountryDialCode(
        name: 'Sao Tomé-et-Principe', iso2: 'ST', dialCode: '239'),
    StudioCountryDialCode(name: 'Serbie', iso2: 'RS', dialCode: '381'),
    StudioCountryDialCode(name: 'Seychelles', iso2: 'SC', dialCode: '248'),
    StudioCountryDialCode(name: 'Sierra Leone', iso2: 'SL', dialCode: '232'),
    StudioCountryDialCode(name: 'Singapour', iso2: 'SG', dialCode: '65'),
    StudioCountryDialCode(name: 'Slovaquie', iso2: 'SK', dialCode: '421'),
    StudioCountryDialCode(name: 'Slovénie', iso2: 'SI', dialCode: '386'),
    StudioCountryDialCode(name: 'Somalie', iso2: 'SO', dialCode: '252'),
    StudioCountryDialCode(name: 'Soudan', iso2: 'SD', dialCode: '249'),
    StudioCountryDialCode(name: 'Soudan du Sud', iso2: 'SS', dialCode: '211'),
    StudioCountryDialCode(name: 'Sri Lanka', iso2: 'LK', dialCode: '94'),
    StudioCountryDialCode(name: 'Suisse', iso2: 'CH', dialCode: '41'),
    StudioCountryDialCode(name: 'Surinam', iso2: 'SR', dialCode: '597'),
    StudioCountryDialCode(name: 'Suède', iso2: 'SE', dialCode: '46'),
    StudioCountryDialCode(
        name: 'Svalbard et Jan Mayen', iso2: 'SJ', dialCode: '4779'),
    StudioCountryDialCode(name: 'Swaziland', iso2: 'SZ', dialCode: '268'),
    StudioCountryDialCode(name: 'Syrie', iso2: 'SY', dialCode: '963'),
    StudioCountryDialCode(name: 'Sénégal', iso2: 'SN', dialCode: '221'),
    StudioCountryDialCode(name: 'Tadjikistan', iso2: 'TJ', dialCode: '992'),
    StudioCountryDialCode(name: 'Tanzanie', iso2: 'TZ', dialCode: '255'),
    StudioCountryDialCode(name: 'Taïwan', iso2: 'TW', dialCode: '886'),
    StudioCountryDialCode(name: 'Tchad', iso2: 'TD', dialCode: '235'),
    StudioCountryDialCode(
        name: 'Terres australes françaises', iso2: 'TF', dialCode: '262'),
    StudioCountryDialCode(
        name: 'Territoire britannique de l\'océan Indien',
        iso2: 'IO',
        dialCode: '246'),
    StudioCountryDialCode(name: 'Thaïlande', iso2: 'TH', dialCode: '66'),
    StudioCountryDialCode(name: 'Timor oriental', iso2: 'TL', dialCode: '670'),
    StudioCountryDialCode(name: 'Togo', iso2: 'TG', dialCode: '228'),
    StudioCountryDialCode(name: 'Tokelau', iso2: 'TK', dialCode: '690'),
    StudioCountryDialCode(name: 'Tonga', iso2: 'TO', dialCode: '676'),
    StudioCountryDialCode(
        name: 'Trinité et Tobago', iso2: 'TT', dialCode: '1868'),
    StudioCountryDialCode(
        name: 'Tristan da Cunha', iso2: 'TA', dialCode: '290'),
    StudioCountryDialCode(name: 'Tunisie', iso2: 'TN', dialCode: '216'),
    StudioCountryDialCode(name: 'Turkménistan', iso2: 'TM', dialCode: '993'),
    StudioCountryDialCode(name: 'Turquie', iso2: 'TR', dialCode: '90'),
    StudioCountryDialCode(name: 'Tuvalu', iso2: 'TV', dialCode: '688'),
    StudioCountryDialCode(name: 'Uganda', iso2: 'UG', dialCode: '256'),
    StudioCountryDialCode(name: 'Ukraine', iso2: 'UA', dialCode: '380'),
    StudioCountryDialCode(name: 'Uruguay', iso2: 'UY', dialCode: '598'),
    StudioCountryDialCode(name: 'Vanuatu', iso2: 'VU', dialCode: '678'),
    StudioCountryDialCode(name: 'Vatican', iso2: 'VA', dialCode: '39'),
    StudioCountryDialCode(name: 'Venezuela', iso2: 'VE', dialCode: '58'),
    StudioCountryDialCode(name: 'Viêt Nam', iso2: 'VN', dialCode: '84'),
    StudioCountryDialCode(
        name: 'Wallis-et-Futuna', iso2: 'WF', dialCode: '681'),
    StudioCountryDialCode(name: 'Yémen', iso2: 'YE', dialCode: '967'),
    StudioCountryDialCode(name: 'Zambie', iso2: 'ZM', dialCode: '260'),
    StudioCountryDialCode(name: 'Zimbabwe', iso2: 'ZW', dialCode: '263'),
    StudioCountryDialCode(name: 'Égypte', iso2: 'EG', dialCode: '20'),
    StudioCountryDialCode(
        name: 'Émirats arabes unis', iso2: 'AE', dialCode: '971'),
    StudioCountryDialCode(name: 'Équateur', iso2: 'EC', dialCode: '593'),
    StudioCountryDialCode(name: 'Érythrée', iso2: 'ER', dialCode: '291'),
    StudioCountryDialCode(name: 'États-Unis', iso2: 'US', dialCode: '1'),
    StudioCountryDialCode(name: 'Éthiopie', iso2: 'ET', dialCode: '251'),
    StudioCountryDialCode(name: 'Île Bouvet', iso2: 'BV', dialCode: '47'),
    StudioCountryDialCode(name: 'Île Christmas', iso2: 'CX', dialCode: '61'),
    StudioCountryDialCode(
        name: 'Île de l’Ascension', iso2: 'AC', dialCode: '247'),
    StudioCountryDialCode(name: 'Île de Man', iso2: 'IM', dialCode: '44'),
    StudioCountryDialCode(name: 'Île de Norfolk', iso2: 'NF', dialCode: '672'),
    StudioCountryDialCode(name: 'Île Maurice', iso2: 'MU', dialCode: '230'),
    StudioCountryDialCode(name: 'Îles Caïmans', iso2: 'KY', dialCode: '1345'),
    StudioCountryDialCode(name: 'Îles Cocos', iso2: 'CC', dialCode: '61'),
    StudioCountryDialCode(name: 'Îles Cook', iso2: 'CK', dialCode: '682'),
    StudioCountryDialCode(name: 'Îles Féroé', iso2: 'FO', dialCode: '298'),
    StudioCountryDialCode(
        name: 'Îles Heard-et-MacDonald', iso2: 'HM', dialCode: '672'),
    StudioCountryDialCode(name: 'Îles Malouines', iso2: 'FK', dialCode: '500'),
    StudioCountryDialCode(
        name: 'Îles Mariannes du Nord', iso2: 'MP', dialCode: '1670'),
    StudioCountryDialCode(name: 'Îles Marshall', iso2: 'MH', dialCode: '692'),
    StudioCountryDialCode(
        name: 'Îles mineures éloignées des États-Unis',
        iso2: 'UM',
        dialCode: '1'),
    StudioCountryDialCode(name: 'Îles Pitcairn', iso2: 'PN', dialCode: '64'),
    StudioCountryDialCode(name: 'Îles Salomon', iso2: 'SB', dialCode: '677'),
    StudioCountryDialCode(
        name: 'Îles Turques-et-Caïques', iso2: 'TC', dialCode: '1649'),
    StudioCountryDialCode(
        name: 'Îles Vierges britanniques', iso2: 'VG', dialCode: '1284'),
    StudioCountryDialCode(
        name: 'Îles Vierges des États-Unis', iso2: 'VI', dialCode: '1340'),
    StudioCountryDialCode(name: 'Îles Åland', iso2: 'AX', dialCode: '358'),
  ];

  static String digitsOnly(String value) {
    return value.replaceAll(RegExp(r'[^0-9]'), '');
  }

  static StudioCountryDialCode byIso(
    String iso2, {
    String? dialCode,
  }) {
    final normalizedIso = iso2.toUpperCase();
    for (final item in all) {
      if (item.iso2 == normalizedIso &&
          (dialCode == null || item.dialCode == dialCode)) {
        return item;
      }
    }
    return benin;
  }

  static StudioPhoneParts split(String? raw) {
    final digits = digitsOnly(raw ?? '');
    if (digits.isEmpty) {
      return const StudioPhoneParts(
        country: benin,
        nationalNumber: '',
      );
    }

    final ordered = List<StudioCountryDialCode>.from(all)
      ..sort((a, b) => b.dialCode.length.compareTo(a.dialCode.length));

    for (final item in ordered) {
      if (digits.startsWith(item.dialCode) &&
          digits.length > item.dialCode.length) {
        return StudioPhoneParts(
          country: item,
          nationalNumber: digits.substring(item.dialCode.length),
        );
      }
    }

    return StudioPhoneParts(
      country: benin,
      nationalNumber: digits,
    );
  }

  static String normalizedNational(
    StudioCountryDialCode country,
    String raw,
  ) {
    var digits = digitsOnly(raw);
    final trimmed = raw.trim();

    if ((trimmed.startsWith('+') ||
            digits.length + country.dialCode.length > 15) &&
        digits.startsWith(country.dialCode) &&
        digits.length > country.dialCode.length) {
      digits = digits.substring(country.dialCode.length);
    }

    return digits;
  }

  static String? validate(
    StudioCountryDialCode country,
    String raw, {
    bool required = true,
  }) {
    final national = normalizedNational(country, raw);

    if (national.isEmpty) {
      return required
          ? 'Saisissez le numéro WhatsApp après l’indicatif du pays.'
          : null;
    }

    if (!RegExp(r'^\d+$').hasMatch(national)) {
      return 'Le numéro doit contenir uniquement des chiffres.';
    }

    final totalLength = country.dialCode.length + national.length;
    if (totalLength < 7) {
      return 'Le numéro est trop court pour le format international.';
    }
    if (totalLength > 15) {
      return 'Le numéro est trop long. Vérifiez le pays et le numéro.';
    }

    if (RegExp(r'^0+$').hasMatch(national)) {
      return 'Ce numéro de téléphone est incorrect.';
    }

    return null;
  }

  static String e164(
    StudioCountryDialCode country,
    String raw,
  ) {
    final national = normalizedNational(country, raw);
    return '+${country.dialCode}$national';
  }
}

Future<StudioCountryDialCode?> showStudioCountryPicker(
  BuildContext context, {
  StudioCountryDialCode selected = StudioCountryCodes.benin,
}) async {
  final search = TextEditingController();
  var query = '';

  final result = await showModalBottomSheet<StudioCountryDialCode>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) => FractionallySizedBox(
      heightFactor: 0.88,
      child: Material(
        color: const Color(0xFFF4FAF8),
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(28),
        ),
        clipBehavior: Clip.antiAlias,
        child: StatefulBuilder(
          builder: (context, setSheetState) {
            final normalized = query.toLowerCase().trim();
            final visible = StudioCountryCodes.all.where((item) {
              if (normalized.isEmpty) return true;
              return item.name.toLowerCase().contains(normalized) ||
                  item.iso2.toLowerCase().contains(normalized) ||
                  item.dialCode.contains(normalized.replaceAll('+', ''));
            }).toList();

            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 18, 10, 10),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Choisir le pays',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Tous les indicatifs internationaux',
                              style: TextStyle(
                                color: Color(0xFF667874),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(sheetContext),
                        icon: const Icon(Icons.close_rounded),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                  child: TextField(
                    controller: search,
                    autofocus: true,
                    onChanged: (value) {
                      setSheetState(() => query = value);
                    },
                    decoration: InputDecoration(
                      hintText: 'Pays ou indicatif, ex. Bénin ou +229',
                      prefixIcon: const Icon(Icons.search_rounded),
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: visible.isEmpty
                      ? const Center(
                          child: Text('Aucun pays trouvé.'),
                        )
                      : ListView.separated(
                          itemCount: visible.length,
                          separatorBuilder: (_, __) => const Divider(
                            height: 1,
                            indent: 66,
                          ),
                          itemBuilder: (context, index) {
                            final item = visible[index];
                            final isSelected = item.iso2 == selected.iso2 &&
                                item.dialCode == selected.dialCode;
                            return ListTile(
                              leading: Text(
                                item.flag,
                                style: const TextStyle(fontSize: 25),
                              ),
                              title: Text(
                                item.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              subtitle: Text(item.iso2),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    '+${item.dialCode}',
                                    style: const TextStyle(
                                      color: Color(0xFF0B7F72),
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                  if (isSelected) ...[
                                    const SizedBox(width: 8),
                                    const Icon(
                                      Icons.check_circle_rounded,
                                      color: Color(0xFF0B7F72),
                                    ),
                                  ],
                                ],
                              ),
                              onTap: () => Navigator.pop(
                                sheetContext,
                                item,
                              ),
                            );
                          },
                        ),
                ),
              ],
            );
          },
        ),
      ),
    ),
  );

  search.dispose();
  return result;
}

class StudioInternationalPhoneField extends StatelessWidget {
  const StudioInternationalPhoneField({
    super.key,
    required this.country,
    required this.controller,
    required this.onCountryChanged,
    this.label = 'Numéro WhatsApp',
    this.helperText,
  });

  final StudioCountryDialCode country;
  final TextEditingController controller;
  final ValueChanged<StudioCountryDialCode> onCountryChanged;
  final String label;
  final String? helperText;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 124,
              child: OutlinedButton(
                onPressed: () async {
                  final selected = await showStudioCountryPicker(
                    context,
                    selected: country,
                  );
                  if (selected != null) {
                    onCountryChanged(selected);
                  }
                },
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(57),
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  backgroundColor: Colors.white,
                  side: const BorderSide(color: Color(0xFFDCEBE7)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(country.flag, style: const TextStyle(fontSize: 20)),
                    const SizedBox(width: 5),
                    Flexible(
                      child: Text(
                        '+${country.dialCode}',
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF075F57),
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    const Icon(Icons.arrow_drop_down_rounded, size: 19),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: controller,
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.done,
                inputFormatters: [
                  FilteringTextInputFormatter.allow(
                    RegExp(r'[0-9 ()-]'),
                  ),
                ],
                decoration: InputDecoration(
                  labelText: label,
                  hintText: 'Numéro national',
                  prefixIcon: const Icon(Icons.phone_outlined),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ],
        ),
        if (helperText != null) ...[
          const SizedBox(height: 6),
          Text(
            helperText!,
            style: const TextStyle(
              color: Color(0xFF667874),
              fontSize: 11,
            ),
          ),
        ],
      ],
    );
  }
}
