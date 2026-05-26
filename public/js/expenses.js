/* ===== CP04 TEST UI - REMOVE IN CP06 =====

// Expenses CRUD Testing UI
const expenseListDiv = document.getElementById('expense-list');

// Sample expense data for testing
const sampleExpense = {
  amount: 12.50,
  category: "Food",
  merchant: "Boba Guys",
  date: new Date().toISOString().split('T')[0],
  notes: "After school with friends"
};

// DOM elements
let statusBox;
let jsonPre;

// Initialize the UI
function initUI() {
  expenseListDiv.innerHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
      <h2 style="margin-top: 0;">Expenses Testing Panel</h2>
      
      <button id="create-expense-btn" style="background: #4CAF50; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; margin-bottom: 20px;">
        Create Sample Expense
      </button>
      
      <div id="status-box" style="padding: 10px; margin: 10px 0; border-radius: 4px; background: #e7f3fe; border: 1px solid #2196F3; color: #1976D2;">
        Status: Ready
      </div>
      
      <h3>Live Data:</h3>
      <pre id="json-view" style="background: white; padding: 15px; border-radius: 4px; border: 1px solid #ddd; overflow-x: auto; max-height: 300px; overflow-y: auto;">Loading...</pre>
      
      <div id="expense-items" style="margin-top: 20px;"></div>
    </div>
  `;

  statusBox = document.getElementById('status-box');
  jsonPre = document.getElementById('json-view');

  // Attach event listeners
  document.getElementById('create-expense-btn').addEventListener('click', () => createItem(sampleExpense));

  // Load initial data
  loadData();
}

// Load all expenses for the current user
async function loadData() {
  try {
    const response = await fetch('/api/expenses', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const expenses = await response.json();
    updateStatus(`Loaded ${expenses.length} expenses`);
    renderItems(expenses);
    jsonPre.textContent = JSON.stringify(expenses, null, 2);
  } catch (error) {
    updateStatus(`Error loading expenses: ${error.message}`);
    jsonPre.textContent = `Error: ${error.message}`;
  }
}

// Create a new expense
async function createItem(expenseData) {
  try {
    const response = await fetch('/api/expenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expenseData),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newExpense = await response.json();
    updateStatus(`Created expense: ${newExpense.id}`);
    loadData();
  } catch (error) {
    updateStatus(`Error creating expense: ${error.message}`);
  }
}

// Update an expense
async function updateItem(id) {
  try {
    const response = await fetch(`/api/expenses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes: 'Updated via test button' }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const updatedExpense = await response.json();
    updateStatus(`Updated expense: ${updatedExpense.id}`);
    loadData();
  } catch (error) {
    updateStatus(`Error updating expense: ${error.message}`);
  }
}

// Delete an expense
async function deleteItem(id) {
  try {
    const response = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    updateStatus(`Deleted expense: ${id}`);
    loadData();
  } catch (error) {
    updateStatus(`Error deleting expense: ${error.message}`);
  }
}

// Render expense items with action buttons
function renderItems(expenses) {
  const itemsDiv = document.getElementById('expense-items');
  
  if (expenses.length === 0) {
    itemsDiv.innerHTML = '<p>No expenses found. Create one to get started!</p>';
    return;
  }
  
  let html = '<h4>Your Expenses:</h4>';
  expenses.forEach(expense => {
    html += `
      <div style="padding: 10px; margin: 5px 0; border: 1px solid #eee; border-radius: 4px; background: white;">
        <strong>${expense.merchant}</strong> - $${expense.amount} (${expense.category})<br>
        <small>${expense.date} - ${expense.notes}</small><br>
        <button onclick="updateItem('${expense.id}')" style="background: #2196F3; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-top: 5px;">
          Test Update
        </button>
        <button onclick="deleteItem('${expense.id}')" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-top: 5px; margin-left: 5px;">
          Test Delete
        </button>
      </div>
    `;
  });
  
  itemsDiv.innerHTML = html;
}

// Update status message
function updateStatus(message) {
  statusBox.textContent = `Status: ${message}`;
  statusBox.style.background = message.includes('Error') ? '#ffebee' : '#e7f3fe';
  statusBox.style.color = message.includes('Error') ? '#d32f2f' : '#1976D2';
  statusBox.style.borderColor = message.includes('Error') ? '#ef9a9a' : '#2196F3';
}

// Initialize when DOM is loaded
if (expenseListDiv) {
  initUI();
} else {
  console.error('Could not find #expense-list div');
}

===== */