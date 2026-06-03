import express, { Router, Request, Response } from 'express';
import { paymentService } from '../services/payment.service.js';

const router = Router();

/**
 * Stripe Webhook 端点
 * 接收 Stripe 的支付成功回调
 * 必须使用 express.raw() 以验证签名
 */
router.post('/', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  try {
    await paymentService.handleStripeWebhook(req.body, sig);
    res.json({ received: true });
  } catch (error) {
    const err = error as Error;
    console.error('Stripe webhook error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

export { router as stripeWebhookRouter };
