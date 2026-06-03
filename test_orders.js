const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch('https://api.cromsennest.com/api/orders');
    const data = await res.json();
    console.log('Keys of data:', Object.keys(data));
    const orders = Array.isArray(data) ? data : data.orders || data.data || [];
    console.log('Orders count:', orders.length);
    if (orders.length > 0) {
      console.log('First order:', JSON.stringify(orders[0], null, 2));
    } else {
      console.log('Raw data response:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}

test();
