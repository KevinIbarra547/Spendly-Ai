// ===== CP04 TEST UI START - REMOVE IN CP06 =====

// Goals CRUD Testing UI
const goalListDiv = document.getElementById('goal-list');

// Sample goal data for testing
const sampleGoal = {
  title: "Concert Tickets",
  targetAmount: 150.00,
  currentSaved: 45.00,
  deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
};

// DOM elements
let statusBox;
let jsonPre;

// Initialize the UI
function initUI() {
  goalListDiv.innerHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
      <h2 style="margin-top: 0;">Goals Testing Panel</h2>
      
      <button id="create-goal-btn" style="background: #4CAF50; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; margin-bottom: 20px;">
        Create Sample Goal
      </button>
      
      <div id="status-box" style="padding: 10px; margin: 10px 0; border-radius: 4px; background: #e7f3fe; border: 1px solid #2196F3; color: #1976D2;">
        Status: Ready
      </div>
      
      <h3>Live Data:</h3>
      <pre id="json-view" style="background: white; padding: 15px; border-radius: 4px; border: 1px solid #ddd; overflow-x: auto; max-height: 300px; overflow-y: auto;">Loading...</pre>
      
      <div id="goal-items" style="margin-top: 20px;"></div>
    </div>
  `;

  statusBox = document.getElementById('status-box');
  jsonPre = document.getElementById('json-view');

  // Attach event listeners
  document.getElementById('create-goal-btn').addEventListener('click', () => createItem(sampleGoal));

  // Load initial data
  loadData();
}

// Load all goals for the current user
async function loadData() {
  try {
    const response = await fetch('/api/expenses/goals', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const goals = await response.json();
    updateStatus(`Loaded ${goals.length} goals`);
    renderItems(goals);
    jsonPre.textContent = JSON.stringify(goals, null, 2);
  } catch (error) {
    updateStatus(`Error loading goals: ${error.message}`);
    jsonPre.textContent = `Error: ${error.message}`;
  }
}

// Create a new goal
async function createItem(goalData) {
  try {
    const response = await fetch('/api/expenses/goals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(goalData),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newGoal = await response.json();
    updateStatus(`Created goal: ${newGoal.id}`);
    loadData();
  } catch (error) {
    updateStatus(`Error creating goal: ${error.message}`);
  }
}

// Update a goal
async function updateItem(id) {
  try {
    const response = await fetch(`/api/expenses/goals/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentSaved: 50.00 }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const updatedGoal = await response.json();
    updateStatus(`Updated goal: ${updatedGoal.id}`);
    loadData();
  } catch (error) {
    updateStatus(`Error updating goal: ${error.message}`);
  }
}

// Delete a goal
async function deleteItem(id) {
  try {
    const response = await fetch(`/api/expenses/goals/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    updateStatus(`Deleted goal: ${id}`);
    loadData();
  } catch (error) {
    updateStatus(`Error deleting goal: ${error.message}`);
  }
}

// Render goal items with action buttons
function renderItems(goals) {
  const itemsDiv = document.getElementById('goal-items');
  
  if (goals.length === 0) {
    itemsDiv.innerHTML = '<p>No goals found. Create one to get started!</p>';
    return;
  }
  
  let html = '<h4>Your Goals:</h4>';
  goals.forEach(goal => {
    const progress = goal.currentSaved && goal.targetAmount 
      ? ((goal.currentSaved / goal.targetAmount) * 100).toFixed(1) 
      : 0;
    html += `
      <div style="padding: 10px; margin: 5px 0; border: 1px solid #eee; border-radius: 4px; background: white;">
        <strong>${goal.title}</strong> - $${goal.currentSaved} / $${goal.targetAmount} (${progress}%)<br>
        <small>Deadline: ${goal.deadline}</small><br>
        <button onclick="updateItem('${goal.id}')" style="background: #2196F3; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-top: 5px;">
          Test Update
        </button>
        <button onclick="deleteItem('${goal.id}')" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-top: 5px; margin-left: 5px;">
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
if (goalListDiv) {
  initUI();
} else {
  console.error('Could not find #goal-list div');
}
