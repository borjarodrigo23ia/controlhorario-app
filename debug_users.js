
const https = require('https');

const options = {
    hostname: 'doli.borjarodrigo.com',
    path: '/api/index.php/users?limit=5&sqlfilters=(t.statut:=:1)',
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
        try {
            const users = JSON.parse(data);
            console.log(JSON.stringify(users, null, 2));

            if (Array.isArray(users)) {
                console.log('\n--- EXTRACTED ARRAY OPTIONS KEYS ---');
                users.forEach(u => {
                    if (u.array_options) {
                        console.log(`User: ${u.login}`, Object.keys(u.array_options));
                    } else {
                        console.log(`User: ${u.login} - No array_options`);
                    }
                });
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
            console.error('Raw data:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.end();
