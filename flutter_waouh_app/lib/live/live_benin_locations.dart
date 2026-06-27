import 'package:flutter/material.dart';

/// Same principal city, quarter and business-category catalogue used by the
/// React native forms. Keeping it in Flutter avoids a blank/free-text category
/// control when the phone is offline.
const liveBusinessCategories = <String>[
  'Maquis', 'Restaurant', 'Bar / Buvette', 'Pâtisserie', 'Boulangerie',
  'Boutique mode', 'Boutique cosmétiques', 'Boutique électronique',
  'Salon de coiffure', 'Salon de beauté', 'Spa / Massage',
  'Supérette / Alimentation', 'Boucherie', 'Poissonnerie',
  'Pharmacie', 'Clinique / Cabinet', 'Quincaillerie',
  'Matériaux de construction', 'Garage / Mécanique', 'Lavage auto',
  'Station-service', 'Hôtel', 'Auberge', 'Location de voitures',
  'Transport / Taxi', 'Atelier couture', 'Cordonnerie', 'Menuiserie',
  'Soudure / Métallerie', 'Imprimerie', 'Photo / Vidéo', 'Cyber-café',
  'École / Formation', 'Crèche / Garderie', 'Agence immobilière',
  'Agence de voyage', 'Bureau de change', 'Marché / Grossiste',
  'Vendeur ambulant', 'Autre commerce',
];

const liveBeninPlaces = <String, List<String>>{
  'Cotonou': ['Cadjèhoun', 'Akpakpa', 'Fidjrossè', 'Gbégamey', 'Sainte-Rita', 'Ganhi', 'Jéricho', 'Cocotomey', 'Vodjè', 'Agla', 'Houéyiho', 'Zongo', 'Dantokpa', 'Missebo', 'Sègbéya', 'Mènontin', 'Sikècodji', 'Tokpa-Hoho', 'Akogbato', 'Vèdoko'],
  'Abomey-Calavi': ['Godomey', 'Kpota', 'Zogbadjè', 'Tankpè', 'Aïbatin', 'Calavi-Centre', 'Tokan', 'Hêvié', 'Akassato', 'Cocotomey', 'Womey', 'Glo-Djigbé'],
  'Porto-Novo': ['Akron', 'Djassin', 'Houinmè', 'Tokpota', 'Ouando', 'Avassa', 'Dowa', 'Kandèvié', 'Catchi', 'Foun-Foun'],
  'Parakou': ['Banikanni', 'Titirou', 'Zongo', 'Wansirou', 'Tourou', 'Kpébié', 'Ladji-Farani'],
  'Djougou': ['Centre', 'Bariénou', 'Sérou', 'Pélébina'],
  'Bohicon': ['Centre', 'Agbangnizoun', 'Zakpota'],
  'Lokossa': ['Centre', 'Athiémé', 'Houin'],
  'Kandi': ['Centre', 'Sam', 'Angaradébou'],
  'Natitingou': ['Centre', 'Pèporiyakou', 'Kouandata'],
  'Ouidah': ['Centre', 'Tovè', 'Pahou', 'Avlékété'],
  'Abomey': ['Centre', 'Djèkpota', 'Vidolè'],
  'Sèmè-Kpodji': ['Sèmè', 'Kpodji', 'Ekpè', 'Agblangandan'],
  'Allada': ['Centre', 'Sékou', 'Lissègazoun'],
  'Comè': ['Centre', 'Akodéha'],
  'Aplahoué': ['Centre', 'Azovè'],
  'Dassa-Zoumè': ['Centre', 'Paouignan'],
  'Savalou': ['Centre', 'Logozohè'],
  'Savè': ['Centre', 'Adido'],
  'Tchaourou': ['Centre', 'Alafiarou'],
  'Nikki': ['Centre', 'Sérékali'],
  'Malanville': ['Centre', 'Garou'],
  'Tanguiéta': ['Centre', 'Cotiakou'],
  'Banikoara': ['Centre'],
  'Pobè': ['Centre', 'Issaba'],
  'Sakété': ['Centre', 'Itassoumba'],
  'Adjarra': ['Centre'],
  'Aguégués': ['Avagbodji', 'Zoungamè'],
  'Grand-Popo': ['Centre', 'Hêvé'],
  'Athiémé': ['Centre'],
};

List<String> liveQuartiersForCity(String city) => liveBeninPlaces[city] ?? const <String>[];

Future<String?> pickLiveOption(
  BuildContext context, {
  required String title,
  required List<String> options,
  String? current,
  String searchHint = 'Rechercher…',
  bool allowCustom = false,
  String customHint = 'Saisir une autre valeur',
}) async {
  final custom = TextEditingController();
  final result = await showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
    ),
    builder: (sheetContext) {
      var query = '';
      return StatefulBuilder(
        builder: (context, setLocalState) {
          final q = query.trim().toLowerCase();
          final values = options.where((item) => q.isEmpty || item.toLowerCase().contains(q)).toList();
          return SizedBox(
            height: MediaQuery.of(context).size.height * .78,
            child: Column(children: [
              const SizedBox(height: 10),
              Container(width: 42, height: 4, decoration: BoxDecoration(color: const Color(0xFFD8E5DF), borderRadius: BorderRadius.circular(99))),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 10),
                child: Row(children: [
                  Expanded(child: Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900))),
                  IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded)),
                ]),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: TextField(
                  autofocus: true,
                  onChanged: (value) => setLocalState(() => query = value),
                  decoration: InputDecoration(prefixIcon: const Icon(Icons.search_rounded), hintText: searchHint),
                ),
              ),
              if (allowCustom)
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
                  child: Row(children: [
                    Expanded(child: TextField(controller: custom, decoration: InputDecoration(hintText: customHint))),
                    const SizedBox(width: 8),
                    FilledButton(
                      onPressed: () {
                        final value = custom.text.trim();
                        if (value.isNotEmpty) Navigator.pop(context, value);
                      },
                      child: const Text('Ajouter'),
                    ),
                  ]),
                ),
              const SizedBox(height: 6),
              Expanded(
                child: values.isEmpty
                    ? const Center(child: Text('Aucun résultat.'))
                    : ListView.separated(
                        itemCount: values.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (_, index) {
                          final value = values[index];
                          return ListTile(
                            title: Text(value),
                            trailing: value == current ? const Icon(Icons.check_rounded, color: Color(0xFF075E54)) : null,
                            onTap: () => Navigator.pop(context, value),
                          );
                        },
                      ),
              ),
            ]),
          );
        },
      );
    },
  );
  custom.dispose();
  return result;
}
