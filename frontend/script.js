// Frontend logic for interacting with the backend API

const apiBase = '';

const nameInput = document.getElementById('name');
const descriptionInput = document.getElementById('description');
const createBtn = document.getElementById('create-btn');
const itemsBody = document.getElementById('items-body');

// Fetch all items from the backend and render them
async function fetchItems() {
  try {
    const res = await fetch(`${apiBase}/items`);
    if (!res.ok) {
      throw new Error('Failed to fetch items');
    }
    const items = await res.json();
    renderItems(items);
  } catch (err) {
    console.error(err);
    alert('Error fetching items');
  }
}

// Render items into the table body
function renderItems(items) {
  itemsBody.innerHTML = '';
  items.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.id}</td>
      <td>${item.name}</td>
      <td>${item.description}</td>
      <td>
        <button class="edit-btn" data-id="${item.id}">Edit</button>
        <button class="delete-btn" data-id="${item.id}">Delete</button>
      </td>
    `;
    itemsBody.appendChild(tr);
  });
}

// Create a new item
async function createItem() {
  const name = nameInput.value.trim();
  const description = descriptionInput.value.trim();
  if (!name) {
    alert('Name is required');
    return;
  }
  try {
    const res = await fetch(`${apiBase}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create item');
    }
    // Clear inputs
    nameInput.value = '';
    descriptionInput.value = '';
    // Refresh list
    fetchItems();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

// Delete an item by id
async function deleteItem(id) {
  if (!confirm('Are you sure you want to delete this item?')) return;
  try {
    const res = await fetch(`${apiBase}/items/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete item');
    }
    fetchItems();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

// Edit an item by id
async function editItem(id, currentName, currentDescription) {
  const name = prompt('Enter new name', currentName);
  if (name === null) return; // Cancelled
  const description = prompt('Enter new description', currentDescription);
  if (description === null) return; // Cancelled
  try {
    const res = await fetch(`${apiBase}/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update item');
    }
    fetchItems();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

// Event listener for create button
createBtn.addEventListener('click', () => {
  createItem();
});

// Delegate click events for edit and delete buttons
itemsBody.addEventListener('click', (e) => {
  const editBtn = e.target.closest('.edit-btn');
  const deleteBtn = e.target.closest('.delete-btn');
  if (editBtn) {
    const id = editBtn.getAttribute('data-id');
    const row = editBtn.closest('tr');
    const currentName = row.children[1].textContent;
    const currentDesc = row.children[2].textContent;
    editItem(id, currentName, currentDesc);
  } else if (deleteBtn) {
    const id = deleteBtn.getAttribute('data-id');
    deleteItem(id);
  }
});

// Initial fetch
fetchItems();
