const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch('https://cromsen-backend.onrender.com/api/orders');
    const data = await res.json();
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
