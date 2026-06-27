import 'package:flutter/material.dart';

class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 40});
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: const Color(0xFF111111),
        borderRadius: BorderRadius.circular(size * .22),
      ),
      child: Text(
        'W',
        style: TextStyle(
          color: Colors.white,
          fontSize: size * .58,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}
