/**
 * Functional Tests for Reinsdyr Registration System
 * 
 * These tests verify the core functionality of the application.
 * They are meant to be run manually through the browser console or via an automated testing tool.
 */

// Configuration - update these values to match your test environment
const API_URL = 'http://localhost:5000/api';
let authToken = '';
let testEierId = '';
let testReinsdyrId = '';
let testFlokkId1 = '';
let testFlokkId2 = '';
let testTransactionId = '';
let testReceiverEmail = 'test-receiver@example.com';

// Test User Credentials
const TEST_USER = {
  username: 'test-user',
  password: 'Test123!',
  navn: 'Test Bruker',
  epost: 'test@example.com',
  telefonnummer: '12345678',
  kontaktsprak: 'Nordsamisk'
};

const TEST_USER_RECEIVER = {
  username: 'test-receiver',
  password: 'Test123!',
  navn: 'Test Mottaker',
  epost: 'test-receiver@example.com',
  telefonnummer: '87654321',
  kontaktsprak: 'Sørsamisk'
};

// Helper Functions
async function fetchWithAuth(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    'Content-Type': 'application/json'
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error(`Error: ${data.message || 'Unknown error'}`);
    throw new Error(data.message || 'API request failed');
  }
  
  return data;
}

// Test Functions
async function testRegisterUser() {
  console.log('Testing user registration...');
  
  try {
    const data = await fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify(TEST_USER)
    });
    
    console.log('✅ User registration successful');
    return true;
  } catch (error) {
    console.error('❌ User registration failed:', error.message);
    return false;
  }
}

async function testRegisterReceiverUser() {
  console.log('Testing receiver user registration...');
  
  try {
    const data = await fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify(TEST_USER_RECEIVER)
    });
    
    console.log('✅ Receiver user registration successful');
    return true;
  } catch (error) {
    console.error('❌ Receiver user registration failed:', error.message);
    return false;
  }
}

async function testLogin() {
  console.log('Testing login...');
  
  try {
    const data = await fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: TEST_USER.username,
        password: TEST_USER.password
      })
    });
    
    authToken = data.token;
    testEierId = data.user.eierId;
    
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    return false;
  }
}

async function testCreateFlokk() {
  console.log('Testing flokk creation...');
  
  try {
    const data = await fetchWithAuth('/flokk', {
      method: 'POST',
      body: JSON.stringify({
        navn: 'Test Flokk 1',
        serieinndeling: 'A',
        buemerke_navn: 'Test Buemerke',
        beiteomradeId: await getFirstBeiteomradeId()
      })
    });
    
    testFlokkId1 = data.flokk._id;
    
    console.log('✅ Flokk 1 creation successful');
    return true;
  } catch (error) {
    console.error('❌ Flokk creation failed:', error.message);
    return false;
  }
}

async function testCreateSecondFlokk() {
  console.log('Testing second flokk creation...');
  
  try {
    const data = await fetchWithAuth('/flokk', {
      method: 'POST',
      body: JSON.stringify({
        navn: 'Test Flokk 2',
        serieinndeling: 'B',
        buemerke_navn: 'Test Buemerke 2',
        beiteomradeId: await getFirstBeiteomradeId()
      })
    });
    
    testFlokkId2 = data.flokk._id;
    
    console.log('✅ Flokk 2 creation successful');
    return true;
  } catch (error) {
    console.error('❌ Flokk 2 creation failed:', error.message);
    return false;
  }
}

async function testCreateReinsdyr() {
  console.log('Testing reinsdyr creation...');
  
  try {
    // Updated to use flokkIds array and hovedFlokkId instead of flokkId
    const data = await fetchWithAuth('/reinsdyr', {
      method: 'POST',
      body: JSON.stringify({
        serienummer: 'TEST-001',
        navn: 'Test Reinsdyr',
        flokkIds: [testFlokkId1],  // Array of flokk IDs
        hovedFlokkId: testFlokkId1, // The main flokk ID
        fodselsdato: '2020-01-01'
      })
    });
    
    testReinsdyrId = data.reinsdyr._id;
    
    console.log('✅ Reinsdyr creation successful');
    return true;
  } catch (error) {
    console.error('❌ Reinsdyr creation failed:', error.message);
    return false;
  }
}

