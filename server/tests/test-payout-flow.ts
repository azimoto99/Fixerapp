/**
 * Test script for verifying the worker payout flow
 * This script tests the payout API endpoints and Stripe Connect transfers
 */

import axios from "axios";
import { processWorkerPayout, processAllPendingPayoutsForWorker } from "../payout-handler";
import dotenv from "dotenv";
import { storage } from "../storage";

// Load environment variables
dotenv.config();

// Define test constants
const WORKER_ID = 9; // Azi account with Connect capability
const TEST_EARNING_ID = 2; // This needs to be a valid pending earning in the database

async function main() {
  console.log("=== Starting Worker Payout Flow Test ===");
  
  // 1. Direct function test: Process a single worker payout
  console.log("\n1. Testing direct payout function for earning #" + TEST_EARNING_ID);
  
  try {
    const result = await processWorkerPayout(TEST_EARNING_ID);
    console.log("Payout Result:");
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`SUCCESS: Transfer ID: ${result.transferId}`);
    } else {
      console.log(`FAILED: ${result.message}`);
    }
  } catch (error) {
    console.error("Error processing direct payout:", error);
  }
  
  // 2. Bulk processing test: Process all pending payouts for a worker
  console.log("\n2. Testing bulk payout processing for worker #" + WORKER_ID);
  
  try {
    const result = await processAllPendingPayoutsForWorker(WORKER_ID);
    console.log("Bulk Processing Result:");
    console.log(JSON.stringify(result, null, 2));
    
    console.log(`Processed ${result.totalProcessed} earnings, with ${result.successfulPayouts} successful payouts`);
    console.log(`Total amount paid: $${result.totalAmount.toFixed(2)}`);
  } catch (error) {
    console.error("Error processing bulk payouts:", error);
  }
  
  // 3. API endpoint tests
  console.log("\n3. Testing API endpoints (requires authentication)");
  
  const apiUrl = "http://localhost:5000/api";
  
  // First authenticate
  let sessionCookie: string | undefined;
  
  try {
    console.log("Authenticating as test user...");
    const loginResponse = await axios.post(`${apiUrl}/login`, {
      username: "Azi",
      password: "password123"
    }, {
      withCredentials: true,
      validateStatus: () => true
    });
    
    if (loginResponse.status === 200) {
      console.log("Authentication successful");
      const cookies = loginResponse.headers["set-cookie"];
      
      if (cookies && cookies.length > 0) {
        sessionCookie = cookies[0].split(";")[0];
        console.log("Session cookie acquired:", sessionCookie);
      }
    } else {
      console.error("Authentication failed:", loginResponse.data);
      process.exit(1);
    }
  } catch (error: any) {
    console.error("Error authenticating:", error.message);
    process.exit(1);
  }
  
  // Test the worker payout request endpoint
  try {
    console.log("\nTesting worker payout request endpoint...");
    
    const payoutResponse = await axios.post(
      `${apiUrl}/payments/request-payout`,
      {},
      {
        headers: {
          Cookie: sessionCookie
        },
        withCredentials: true,
        validateStatus: () => true
      }
    );
    
    console.log(`Response status: ${payoutResponse.status}`);
    console.log("Response data:");
    console.log(JSON.stringify(payoutResponse.data, null, 2));
  } catch (error: any) {
    console.error("Error testing payout request:", error.message);
  }
  
  console.log("\n=== Worker Payout Flow Test Complete ===");
}

// Run the test
main().catch(error => {
  console.error("Error in main test function:", error);
});