const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");
const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');
const { ethers } = require('ethers');

module.exports = async function (context, req) {

    // Build the URL to reach your key vault
    const vault_name = "ozdefender-apikey";
    const url = `https://${vault_name}.vault.azure.net`;

    const azure_credential = new DefaultAzureCredential();
    const client = new SecretClient(url, azure_credential);

    const retrievedBitlogKey= await client.getSecret("api-key");
    const bitlog_key = retrievedBitlogKey.value;

    const bitlog_api_key = req.body.api_key;

    // check for valid key
    if (bitlog_key != bitlog_api_key) {
        context.res = {
            status: 401,
            error: "Invalid API key provided."
        };
    } else {
        const retrievedKey= await client.getSecret("oz-key");
        const oz_key = retrievedKey.value;
    
        const retrievedSecret = await client.getSecret("oz-secret");
        const oz_secret = retrievedSecret.value;
    
        // make request to relayer
        const addr = req.body.addr;
        const id = req.body.id;
        
        const credentials = { apiKey: oz_key, apiSecret: oz_secret };
        const provider = new DefenderRelayProvider(credentials);
        const signer = new DefenderRelaySigner(credentials, provider, { speed: 'fast' });
    
        const contract_address = "0x2D8A1cbA6E1537eAA8D2da32Cce64F0FE7009952";
        const contractJson = require("./BitLog.json");
        
        const bitlog = new ethers.Contract(contract_address, JSON.stringify(contractJson), signer);
        const tx = await bitlog['addCommit'](id, addr);
    
        context.res = {
            // status: 200, /* Defaults to 200 */
            body: tx
        };
    }
    
}