async function testInternalTransfer() {
  console.log('Testing internal transfer between flokker...');
  
  if (!testReinsdyrId || !testFlokkId2) {
    console.error('❌ Internal transfer failed: Missing reinsdyr ID or target flokk ID');
    return false;
  }
  
  try {
    // Add the second flokk to reinsdyr
    const data = await fetchWithAuth('/reinsdyr/add-flokk', {
      method: 'POST',
      body: JSON.stringify({
        reinsdyrId: testReinsdyrId,
        flokkId: testFlokkId2
      })
    });
    
    console.log('✅ Added second flokk to reinsdyr');
    
    // Now set the second flokk as hovedFlokk
    const updateData = await fetchWithAuth(`/reinsdyr/${testReinsdyrId}`, {
      method: 'PUT',
      body: JSON.stringify({
        hovedFlokkId: testFlokkId2
      })
    });
    
    console.log('✅ Internal transfer successful');
    
    // Verify the transfer
    const reinsdyr = await fetchWithAuth(`/reinsdyr/${testReinsdyrId}`);
    
    if (reinsdyr.hovedFlokk === testFlokkId2 || 
        (reinsdyr.hovedFlokk && reinsdyr.hovedFlokk._id === testFlokkId2)) {
      console.log('✅ Verification successful - reinsdyr hovedFlokk is now the new flokk');
      return true;
    } else {
      console.error('❌ Verification failed - reinsdyr is not in the expected flokk');
      return false;
    }
  } catch (error) {
    console.error('❌ Internal transfer failed:', error.message);
    return false;
  }
}

async function testCreateTransaction() {
  console.log('Testing transaction creation to another owner...');
  
  if (!testReinsdyrId) {
    console.error('❌ Transaction creation failed: Missing reinsdyr ID');
    return false;
  }
  
  try {
    const data = await fetchWithAuth('/transaction', {
      method: 'POST',
      body: JSON.stringify({
        reinsdyrId: testReinsdyrId,
        toEierEmail: testReceiverEmail,
        offerText: 'Test transaction offer'
      })
    });
    
    testTransactionId = data.transaction._id;
    
    console.log('✅ Transaction creation successful');
    return true;
  } catch (error) {
    console.error('❌ Transaction creation failed:', error.message);
    return false;
  }
}

async function testLoginReceiver() {
  console.log('Testing login as receiver...');
  
  try {
    const data = await fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: TEST_USER_RECEIVER.username,
        password: TEST_USER_RECEIVER.password
      })
    });
    
    authToken = data.token;
    
    console.log('✅ Receiver login successful');
    return true;
  } catch (error) {
    console.error('❌ Receiver login failed:', error.message);
    return false;
  }
}

async function testAcceptTransaction() {
  console.log('Testing transaction acceptance by receiver...');
  
  if (!testTransactionId) {
    console.error('❌ Transaction acceptance failed: Missing transaction ID');
    return false;
  }
  
  try {
    const data = await fetchWithAuth(`/transaction/${testTransactionId}/accept`, {
      method: 'PUT'
    });
    
    console.log('✅ Transaction acceptance successful');
    return true;
  } catch (error) {
    console.error('❌ Transaction acceptance failed:', error.message);
    return false;
  }
}

async function testLoginOriginalUser() {
  console.log('Testing login back as original user...');
  
  try {
    const data = await fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: TEST_USER.username,
        password: TEST_USER.password
      })
    });
    
    authToken = data.token;
    
    console.log('✅ Original user login successful');
    return true;
  } catch (error) {
    console.error('❌ Original user login failed:', error.message);
    return false;
  }
}

async function testConfirmTransaction() {
  console.log('Testing transaction confirmation by original owner...');
  
  if (!testTransactionId) {
    console.error('❌ Transaction confirmation failed: Missing transaction ID');
    return false;
  }
  
  try {
    const data = await fetchWithAuth(`/transaction/${testTransactionId}/confirm`, {
      method: 'PUT',
      body: JSON.stringify({})
    });
    
    console.log('✅ Transaction confirmation successful');
    return true;
  } catch (error) {
    console.error('❌ Transaction confirmation failed:', error.message);
    return false;
  }
}

async function getFirstBeiteomradeId() {
  try {
    const beiteomrader = await fetchWithAuth('/beiteomrade');
    return beiteomrader[0]._id;
  } catch (error) {
    console.error('Error getting beiteomrade ID:', error.message);
    throw error;
  }
}

