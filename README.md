# TALAT TAI Storefront

A responsive storefront prototype for a single Thai seller. It includes:

- English, Thai, and Myanmar storefront text
- Product filters
- Persistent shopping cart
- Delivery details and shipping calculation
- Thai QR styled checkout
- Receipt photo upload for seller review
- Admin payment review with approve/reject buttons
- Demo order number
- A clean boundary for connecting a real Thai QR payment provider

## Preview

Open `index.html` in a browser, or serve the directory with any static web server.

For example:

```sh
ruby -run -e httpd . -p 8080 -b 127.0.0.1
```

Then open `http://localhost:8080`.

## Important payment note

The included QR is deliberately marked `DEMO` and cannot receive money.

A production checkout must create the Thai QR charge on a trusted server. The server should:

1. Recalculate product prices and delivery costs from its own database.
2. Create the payment charge with the selected Thai payment provider.
3. Store the provider's payment ID against the order.
4. Receive and authenticate the provider's webhook.
5. Mark the order paid only after the provider confirms the exact amount and currency.

Do not let the browser decide that an order was paid. A payment slip upload can be useful for
manual review, but it is not equivalent to automatic bank confirmation.

The local prototype stores uploaded receipt images in browser storage so the admin dashboard can
review them. In production, receipt files should be uploaded to secure server storage, not saved
only in the browser.

## Connect a real payment API

The integration boundary is in `app.js`:

```js
const STORE_CONFIG = {
  paymentMode: "demo",
  createChargeEndpoint: "/api/payments/thai-qr",
};
```

Change `paymentMode` to `"production"` after the server endpoint exists. The endpoint currently
receives the customer, cart item IDs, quantities, and displayed total. Treat the total only as a
display hint and recalculate it on the server.

For a real launch, add:

- Product and inventory database
- Seller admin for products and orders
- Authentication for the admin
- Real shipping rates and tracking
- Tax invoice requirements for the business
- Privacy policy, terms, returns, and customer consent
- Transactional email or LINE notifications
- Deployment, backups, monitoring, and error reporting

## Customize

Store details and products currently live in `app.js`. Replace the sample product names, makers,
prices, categories, and colors there. Replace the store name, contact email, policies, and brand
copy in `index.html`.
