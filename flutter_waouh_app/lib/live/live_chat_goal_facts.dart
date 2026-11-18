/// Explicit constraints extracted locally from a free-form chat goal.
class LiveChatGoalFacts {
  LiveChatGoalFacts(String goal, {String? city, int? budget, bool selling = false}) {
    this.city = RegExp(r'\b(Cotonou|Abomey[- ]Calavi|Porto[- ]Novo|Godomey|Parakou|Pahou|Bohicon|Ouidah)\b', caseSensitive: false).firstMatch(goal)?.group(1) ?? city;
    final explicitBudget = RegExp(r'\bbudget(?:\s+max(?:imum)?)?\s*[:=]?\s*(?:de\s*)?(\d[\d .\u00a0]*)', caseSensitive: false).firstMatch(goal)?.group(1);
    final amount = explicitBudget ?? RegExp(r'\b(\d[\d .\u00a0]*)\s*(?:fcfa|xof|cfa)\b', caseSensitive: false).firstMatch(goal)?.group(1);
    this.budget = selling ? null : budget ?? (amount == null ? null : int.tryParse(amount.replaceAll(RegExp(r'\D'), '')));
  }
  String? city;
  int? budget;
}
