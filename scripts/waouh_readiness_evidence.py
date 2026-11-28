"""Fail-closed evidence validation for legacy channel readiness checks."""
REQUIRED_STEPS = {"1_publication", "1b_identite_vendeur", "2_recherche",
                  "3_interet", "3b_notification_vendeur", "4_contre_offre_acheteur",
                  "5_contre_offre_vendeur", "6_accord"}

def channel_evidence_ok(http_status, payload, expected):
    if http_status != 200 or not isinstance(payload, dict):
        return False
    if payload.get("ok") is not True or payload.get("mode") != "parcours":
        return False
    results = payload.get("results")
    if not isinstance(results, list) or len(results) != 1:
        return False
    result = results[0]
    if not isinstance(result, dict) or result.get("parcours") != expected or result.get("status") != "ok":
        return False
    steps = result.get("steps")
    if not isinstance(steps, list) or not steps or any(
        not isinstance(step, dict) or not isinstance(step.get("step"), str) or
        step.get("status") != "ok" for step in steps
    ):
        return False
    names = [step["step"] for step in steps]
    return len(set(names)) == len(names) and REQUIRED_STEPS.issubset(names)
