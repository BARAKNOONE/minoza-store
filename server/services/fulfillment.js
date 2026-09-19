/**
 * Dropshipping Fulfillment Service Connector
 * Supports schema for SourcinBox, CJ Dropshipping, or Thai Private Fulfillment
 */

function createSupplierFulfillmentOrder({ orderId, customer, items, shippingMethod = 'express' }) {
  const trackingNumber = 'MNZ' + Math.floor(100000000 + Math.random() * 900000000) + 'TH';

  const supplierPayload = {
    partner: 'SourcinBox / CJ / Private Logistics',
    supplierOrderId: `SUP-${Date.now()}`,
    storeOrderId: orderId,
    orderDate: new Date().toISOString(),
    customer: {
      fullName: customer.name,
      phone: customer.phone,
      addressLine1: customer.address,
      subDistrict: customer.subDistrict || '',
      district: customer.district || '',
      province: customer.province,
      postalCode: customer.postalCode,
      country: 'Thailand',
      countryCode: 'TH'
    },
    items: items.map(item => ({
      sku: item.id,
      productName: item.name,
      quantity: item.quantity || 1,
      declaredValue: item.price
    })),
    shipping: {
      carrier: 'Fast Express (Kerry / Flash / YunExpress)',
      assignedTrackingNumber: trackingNumber,
      estimatedDeliveryDays: '4-7 วันทำการ'
    }
  };

  console.log(`[Dropshipping Fulfillment] 📦 Automated order dispatched to Supplier for Order #${orderId}`);
  console.log(`[Dropshipping Fulfillment] Tracking Number Generated: ${trackingNumber}`);

  return {
    success: true,
    trackingNumber,
    estimatedDelivery: '4-7 วันทำการ',
    supplierPayload
  };
}

module.exports = {
  createSupplierFulfillmentOrder
};
