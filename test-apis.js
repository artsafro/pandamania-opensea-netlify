// Test script to verify API keys work
const MORALIS_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImU5NTE4YzU5LTdjMDMtNGQyYS1iNDI5LWRjMmU4ODA4MTg0OSIsIm9yZ0lkIjoiNDY1NTYxIiwidXNlcklkIjoiNDc4OTYzIiwidHlwZUlkIjoiYTUxOGZlYWItYjJiMy00MzA4LWI2NWEtM2FlNzkzYWRjNmQxIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NTU0MTU2MjIsImV4cCI6NDkxMTE3NTYyMn0.gJH47fRTHPe_YUTa4bqm7qADcFmxb9SAvi4YopNn9Tc";
const OPENSEA_API_KEY = "ed56acab1fc14931b8382ab3daadc702";

// Test NFT collection (PandaMania example)
const TEST_CONTRACT = "0x29be0951309805ddcfa90592c3bf765925871344";
const TEST_SLUG = "pandamanianftcollection";

async function testMoralisAPI() {
    console.log("🔍 Testing Moralis API...");
    
    try {
        const response = await fetch(`https://deep-index.moralis.io/api/v2.2/nft/${TEST_CONTRACT}/stats?chain=eth`, {
            headers: {
                "X-API-Key": MORALIS_API_KEY
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Moralis API working!");
            console.log("📊 Stats:", {
                total_supply: data.total_supply,
                num_owners: data.num_owners,
                floor_price: data.floor_price
            });
            return true;
        } else {
            console.log("❌ Moralis API error:", response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.log("❌ Moralis API error:", error.message);
        return false;
    }
}

async function testOpenSeaAPI() {
    console.log("🔍 Testing OpenSea API...");
    
    try {
        const response = await fetch(`https://api.opensea.io/api/v2/collections/${TEST_SLUG}`, {
            headers: {
                "X-API-KEY": OPENSEA_API_KEY
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ OpenSea API working!");
            console.log("📊 Collection:", {
                name: data.name,
                description: data.description?.substring(0, 100) + "..."
            });
            return true;
        } else {
            console.log("❌ OpenSea API error:", response.status, response.statusText);
            return false;
        }
    } catch (error) {
        console.log("❌ OpenSea API error:", error.message);
        return false;
    }
}

async function runTests() {
    console.log("🚀 Starting API Tests...\n");
    
    const moralisWorks = await testMoralisAPI();
    console.log("");
    
    const openseaWorks = await testOpenSeaAPI();
    console.log("");
    
    if (moralisWorks && openseaWorks) {
        console.log("🎉 All APIs working! Ready for deployment.");
    } else {
        console.log("⚠️ Some APIs failed. Check your keys and try again.");
    }
}

// Run the tests
runTests();
