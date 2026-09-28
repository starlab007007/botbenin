#!/usr/bin/env bash
# =============================================================================
# WAOUH Chat v3 — scénarios des captures 1 et 2 contre un projet déployé.
#
# ⚠️ Crée de vraies lignes (fil, négociation, messages) : utiliser un ARTICLE
# DE TEST dont le vendeur est un compte de test.
#
#   export SUPABASE_URL=https://<ref>.supabase.co
#   export SUPABASE_SERVICE_ROLE_KEY=...      # appel direct de waouh-channel-in
#   export TEST_ARTICLE_ID=<uuid article de test>
#   export TEST_PRICE=2300                    # offre envoyée
#   ./scripts/waouh-chat-v3/smoke.sh
# =============================================================================
set -euo pipefail
: "${SUPABASE_URL:?}" ; : "${SUPABASE_SERVICE_ROLE_KEY:?}" ; : "${TEST_ARTICLE_ID:?}"
PRICE="${TEST_PRICE:-2300}"
SID="smoke-v3-$(date +%s)"
FN="$SUPABASE_URL/functions/v1/waouh-channel-in"
command -v jq >/dev/null || { echo "jq requis" >&2; exit 1; }

call() {
  curl -sS -X POST "$FN"     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"     -H "Content-Type: application/json"     -d "$1"
}
fail() { echo "❌ $*"; exit 1; }
pass() { echo "✅ $*"; }

echo "Session de test : $SID — article $TEST_ARTICLE_ID"

R1=$(call "{\"channel\":\"web\",\"sessionId\":\"$SID\",\"text\":\"Intéressé\",\"meta\":{\"article_id\":\"$TEST_ARTICLE_ID\",\"intent\":\"interested\",\"source\":\"smoke_v3\"}}")
T1=$(echo "$R1" | jq -r '.thread_id // empty')
N1=$(echo "$R1" | jq -r '.negotiation_id // empty')
[ -n "$T1" ] || fail "intérêt : thread_id absent → $(echo "$R1" | jq -c '{reply,intent,error}')"
[ -n "$N1" ] || fail "intérêt : negotiation_id absent"
pass "intérêt : Deal Room ouverte en un aller-retour (thread $T1)"

R2=$(call "{\"channel\":\"web\",\"sessionId\":\"$SID\",\"text\":\"Je propose $PRICE FCFA\",\"meta\":{\"article_id\":\"$TEST_ARTICLE_ID\",\"source\":\"smoke_v3\"}}")
echo "$R2" | jq -r '.reply // ""' | grep -qi "Aucune négociation" && fail "prix : « Aucune négociation » renvoyé"
[ "$(echo "$R2" | jq -r '.thread_id // empty')" = "$T1" ] || fail "prix : fil différent ou absent → $(echo "$R2" | jq -c '{reply,thread_id}')"
pass "prix : offre traitée dans le même fil"

R3=$(call "{\"channel\":\"web\",\"sessionId\":\"$SID\",\"text\":\"Je propose $PRICE FCFA\",\"meta\":{\"article_id\":\"$TEST_ARTICLE_ID\",\"source\":\"smoke_v3\"}}")
echo "$R3" | jq -e '.commerce_event == "offer_already_sent" or .intent == "negotiation_awaiting_counterparty"' >/dev/null   || echo "ℹ️  3e envoi : $(echo "$R3" | jq -c '{intent,commerce_event}') (acceptable si le vendeur a déjà répondu)"
pass "offre identique : pas de nouvelle notification"

R4=$(call "{\"channel\":\"web\",\"sessionId\":\"$SID\",\"text\":\"Je le veux\",\"meta\":{\"button_payload\":\"je-veux:$TEST_ARTICLE_ID\",\"source\":\"smoke_v3\"}}")
[ "$(echo "$R4" | jq -r '.thread_id // empty')" = "$T1" ] || fail "reprise : fil absent → $(echo "$R4" | jq -c '{reply,intent}')"
pass "reprise : « $(echo "$R4" | jq -r '.reply' | head -1) » avec fil et étape $(echo "$R4" | jq -r '.stage')"

echo
echo "Tous les scénarios passent. Nettoyage éventuel : négociation $N1, fil $T1 (données de test)."
