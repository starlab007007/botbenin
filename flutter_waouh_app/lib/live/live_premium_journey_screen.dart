import 'package:flutter/material.dart';
import 'convergence/live_convergence_screen.dart';
/// The real mission workspace, with participant-scoped persisted state.
class LivePremiumJourneyScreen extends StatelessWidget {
 const LivePremiumJourneyScreen({super.key,this.missionId,this.componentId});
 final String? missionId,componentId;
 @override Widget build(BuildContext context)=>LiveConvergenceScreen(missionId:missionId,componentId:componentId);
}
