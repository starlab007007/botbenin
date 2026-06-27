import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 40, this.semanticLabel = 'WaouhApp'});

  final double size;
  final String semanticLabel;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticLabel,
      image: true,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(size * .22),
        child: SvgPicture.asset(
          'assets/branding/waouh_mark.svg',
          width: size,
          height: size,
          fit: BoxFit.cover,
        ),
      ),
    );
  }
}
