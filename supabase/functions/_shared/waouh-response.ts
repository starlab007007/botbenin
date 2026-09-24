/** Do not turn an upstream failure into an apparently successful chat message. */
export async function readWaouhEngineResponse(response: Response): Promise<Record<string, any>> {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || typeof data !== 'object' || Array.isArray(data) || data.ok === false || data.success === false || data.error) {
    throw new Error(`WAOUH engine failed (${response.status})`);
  }
  const hasText = typeof data.reply === 'string' && data.reply.trim().length > 0;
  const hasCards = ['results', 'products', 'attachments'].some((key) => Array.isArray(data[key]) && data[key].length > 0);
  if (!hasText && !hasCards && !data.suppress_direct_reply) throw new Error('WAOUH engine returned an empty response');
  return data;
}
