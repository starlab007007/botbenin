import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Canonical WAOUH mark. The source SVG contains the official black rounded
/// tile, white conversation ring and W monogram; this widget never crops or
/// stretches it.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 40, this.semanticLabel = 'WAOUH'});

  final double size;
  final String semanticLabel;

  @override
  Widget build(BuildContext context) => Semantics(
        label: semanticLabel,
        image: true,
        child: SizedBox.square(
          dimension: size,
          child: SvgPicture.asset(
            'assets/branding/waouh_mark.svg',
            width: size,
            height: size,
            fit: BoxFit.contain,
          ),
        ),
      );
}
