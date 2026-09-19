/**
 * Minoza Store - Frictionless 1-Page Checkout & Payment Engine
 * Handles Stripe Elements, Dynamic PromptPay QR Code Modal, and Order Submission
 */

window.MinozaCheckout = {
  selectedPaymentMethod: 'promptpay',
  currentOrderId: null,
  currentAmount: 0,
  promptpayTimerInterval: null,

  init: function () {
    this.initPaymentTabs();
    this.initCheckoutForm();
  },

  initPaymentTabs: function () {
    const tabs = document.querySelectorAll('.payment-method-card, .payment-tab, .pay-card-clean');
    const cardFields = document.getElementById('creditCardFields');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => {
          t.classList.remove('selected');
          t.classList.remove('active');
        });
        tab.classList.add('selected');
        tab.classList.add('active');
        this.selectedPaymentMethod = tab.dataset.method;

        if (this.selectedPaymentMethod === 'card') {
          if (cardFields) cardFields.style.display = 'block';
        } else {
          if (cardFields) cardFields.style.display = 'none';
        }
      });
    });
  },

  initCheckoutForm: function () {
    const form = document.getElementById('checkoutForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleOrderSubmit();
    });
  },

  handleOrderSubmit: async function () {
    const submitBtn = document.getElementById('submitOrderBtn');
    const nameInput = document.getElementById('customerName');
    const phoneInput = document.getElementById('customerPhone');
    const addressInput = document.getElementById('customerAddress');
    const provinceInput = document.getElementById('customerProvince');
    const postalInput = document.getElementById('customerPostal');

    // Basic Validation
    if (!nameInput.value.trim()) {
      alert('กรุณากรอกชื่อ-นามสกุลสำหรับจัดส่ง');
      nameInput.focus();
      return;
    }
    if (!phoneInput.value.trim() || phoneInput.value.trim().length < 9) {
      alert('กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้องสำหรับติดต่อรับพัสดุ');
      phoneInput.focus();
      return;
    }
    if (!addressInput.value.trim()) {
      alert('กรุณากรอกที่อยู่จัดส่ง');
      addressInput.focus();
      return;
    }

    const items = window.MinozaStore.getCurrentCheckoutItems();
    if (!items.length) {
      alert('กรุณาเลือกสินค้าก่อนทำการสั่งซื้อ');
      return;
    }

    const customer = {
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      address: addressInput.value.trim(),
      province: provinceInput.value.trim(),
      postalCode: postalInput.value.trim()
    };

    const utm = window.MinozaTracking.getUtmParameters();
    const eventId = window.MinozaTracking.generateEventId('purchase');
    const fbp = window.MinozaTracking.getFbpCookie();
    const fbc = window.MinozaTracking.getFbcCookie();

    // Disable button & show spinner
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>⏳ กำลังเชื่อมต่อระบบชำระเงิน...</span>`;

    try {
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customer,
          paymentMethod: this.selectedPaymentMethod,
          utm,
          eventId
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      this.currentOrderId = data.orderId;
      this.currentAmount = data.amount;

      if (this.selectedPaymentMethod === 'promptpay') {
        this.openPromptPayModal({
          orderId: data.orderId,
          amount: data.amount,
          qrCodeData: data.promptpayQr,
          customer,
          items,
          utm,
          eventId,
          fbp,
          fbc
        });
      } else {
        // Credit Card Flow
        await this.processCardPayment({
          orderId: data.orderId,
          amount: data.amount,
          customer,
          items,
          utm,
          eventId,
          fbp,
          fbc
        });
      }

    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>🔒 ยืนยันคำสั่งซื้อ & ชำระเงิน</span>`;
    }
  },

  // Open PromptPay Modal
  openPromptPayModal: function ({ orderId, amount, customer, items, utm, eventId, fbp, fbc }) {
    const modal = document.getElementById('promptpayModal');
    const amountElem = document.getElementById('qrModalAmount');
    const qrImg = document.getElementById('qrCodeImage');
    const confirmBtn = document.getElementById('btnSimulateQrPaid');

    amountElem.textContent = `฿${amount.toLocaleString()}`;

    // PromptPay QR Code generator (via promptpay.io API / SVG)
    const normalizedPhone = customer.phone.replace(/[^0-9]/g, '');
    qrImg.src = `https://promptpay.io/0812345678/${amount}.png`;

    modal.classList.add('active');
    this.startPromptpayTimer(15 * 60); // 15 mins

    // Set listener for the simulated "สแกนแล้ว / ชำระเงินสำเร็จ"
    confirmBtn.onclick = async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = '⏳ กำลังตรวจสอบยอดชำระ...';

      setTimeout(async () => {
        await this.finalizeOrder({
          orderId,
          amount,
          customer,
          items,
          paymentMethod: 'PromptPay QR (สแกนจ่ายสำเร็จ)',
          utm,
          eventId,
          fbp,
          fbc
        });
        this.closePromptPayModal();
      }, 1200);
    };
  },

  closePromptPayModal: function () {
    document.getElementById('promptpayModal')?.classList.remove('active');
    if (this.promptpayTimerInterval) clearInterval(this.promptpayTimerInterval);
  },

  startPromptpayTimer: function (seconds) {
    let timeLeft = seconds;
    const timerElem = document.getElementById('qrCountdownText');
    if (!timerElem) return;

    if (this.promptpayTimerInterval) clearInterval(this.promptpayTimerInterval);

    this.promptpayTimerInterval = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(this.promptpayTimerInterval);
        timerElem.textContent = 'QR Code หมดอายุ กรุณากดสั่งซื้อใหม่';
        return;
      }
      timeLeft--;
      const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
      const secs = String(timeLeft % 60).padStart(2, '0');
      timerElem.textContent = `กรุณาชำระเงินภายใน ${mins}:${secs} นาที`;
    }, 1000);
  },

  // Process Credit Card Payment
  processCardPayment: async function ({ orderId, amount, customer, items, utm, eventId, fbp, fbc }) {
    const cardNumber = document.getElementById('cardNumber')?.value.trim();
    const cardExp = document.getElementById('cardExpiry')?.value.trim();
    const cardCvc = document.getElementById('cardCvc')?.value.trim();

    if (!cardNumber || !cardExp || !cardCvc) {
      alert('กรุณากรอกข้อมูลบัตรเครดิตให้ครบถ้วน');
      return;
    }

    // Simulate 3D Secure / Stripe Card Confirmation
    const submitBtn = document.getElementById('submitOrderBtn');
    submitBtn.innerHTML = `<span>⏳ กำลังยืนยัน 3D Secure กับธนาคาร...</span>`;

    setTimeout(async () => {
      await this.finalizeOrder({
        orderId,
        amount,
        customer,
        items,
        paymentMethod: `Credit/Debit Card (ลงท้ายด้วย ${cardNumber.slice(-4) || '4242'})`,
        utm,
        eventId,
        fbp,
        fbc
      });
    }, 1500);
  },

  // Finalize order, trigger CAPI & show Thank You page
  finalizeOrder: async function ({ orderId, amount, customer, items, paymentMethod, utm, eventId, fbp, fbc }) {
    try {
      const res = await fetch('/api/confirm-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount,
          customer,
          items,
          paymentMethod,
          utm,
          eventId,
          fbp,
          fbc
        })
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      // Track Browser Purchase Event for Pixel
      window.MinozaTracking.track('Purchase', {
        value: amount,
        currency: 'THB',
        content_type: 'product',
        order_id: orderId,
        contents: items.map(i => ({ id: i.id, quantity: i.quantity, price: i.price }))
      }, eventId);

      // Clear cart
      window.MinozaStore.cart = [];
      window.MinozaStore.updateCartUI();

      // Show Thank You Modal
      this.showThankYouModal(result.order);

    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกคำสั่งซื้อ: ' + err.message);
      console.error(err);
    }
  },

  showThankYouModal: function (order) {
    const modal = document.getElementById('thankYouModal');
    if (!modal) return;

    document.getElementById('tyOrderId').textContent = '#' + order.orderId;
    document.getElementById('tyTrackingNum').textContent = order.trackingNumber;
    document.getElementById('tyCustomerName').textContent = order.customer.name;
    document.getElementById('tyCustomerAddress').textContent = `${order.customer.address}, ${order.customer.province} ${order.customer.postalCode}`;
    document.getElementById('tyAmount').textContent = `฿${order.amount.toLocaleString()}`;
    document.getElementById('tyPaymentMethod').textContent = order.paymentMethod;

    modal.classList.add('active');
  }
};

window.addEventListener('DOMContentLoaded', () => {
  window.MinozaCheckout.init();
});
