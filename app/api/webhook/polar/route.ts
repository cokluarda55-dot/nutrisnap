import { NextRequest, NextResponse } from 'next/server';
import { webhooks } from '@polar-sh/sdk/2026-10';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const headers = {
      'webhook-id': req.headers.get('webhook-id') ?? '',
      'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
      'webhook-signature': req.headers.get('webhook-signature') ?? '',
    };

    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

    let event: any = null;

    if (webhookSecret) {
      try {
        event = await webhooks.validateEvent(rawBody, headers, webhookSecret);
      } catch (err: any) {
        if (err instanceof webhooks.PolarWebhookVerificationError) {
          console.error('Invalid Polar webhook signature:', err);
          return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 403 });
        }
        if (err instanceof webhooks.PolarWebhookUnknownTypeError) {
          console.warn('Ignoring unsupported signed Polar webhook:', err);
          return NextResponse.json({ received: true }, { status: 202 });
        }
        console.error('Polar webhook validation error:', err);
        return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
      }
    } else {
      // In development or if secret is omitted, parse payload directly
      try {
        event = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
      }
    }

    const eventType = event.type || event.event;
    const data = event.data || {};

    console.log(`[Polar Webhook] Received event: ${eventType}`);

    // Extract user identity from external_id, metadata, or email
    const userId =
      data.customer?.external_id ||
      data.external_customer_id ||
      data.metadata?.userId ||
      data.metadata?.user_id;

    const userEmail =
      data.customer?.email ||
      data.customer_email ||
      data.email;

    const adminSupabase = createAdminClient();

    // 1. Activation events: subscription created/active, order paid, benefit granted
    const isActivationEvent = [
      'subscription.created',
      'subscription.active',
      'subscription.updated',
      'order.paid',
      'order.created',
      'benefit_grant.created',
    ].includes(eventType);

    // 2. Cancellation / revocation events
    const isDeactivationEvent = [
      'subscription.revoked',
      'subscription.canceled',
      'benefit_grant.revoked',
    ].includes(eventType);

    if (isActivationEvent) {
      console.log(`[Polar Webhook] Activating Pro for user: ${userId || userEmail}`);
      if (userId) {
        await adminSupabase
          .from('profiles')
          .update({ is_pro: true, updated_at: new Date().toISOString() })
          .eq('id', userId);
      } else if (userEmail) {
        await adminSupabase
          .from('profiles')
          .update({ is_pro: true, updated_at: new Date().toISOString() })
          .eq('email', userEmail);
      }
    } else if (isDeactivationEvent) {
      console.log(`[Polar Webhook] Revoking Pro for user: ${userId || userEmail}`);
      if (userId) {
        await adminSupabase
          .from('profiles')
          .update({ is_pro: false, updated_at: new Date().toISOString() })
          .eq('id', userId);
      } else if (userEmail) {
        await adminSupabase
          .from('profiles')
          .update({ is_pro: false, updated_at: new Date().toISOString() })
          .eq('email', userEmail);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Polar Webhook processing failed:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
