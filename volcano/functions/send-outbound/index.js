// Approve to act: an agent drafts an outbound email, a person approves before it sends.
// Built on Volcano durable functions + durable approvals.
// Docs: https://docs.volcano.dev/platform/functions/durable-approvals.md
const { durable } = require('@volcano.dev/sdk/durable');

// Stubs. In a real app these would write to a table and call an email provider.
function saveDraft(input) {
  console.log('draft saved for', input.to);
  return { id: 'draft_' + Date.now() };
}
function archiveDraft(id, status) {
  console.log('draft', id, 'archived as', status);
}
function sendEmail(input) {
  console.log('sent to', input.to);
  return { messageId: 'msg_1' };
}

exports.handler = durable(async (input, ctx) => {
  const draft = await ctx.step('save-draft', () => saveDraft(input));

  const decision = await ctx.waitForApproval('send-outbound', {
    title: `Send to ${input.to}?`,
    description: 'External email with a dollar amount. Policy requires a person to approve.',
    details: { draft_id: draft.id, to: input.to, amount: input.amount, preview: String(input.body || '').slice(0, 200) },
    timeout: '24h',
  });

  if (!decision.approved) {
    // 'denied' or 'expired' come back as results, not errors.
    await ctx.step('archive', () => archiveDraft(draft.id, decision.status));
    return { sent: false, reason: decision.status, comment: decision.comment || null };
  }

  const sent = await ctx.step('send', () => sendEmail(input));
  return { sent: true, messageId: sent.messageId, by: decision.decidedBy && decision.decidedBy.email, comment: decision.comment || null };
});
