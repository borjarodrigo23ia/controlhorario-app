
const https = require('https');

const options = {
    hostname: 'doli.borjarodrigo.com',
    path: '/api/index.php/setupempresaapi',
    method: 'GET',
    headers: {
        'DOLAPIKEY': '3a0329b010b968c04c0e19cc33ebc9b402d38873',
        'Accept': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        try {
            console.log('Response:', data);
            const json = JSON.parse(data);
            console.log('Parsed:', json);
        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.end();
