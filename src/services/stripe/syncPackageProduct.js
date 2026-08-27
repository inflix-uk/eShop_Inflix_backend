const { resolveStripeForPackage } = require('./resolveStripeAccount');

/**
 * Mirrors booking packages into the Stripe product catalog.
 *
 * This is bookkeeping only — payments still run through PaymentIntents with a
 * server-computed amount, because booking totals depend on hours, guests,
 * extras and mics that a single Stripe Price cannot express. The catalog just
 * gives the Stripe dashboard a readable row per package.
 *
 * Every entry point is failure-tolerant: a Stripe outage must never stop an
 * admin saving a package. Errors are recorded on the package instead.
 */

const CURRENCY = 'gbp';

/** Stripe rejects blank descriptions; strip HTML and cap length. */
function toPlainDescription(pkg) {
  const raw = String(pkg?.description || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (raw) return raw.slice(0, 350);

  const subtitle = String(pkg?.subtitle || '').trim();
  return subtitle ? subtitle.slice(0, 350) : undefined;
}

/** Absolute https URLs only — Stripe rejects relative paths and localhost uploads. */
function toStripeImages(pkg) {
  const image = String(pkg?.image || '').trim();
  if (/^https:\/\//i.test(image)) return [image];
  return [];
}

function toUnitAmount(price) {
  return Math.max(0, Math.round((Number(price) || 0) * 100));
}

/** What the Price object represents, since booking totals are computed server-side. */
function priceNickname(pkg) {
  if (pkg?.pricingMode === 'fixed') return 'Fixed price per booking';
  return 'Per hour';
}

function buildMetadata(pkg) {
  return {
    bookingPackageId: String(pkg._id),
    slug: pkg.slug || '',
    type: pkg.type || '',
    pricingMode: pkg.pricingMode || 'hourly',
    durationMinutes: String(pkg.durationMinutes ?? ''),
    maxHours: String(pkg.maxHours ?? 0),
    maxGuests: String(pkg.maxGuests ?? ''),
    source: 'inflix-booking',
  };
}

async function recordSyncFailure(pkg, error) {
  const message = String(error?.message || error || 'Unknown Stripe error').slice(0, 400);
  console.error(`[stripe] product sync failed for "${pkg?.name}": ${message}`);
  try {
    const BookingPackage = require('../../models/bookingPackage');
    await BookingPackage.updateOne(
      { _id: pkg._id },
      { $set: { stripeSyncError: message } }
    );
  } catch (writeError) {
    console.error('[stripe] could not record sync error:', writeError.message);
  }
  return { ok: false, error: message };
}

/**
 * Create or update the Stripe Product + Price for a package.
 * Safe to call on every save — it is idempotent.
 */
async function syncPackageToStripe(packageId) {
  const BookingPackage = require('../../models/bookingPackage');

  const pkg = await BookingPackage.findById(packageId);
  if (!pkg || pkg.isdeleted) return { ok: false, error: 'Package not found' };

  let ctx;
  try {
    ctx = await resolveStripeForPackage(pkg);
  } catch (error) {
    return recordSyncFailure(pkg, error);
  }

  const { stripe, accountId } = ctx;

  try {
    // A package moved to a different Stripe account cannot reuse the old
    // product — products do not exist across accounts.
    const accountChanged =
      String(pkg.stripeSyncedAccountId || '') !== String(accountId || '');
    let productId = accountChanged ? null : pkg.stripeProductId;

    const productFields = {
      name: pkg.name,
      description: toPlainDescription(pkg),
      images: toStripeImages(pkg),
      active: pkg.isActive !== false,
      metadata: buildMetadata(pkg),
    };

    let product = null;

    if (productId) {
      try {
        product = await stripe.products.update(productId, productFields);
      } catch (error) {
        // Deleted in the dashboard, or belongs to another account — recreate.
        if (error?.statusCode === 404 || error?.type === 'StripeInvalidRequestError') {
          productId = null;
        } else {
          throw error;
        }
      }
    }

    if (!product) {
      product = await stripe.products.create(productFields);
      productId = product.id;
    }

    // Stripe Prices are immutable: a changed amount means a new Price, with the
    // old one archived so the dashboard shows one live price per package.
    const unitAmount = toUnitAmount(pkg.price);
    let priceId = accountChanged ? null : pkg.stripePriceId;
    let existingPrice = null;

    if (priceId) {
      try {
        existingPrice = await stripe.prices.retrieve(priceId);
      } catch {
        existingPrice = null;
        priceId = null;
      }
    }

    const priceIsCurrent =
      existingPrice &&
      existingPrice.active &&
      existingPrice.unit_amount === unitAmount &&
      existingPrice.currency === CURRENCY &&
      String(existingPrice.product) === String(productId);

    if (!priceIsCurrent && unitAmount > 0) {
      const newPrice = await stripe.prices.create({
        product: productId,
        currency: CURRENCY,
        unit_amount: unitAmount,
        nickname: priceNickname(pkg),
        metadata: buildMetadata(pkg),
      });

      priceId = newPrice.id;

      // Promote the new price FIRST — Stripe refuses to archive a price while
      // it is still the product's default_price.
      try {
        await stripe.products.update(productId, { default_price: priceId });
      } catch (error) {
        console.warn('[stripe] could not set default price:', error.message);
      }

      // Then retire every other live price so the catalog shows exactly one
      // current amount per package (also clears stragglers from earlier runs).
      try {
        const livePrices = await stripe.prices.list({
          product: productId,
          active: true,
          limit: 100,
        });
        for (const stale of livePrices.data) {
          if (stale.id === priceId) continue;
          try {
            await stripe.prices.update(stale.id, { active: false });
          } catch (error) {
            console.warn(`[stripe] could not archive price ${stale.id}:`, error.message);
          }
        }
      } catch (error) {
        console.warn('[stripe] could not list prices to archive:', error.message);
      }
    }

    await BookingPackage.updateOne(
      { _id: pkg._id },
      {
        $set: {
          stripeProductId: productId,
          stripePriceId: priceId || null,
          stripeSyncedAccountId: accountId || null,
          stripeSyncedAt: new Date(),
          stripeSyncError: '',
        },
      }
    );

    return { ok: true, productId, priceId, accountLabel: ctx.label };
  } catch (error) {
    return recordSyncFailure(pkg, error);
  }
}

/**
 * Archive the Stripe product for a deleted package. Stripe products that have
 * ever been used cannot be deleted, so deactivating is the correct move.
 */
async function archivePackageInStripe(pkg) {
  if (!pkg?.stripeProductId) return { ok: true, skipped: true };

  try {
    const { stripe } = await resolveStripeForPackage(pkg);
    await stripe.products.update(pkg.stripeProductId, { active: false });
    return { ok: true };
  } catch (error) {
    console.error(`[stripe] could not archive product for "${pkg?.name}":`, error.message);
    return { ok: false, error: error.message };
  }
}

/**
 * Fire-and-forget wrapper for controller hooks: a Stripe problem must never
 * turn a successful package save into an error response.
 */
function syncPackageInBackground(packageId) {
  setImmediate(() => {
    syncPackageToStripe(packageId).catch((error) => {
      console.error('[stripe] background product sync crashed:', error.message);
    });
  });
}

module.exports = {
  syncPackageToStripe,
  archivePackageInStripe,
  syncPackageInBackground,
};
