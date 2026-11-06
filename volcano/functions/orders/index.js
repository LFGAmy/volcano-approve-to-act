// Volcano's own example from docs.volcano.dev/platform/guides/durable-functions-locally
// Run as written first. Our recipe replaces this later.
const { durable } = require('@volcano.dev/sdk/durable');

function chargeCard(token, amount) {
  console.log('charging', token, amount);
  return { id: 'ch_1' };
}
function emailReceipt(email, chargeId) {
  console.log('receipt to', email, 'for', chargeId);
  return true;
}

exports.handler = durable(async (input, ctx) => {
  const charge = await ctx.step('charge', () => chargeCard(input.card_token, input.amount));

  await ctx.wait('settle', '24h');

  await ctx.step('send-receipt', () => emailReceipt(input.email, charge.id));

  return { charged: charge.id };
});