async function testVerifyOwnership() {
  console.log('Testing that unauthorized users cannot modify other users\' reinsdyr...');
  
  // Create a test reinsdyr as the original user
  await testLogin();
  await testCreateReinsdyr();
  
  // Try to modify it as the receiver user
  await testLoginReceiver();
  
  if (!testReinsdyrId) {
    console.error('❌ Security test failed - no reinsdyr ID to test with');
    return false;
  }
  
  try {
    await fetchWithAuth(`/reinsdyr/${testReinsdyrId}`, {
      method: 'PUT',
      body: JSON.stringify({
        navn: 'Hacked Reinsdyr',
        serienummer: 'HACKED-001',
        fodselsdato: '2020-01-01'
      })
    });
    
    console.error('❌ Security test failed - unauthorized modification was allowed');
    return false;
  } catch (error) {
    console.log('✅ Security test passed - unauthorized modification was blocked');
    return true;
  }
}

// Run All Tests
async function runAllTests() {
  console.log('Starting all tests...');
  
  // Setup
  await testRegisterUser();
  await testRegisterReceiverUser();
  await testLogin();
  
  // Basic functionality
  await testCreateFlokk();
  await testCreateSecondFlokk();
  await testCreateReinsdyr();
  
  // Internal transfers
  await testInternalTransfer();
  
  // External transfers
  await testCreateTransaction();
  await testLoginReceiver();
  await testAcceptTransaction();
  await testLoginOriginalUser();
  await testConfirmTransaction();
  
  // Security tests
  await testVerifyOwnership();
  
  console.log('All tests completed!');
}

// Helper to create test data for demonstration
async function createSampleData() {
  console.log('Creating sample data...');
  
  // Register users
  await testRegisterUser();
  await testRegisterReceiverUser();
  await testLogin();
  
  // Create flokker
  await testCreateFlokk();
  await testCreateSecondFlokk();
  
  // Create several reinsdyr in each flokk
  testFlokkId1 = testFlokkId1 || await getFirstFlokkId();
  testFlokkId2 = testFlokkId2 || await getSecondFlokkId();
  
  for (let i = 1; i <= 15; i++) {
    await fetchWithAuth('/reinsdyr', {
      method: 'POST',
      body: JSON.stringify({
        serienummer: `TEST-${i.toString().padStart(3, '0')}`,
        navn: `Test Reinsdyr ${i}`,
        flokkIds: [i <= 10 ? testFlokkId1 : testFlokkId2], // Using flokkIds array
        hovedFlokkId: i <= 10 ? testFlokkId1 : testFlokkId2, // Using hovedFlokkId
        fodselsdato: '2020-01-01'
      })
    });
    console.log(`Created reinsdyr ${i}`);
  }
  
  console.log('Sample data created!');
}

async function getFirstFlokkId() {
  try {
    const flokker = await fetchWithAuth('/flokk/my');
    return flokker[0]._id;
  } catch (error) {
    console.error('Error getting flokk ID:', error.message);
    throw error;
  }
}

async function getSecondFlokkId() {
  try {
    const flokker = await fetchWithAuth('/flokk/my');
    return flokker[1]._id;
  } catch (error) {
    console.error('Error getting flokk ID:', error.message);
    throw error;
  }
}

// Export functions for use in browser console or other scripts
if (typeof window !== 'undefined') {
  window.testFunctions = {
    runAllTests,
    createSampleData,
    testRegisterUser,
    testRegisterReceiverUser,
    testLogin,
    testCreateFlokk,
    testCreateSecondFlokk,
    testCreateReinsdyr,
    testInternalTransfer,
    testCreateTransaction,
    testLoginReceiver,
    testAcceptTransaction,
    testLoginOriginalUser,
    testConfirmTransaction,
    testVerifyOwnership
  };
}

// For Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    createSampleData,
    testRegisterUser,
    testRegisterReceiverUser,
    testLogin,
    testCreateFlokk,
    testCreateSecondFlokk,
    testCreateReinsdyr,
    testInternalTransfer,
    testCreateTransaction,
    testLoginReceiver,
    testAcceptTransaction,
    testLoginOriginalUser,
    testConfirmTransaction,
    testVerifyOwnership
  };
}