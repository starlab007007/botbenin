import { globalNexusDiscovery } from "./nexus";
type DiscoveryInput = Parameters<typeof globalNexusDiscovery>[0];
type DiscoveryResponse = Awaited<ReturnType<typeof globalNexusDiscovery>>;
/** Show indexed offers before the optional external refresh completes. */
export async function progressiveNexusDiscovery(input: DiscoveryInput, onIndexed: (response: DiscoveryResponse) => void) {
  const indexed = await globalNexusDiscovery({ ...input, refresh_external: false, smart: false });
  onIndexed(indexed);
  if (input.refresh_external === false) return indexed;
  return globalNexusDiscovery({ ...input, refresh_external: true });
}
