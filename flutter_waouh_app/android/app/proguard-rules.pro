# Flutter plugins provide their own consumer ProGuard rules.
# Keep this file intentionally minimal so R8 can remove unused Java bytecode
# and Android resources in optimized test and Play release builds.

# BEGIN WAOUH MLKIT OPTIONAL SCRIPTS R8
# WAOUH/AprèsBac instancie uniquement TextRecognitionScript.latin.
# Les artefacts chinois, devanagari, japonais et coréen ne sont pas embarqués.
-dontwarn com.google.mlkit.vision.text.chinese.**
-dontwarn com.google.mlkit.vision.text.devanagari.**
-dontwarn com.google.mlkit.vision.text.japanese.**
-dontwarn com.google.mlkit.vision.text.korean.**
# END WAOUH MLKIT OPTIONAL SCRIPTS R8
