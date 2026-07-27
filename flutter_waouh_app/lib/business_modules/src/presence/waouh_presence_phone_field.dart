import 'package:flutter/material.dart';

class WaouhPresenceCountry {
  const WaouhPresenceCountry(this.flag, this.name, this.code);

  final String flag;
  final String name;
  final String code;

  String get label => '$flag $code';
}

const List<WaouhPresenceCountry> waouhPresenceCountries =
    <WaouhPresenceCountry>[
      WaouhPresenceCountry('🇧🇯', 'Bénin', '+229'),
      WaouhPresenceCountry('🇹🇬', 'Togo', '+228'),
      WaouhPresenceCountry('🇳🇬', 'Nigeria', '+234'),
      WaouhPresenceCountry('🇳🇪', 'Niger', '+227'),
      WaouhPresenceCountry('🇧🇫', 'Burkina Faso', '+226'),
      WaouhPresenceCountry('🇨🇮', 'Côte d’Ivoire', '+225'),
      WaouhPresenceCountry('🇬🇭', 'Ghana', '+233'),
      WaouhPresenceCountry('🇸🇳', 'Sénégal', '+221'),
      WaouhPresenceCountry('🇫🇷', 'France', '+33'),
    ];

class WaouhPresencePhoneField extends StatefulWidget {
  const WaouhPresencePhoneField({
    super.key,
    required this.controller,
    required this.label,
    required this.hint,
    this.helperText,
  });

  final TextEditingController controller;
  final String label;
  final String hint;
  final String? helperText;

  static String digitsOf(String value) =>
      value.replaceAll(RegExp(r'[^0-9]'), '');

  @override
  State<WaouhPresencePhoneField> createState() =>
      _WaouhPresencePhoneFieldState();
}

class _WaouhPresencePhoneFieldState extends State<WaouhPresencePhoneField> {
  late WaouhPresenceCountry _country = _initialCountry();

  WaouhPresenceCountry _initialCountry() {
    final digits = WaouhPresencePhoneField.digitsOf(widget.controller.text);
    for (final country in waouhPresenceCountries) {
      final codeDigits = WaouhPresencePhoneField.digitsOf(country.code);
      if (digits.startsWith(codeDigits)) return country;
    }
    return waouhPresenceCountries.first;
  }

  String get internationalDigits {
    final raw = WaouhPresencePhoneField.digitsOf(widget.controller.text);
    final code = WaouhPresencePhoneField.digitsOf(_country.code);
    if (raw.startsWith(code)) return raw;
    return '$code$raw';
  }

  void _setCountry(WaouhPresenceCountry? country) {
    if (country == null) return;
    final currentDigits = internationalDigits;
    final oldCode = WaouhPresencePhoneField.digitsOf(_country.code);
    final nextCode = WaouhPresencePhoneField.digitsOf(country.code);
    var local = currentDigits;
    if (local.startsWith(oldCode)) {
      local = local.substring(oldCode.length);
    }
    setState(() => _country = country);
    widget.controller.text = '$nextCode$local';
    widget.controller.selection = TextSelection.collapsed(
      offset: widget.controller.text.length,
    );
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: widget.controller,
      keyboardType: TextInputType.phone,
      onChanged: (_) => setState(() {}),
      decoration: InputDecoration(
        labelText: widget.label,
        hintText: widget.hint,
        helperText: widget.helperText,
        floatingLabelBehavior: FloatingLabelBehavior.always,
        prefixIcon: SizedBox(
          width: 118,
          child: Padding(
            padding: const EdgeInsets.only(left: 12),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<WaouhPresenceCountry>(
                value: _country,
                isExpanded: true,
                items: waouhPresenceCountries
                    .map(
                      (country) => DropdownMenuItem<WaouhPresenceCountry>(
                        value: country,
                        child: Text(
                          country.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                onChanged: _setCountry,
              ),
            ),
          ),
        ),
        suffixIcon: internationalDigits.length >= 8
            ? const Icon(Icons.check_circle_rounded, color: Color(0xFF10906F))
            : const Icon(Icons.phone_outlined),
      ),
    );
  }
}
