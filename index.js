import 'dotenv/config';
import axios from 'axios';
import { CoinbasePro } from 'coinbase-pro-node';
import { RequestSigner } from 'coinbase-pro-node/dist/auth/RequestSigner.js';

const auth = {
  apiKey: process.env.API_KEY,
  apiSecret: process.env.API_SECRET,
  passphrase: process.env.PASSPHRASE,
  useSandbox: false,
};

const client = new CoinbasePro(auth);

const AMOUNT = 1.00;

const coins = [
    'BTC', 
    'ETH', 
    'DAI', 
    'ADA', 
    'AVAX', 
    'MANA', 
    'DOT', 
    'SUSHI', 
    'UNI', 
    'LINK', 
    'DOGE', 
    'MKR', 
    'POWR', 
    'MATIC', 
    'AAVE', 
    'UMA', 
    'FET', 
    'ICP',
    'APE',
    'SOL'
];

const getProfileID = async () => {
    return client.rest.profile.listProfiles()
    .then(response => {
        return response[0].id;
    })
    .catch(error => {
        console.log(error);
    });
};


const getPaymentMethods = async () => {
    let requestSetup = {
        httpMethod: 'GET',
        payload: '',
        requestPath: '/payment-methods'
    }
    const time = await client.rest.time.getTime();
    let clockSkew = await client.rest.time.getClockSkew(time);
    let signedRequest = RequestSigner.signRequest(auth, requestSetup, clockSkew);
    let config = {};
    config.headers = { 
        'Accept': 'application/json', 
        'CB-ACCESS-KEY': signedRequest.key, 
        'CB-ACCESS-PASSPHRASE': signedRequest.passphrase, 
        'CB-ACCESS-SIGN': signedRequest.signature, 
        'CB-ACCESS-TIMESTAMP': `${signedRequest.timestamp}` 
    };
    return axios.get("https://api.exchange.coinbase.com/payment-methods", config)
    .then(response => {
        return response.data[0].id;
    })
    .catch(error => {
        console.log(error);
    });
};

const depositFromPaymentMethod = async (profileID, paymentMethodID) => {
    let payload = {
        profile_id: profileID,
        amount: '20.00',
        payment_method_id: paymentMethodID,
        currency: 'USD'
    };
    let requestSetup = {
        httpMethod: 'POST',
        payload: JSON.stringify(payload),
        requestPath: '/deposits/payment-method'
    }
    const time = await client.rest.time.getTime();
    let clockSkew = await client.rest.time.getClockSkew(time);
    let signedRequest = RequestSigner.signRequest(auth, requestSetup, clockSkew);
    let config = {};
    config.headers = { 
        'Accept': 'application/json',
        'Content-Type': 'application/json', 
        'CB-ACCESS-KEY': signedRequest.key, 
        'CB-ACCESS-PASSPHRASE': signedRequest.passphrase, 
        'CB-ACCESS-SIGN': signedRequest.signature, 
        'CB-ACCESS-TIMESTAMP': `${signedRequest.timestamp}` 
    };
    return axios.post("https://api.exchange.coinbase.com/deposits/payment-method", payload, config)
    .then(response => {
        return response.status;
    })
    .catch(error => {
        console.log(error);
    });
};

const placeOrder = async coin => {
    return client.rest.order.placeOrder({
        type: 'market',
        side: 'buy',
        product_id: `${coin}-USD`,
        funds: AMOUNT,
    })
    .then(response => {
        return response.id;
    })
    .catch(error => {
        console.log(error);
    });
};

const getOrderStatus = async orderID =>{
    return client.rest.order.getOrder(orderID)
    .then(response => {
        return response.settled;
    })
    .catch(error => {
        console.log(error);
    });
};

const main = async () => {
    const profileID = await getProfileID();

    const paymentMethodID = await getPaymentMethods();

    const depositStatus = await depositFromPaymentMethod(profileID, paymentMethodID);

    if (depositStatus === 200) {
        for (let coin of coins) {
            const orderID = await placeOrder(coin);
        
            let orderSettled = await getOrderStatus(orderID);
            while (!orderSettled) {
                await new Promise(r => setTimeout(r, 1000));
                orderSettled = await getOrderStatus(orderID);
            }
        }
    }
};

main();