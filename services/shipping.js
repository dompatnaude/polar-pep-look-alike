/**
 * services/shipping.js
 * ------------------------------------------------------------------
 * Shipping provider abstraction layer.
 *
 * This module defines a provider-agnostic interface for creating
 * shipping labels and retrieving tracking information. No real
 * provider is connected yet -- the default "stub" provider returns
 * placeholder data so the admin fulfillment workflow can be built
 * and tested end-to-end.
 *
 * To connect a real provider later (Shippo / EasyPost / ShipStation):
 *   1. Implement an adapter object with createLabel(order) and
 *      getTracking(trackingNumber) methods (see StubProvider below).
 *   2. Register it in the PROVIDERS map.
 *   3. Set SHIPPING_PROVIDER=<name> (and the provider's API key) in env.
 *
 * The rest of the application only ever calls the two exported
 * functions -- createShippingLabel() and getTrackingInfo() -- so
 * swapping providers requires no changes outside this file.
 * ------------------------------------------------------------------
 */

'use strict';

// --- helpers ---------------------------------------------------------

function randomTracking(prefix) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return (prefix || 'PEPX') + s;
}

/**
 * Normalize an order row into the shipment shape a carrier API needs.
 * Accepts the DB order row (snake_case columns).
 */
function buildShipmentFromOrder(order) {
  order = order || {};
  return {
    order_number: order.order_number || null,
    to_address: {
      name: order.shipping_name || '',
      street: order.shipping_address || '',
      city: order.shipping_city || '',
      state: order.shipping_state || '',
      zip: order.shipping_zip || '',
      email: order.shipping_email || ''
    },
    items: Array.isArray(order.items) ? order.items.map(function (it) {
      return { name: it.name, quantity: it.quantity, price: it.price };
    }) : [],
    total_weight: order.total_weight || null
  };
}

// --- providers -------------------------------------------------------

/**
 * StubProvider -- the default. Generates placeholder label data.
 * Mirrors the async contract a real provider adapter must satisfy.
 */
const StubProvider = {
  name: 'stub',
  async createLabel(order) {
    const shipment = buildShipmentFromOrder(order);
    const carrier = 'USPS';
    const tracking = randomTracking('PEPX');
    return {
      provider: this.name,
      carrier: carrier,
      tracking_number: tracking,
      // Placeholder URL -- a real provider returns a hosted PDF/PNG label.
      label_url: 'https://example.com/labels/' + tracking + '.pdf',
      shipment: shipment,
      created_at: new Date().toISOString(),
      placeholder: true
    };
  },
  async getTracking(trackingNumber) {
    return {
      provider: this.name,
      tracking_number: trackingNumber || null,
      status: 'unknown',
      // Placeholder -- a real provider returns scan events / ETA.
      events: [],
      placeholder: true
    };
  }
};

// Future adapters register here. Each must implement createLabel(order)
// and getTracking(trackingNumber) returning the same shapes as StubProvider.
//
// const ShippoProvider = { name: 'shippo', async createLabel(order){...}, async getTracking(t){...} };
// const EasyPostProvider = { name: 'easypost', ... };
// const ShipStationProvider = { name: 'shipstation', ... };
const PROVIDERS = {
  stub: StubProvider
  // shippo: ShippoProvider,
  // easypost: EasyPostProvider,
  // shipstation: ShipStationProvider,
};

function getProvider() {
  const name = (process.env.SHIPPING_PROVIDER || 'stub').toLowerCase();
  return PROVIDERS[name] || StubProvider;
}

// --- public API ------------------------------------------------------

/**
 * Create a shipping label for an order.
 * @param {object} order - order row (with optional .items array)
 * @returns {Promise<{provider,carrier,tracking_number,label_url,shipment,created_at,placeholder}>}
 */
async function createShippingLabel(order) {
  const provider = getProvider();
  return provider.createLabel(order);
}

/**
 * Look up tracking information for a shipment.
 * @param {string} trackingNumber
 * @returns {Promise<{provider,tracking_number,status,events,placeholder}>}
 */
async function getTrackingInfo(trackingNumber) {
  const provider = getProvider();
  return provider.getTracking(trackingNumber);
}

module.exports = {
  createShippingLabel,
  getTrackingInfo,
  buildShipmentFromOrder,
  getProvider,
  PROVIDERS
};
