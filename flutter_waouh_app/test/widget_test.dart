import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";

import "package:waouh_app_native/main.dart";

void main() {
  test("Waouh theme builds", () {
    expect(buildWaouhTheme(), isA<ThemeData>());
  });
}
