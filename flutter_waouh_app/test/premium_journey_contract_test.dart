import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/premium_journey_contract.dart';

void main() {
  test('twelve distinct premium screens have titles and primary actions', () {
    expect(PremiumJourneyScreen.values.length, 12);
    for (final screen in PremiumJourneyScreen.values) {
      expect(premiumJourneyTitles[screen], isNotEmpty);
      expect(premiumJourneyPrimaryActions[screen], isNotEmpty);
    }
  });

  test('unverified availability cannot be described as confirmed', () {
    expect(const PremiumJourneyState(screen: PremiumJourneyScreen.offerDetail)
        .canSayStockConfirmed, isFalse);
    expect(const PremiumJourneyState(
      screen: PremiumJourneyScreen.offerDetail,
      verification: PremiumVerification.declared,
    ).canSayStockConfirmed, isFalse);
    expect(const PremiumJourneyState(
      screen: PremiumJourneyScreen.offerDetail,
      verification: PremiumVerification.verified,
    ).canSayStockConfirmed, isTrue);
  });

  test('queued or sent messages are not delivered to seller', () {
    for (final status in [
      PremiumDelivery.prepared,
      PremiumDelivery.queued,
      PremiumDelivery.sent,
      PremiumDelivery.failed,
    ]) {
      expect(PremiumJourneyState(
        screen: PremiumJourneyScreen.sellerRequest,
        delivery: status,
      ).canSayDelivered, isFalse);
    }
    expect(const PremiumJourneyState(
      screen: PremiumJourneyScreen.sellerRequest,
      delivery: PremiumDelivery.received,
    ).canSayDelivered, isTrue);
  });

  test('contact and negotiation require authorization and reached seller', () {
    const state = PremiumJourneyState(screen: PremiumJourneyScreen.dealRoom);
    expect(state.canStartContact, isFalse);
    expect(state.canStartBilateralNegotiation, isFalse);
    const allowed = PremiumJourneyState(
      screen: PremiumJourneyScreen.dealRoom,
      contactAuthorized: true,
      counterpartReached: true,
    );
    expect(allowed.canStartContact, isTrue);
    expect(allowed.canStartBilateralNegotiation, isTrue);
  });

  test('agreement and completion require both parties on same verified state', () {
    const partial = PremiumJourneyState(
      screen: PremiumJourneyScreen.agreement,
      agreement: PremiumAgreement.accepted,
      ownerAccepted: true,
    );
    expect(partial.canShowAccepted, isFalse);
    const accepted = PremiumJourneyState(
      screen: PremiumJourneyScreen.agreement,
      agreement: PremiumAgreement.accepted,
      ownerAccepted: true,
      providerAccepted: true,
    );
    expect(accepted.canShowAccepted, isTrue);
    expect(accepted.canShowCompleted, isFalse);
    const completed = PremiumJourneyState(
      screen: PremiumJourneyScreen.completion,
      agreement: PremiumAgreement.completed,
      ownerAccepted: true,
      providerAccepted: true,
      ownerCompleted: true,
      providerCompleted: true,
    );
    expect(completed.canShowCompleted, isTrue);
  });
}
