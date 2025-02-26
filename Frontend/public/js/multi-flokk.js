// multi-flokk.js - Functionality for handling multiple flokker per reinsdyr

// Load flokker for selection as checkboxes
async function loadUserFlokkerAsCheckboxes(containerId, selectedFlokkIds = [], eierId = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
      // Use either provided eierId or current user's eierId
      const targetEierId = eierId || getUserData()?.eierId;
      if (!targetEierId) {
        container.innerHTML = '<p>Velg eier først for å se flokker</p>';
        return;
      }
      
      const response = await fetch(`/api/flokk?eier=${targetEierId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Kunne ikke laste flokker');
      
      const flokker = await response.json();
      
      if (flokker.length === 0) {
        container.innerHTML = '<p>Ingen flokker funnet for denne eieren</p>';
        return;
      }
      
      // Convert selectedFlokkIds to array if it's not already
      const selectedIds = Array.isArray(selectedFlokkIds) 
        ? selectedFlokkIds.map(id => id.toString()) 
        : [selectedFlokkIds].filter(Boolean).map(id => id.toString());
      
      let html = '';
      flokker.forEach(flokk => {
        const isChecked = selectedIds.includes(flokk._id.toString()) ? 'checked' : '';
        html += `
          <div class="checkbox-item">
            <input type="checkbox" id="flokk_${flokk._id}" name="flokkIds" 
                   value="${flokk._id}" class="flokk-checkbox" ${isChecked}>
            <label for="flokk_${flokk._id}">${flokk.navn}</label>
          </div>
        `;
      });
      
      container.innerHTML = html;
      
      // Add event listeners to handle checkbox changes
      addFlokkCheckboxListeners(container);
      
      // Update hovedFlokkId dropdown
      const form = container.closest('form');
      if (form) {
        const hovedFlokkSelect = form.querySelector('[name="hovedFlokkId"]');
        if (hovedFlokkSelect) {
          updateHovedFlokkDropdown(container, hovedFlokkSelect);
        }
      }
    } catch (error) {
      console.error('Error loading flokker:', error);
      container.innerHTML = '<p>Kunne ikke laste flokker</p>';
    }
  }
  
  // Handle flokk checkbox changes
  function addFlokkCheckboxListeners(container) {
    const form = container.closest('form');
    if (!form) return;
    
    const hovedFlokkSelect = form.querySelector('[name="hovedFlokkId"]');
    if (!hovedFlokkSelect) return;
    
    container.querySelectorAll('.flokk-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        updateHovedFlokkDropdown(container, hovedFlokkSelect);
      });
    });
  }
  
  // Update hovedFlokk dropdown based on selected flokker
  function updateHovedFlokkDropdown(container, hovedFlokkSelect) {
    if (!container || !hovedFlokkSelect) return;
    
    const selectedFlokker = Array.from(container.querySelectorAll('.flokk-checkbox:checked'))
      .map(checkbox => {
        return {
          id: checkbox.value,
          name: checkbox.nextElementSibling.textContent
        };
      });
    
    if (selectedFlokker.length === 0) {
      hovedFlokkSelect.innerHTML = '<option value="">Velg flokker først</option>';
      hovedFlokkSelect.disabled = true;
      return;
    }
    
    // Store the currently selected value if possible
    const currentValue = hovedFlokkSelect.value;
    const currentValueValid = selectedFlokker.some(f => f.id === currentValue);
    
    let html = '<option value="">Velg hovedflokk</option>';
    selectedFlokker.forEach(flokk => {
      const selected = currentValueValid && flokk.id === currentValue ? 'selected' : '';
      html += `<option value="${flokk.id}" ${selected}>${flokk.name}</option>`;
    });
    
    hovedFlokkSelect.innerHTML = html;
    hovedFlokkSelect.disabled = false;
  }
  
  // Setup eier selection to load flokker
  function setupEierFlokkSelection() {
    const eierSelect = document.getElementById('eierId');
    if (!eierSelect) return;
    
    eierSelect.addEventListener('change', function() {
      const selectedEierId = this.value || getUserData()?.eierId;
      loadUserFlokkerAsCheckboxes('flokkCheckboxes', [], selectedEierId);
    });
  }
  
  // Submit handler for reinsdyr form with multiple flokker
  function setupReinsdyrFormSubmit() {
    const form = document.getElementById('reinsdyrForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Get form data
      const serienummer = document.getElementById('serienummer').value;
      const navn = document.getElementById('navn').value;
      const eierId = document.getElementById('eierId')?.value;
      const hovedFlokkId = document.getElementById('hovedFlokkId').value;
      const fodselsdato = document.getElementById('fodselsdato').value;
      
      // Get selected flokker
      const flokkIds = Array.from(document.querySelectorAll('.flokk-checkbox:checked'))
        .map(checkbox => checkbox.value);
      
      // Validate
      if (flokkIds.length === 0) {
        alert('Velg minst én flokk');
        return;
      }
      
      if (!hovedFlokkId) {
        alert('Velg en hovedflokk');
        return;
      }
      
      if (!flokkIds.includes(hovedFlokkId)) {
        alert('Hovedflokken må være valgt som en av flokkene');
        return;
      }
      
      const formData = {
        serienummer,
        navn,
        flokkIds,
        hovedFlokkId,
        fodselsdato
      };
      
      // Add eierId if it's provided and not the current user
      if (eierId && eierId !== getUserData().eierId) {
        formData.eierId = eierId;
      }
      
      const messageContainer = document.getElementById('message');
      
      try {
        const response = await fetch('/api/reinsdyr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
          if (messageContainer) {
            messageContainer.innerHTML = '<p class="alert alert-success">Reinsdyr registrert!</p>';
          }
          
          form.reset();
          document.querySelectorAll('.flokk-checkbox').forEach(checkbox => {
            checkbox.checked = false;
          });
          
          const hovedFlokkSelect = document.getElementById('hovedFlokkId');
          if (hovedFlokkSelect) {
            hovedFlokkSelect.innerHTML = '<option value="">Velg flokker først</option>';
            hovedFlokkSelect.disabled = true;
          }
          
          // Reload reinsdyr list
          loadUserReinsdyr();
        } else {
          if (messageContainer) {
            messageContainer.innerHTML = `<p class="alert alert-danger">${data.message || 'Registrering mislyktes'}</p>`;
          }
        }
      } catch (error) {
        console.error('Error:', error);
        
        if (messageContainer) {
          messageContainer.innerHTML = '<p class="alert alert-danger">Det oppstod en feil under registrering. Vennligst prøv igjen.</p>';
        }
      }
    });
  }
  
  // Display reinsdyr with multiple flokker
  function renderReinsdyrWithMultipleFlokker(reinsdyr) {
    const flokker = reinsdyr.flokker || [];
    const hovedFlokkId = reinsdyr.hovedFlokk && reinsdyr.hovedFlokk._id 
      ? reinsdyr.hovedFlokk._id.toString() 
      : (reinsdyr.hovedFlokk || '').toString();
    
    if (flokker.length === 0) {
      return '<p><strong>Flokk:</strong> Ingen flokk</p>';
    }
    
    // Create flokk tags
    let html = '<p><strong>Flokker:</strong></p><div class="flokk-tags">';
    
    flokker.forEach(flokk => {
      const isHovedFlokk = flokk._id.toString() === hovedFlokkId;
      const flokkName = flokk.navn || 'Ukjent';
      
      html += `<span class="flokk-tag ${isHovedFlokk ? 'hovedflokk' : ''}" 
        title="${isHovedFlokk ? 'Hovedflokk' : 'Tilleggsflokk'}">${flokkName}</span>`;
    });
    
    html += '</div>';
    return html;
  }
  
  // Setup edit form with multiple flokker
  function setupEditFormWithMultipleFlokker(reinsdyrId, form) {
    if (!form) return;
    
    // Get the edit-flokk-checkboxes container
    const flokkCheckboxes = form.querySelector('.edit-flokk-checkboxes');
    if (!flokkCheckboxes) return;
    
    // Get the edit-hovedflokk-select
    const hovedFlokkSelect = form.querySelector('.edit-hovedflokk-select');
    if (!hovedFlokkSelect) return;
    
    // Fetch the reinsdyr data
    fetch(`/api/reinsdyr/${reinsdyrId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    .then(response => response.json())
    .then(reinsdyr => {
      // Get selected flokker
      const selectedFlokkIds = reinsdyr.flokker.map(flokk => flokk._id);
      const hovedFlokkId = reinsdyr.hovedFlokk._id;
      
      // Get the eierSelect
      const eierSelect = form.querySelector('.eier-select');
      if (eierSelect) {
        // Set the value based on the flokk's owner
        const eierId = reinsdyr.flokker[0]?.eier?._id;
        
        // Load all eiere first
        loadAllEiere(eierSelect, eierId).then(() => {
          // Then load the flokker for this eier
          loadUserFlokkerAsCheckboxes(flokkCheckboxes.id, selectedFlokkIds, eierId);
          
          // Set up event listener for eier change
          eierSelect.addEventListener('change', function() {
            const selectedEierId = this.value || getUserData()?.eierId;
            loadUserFlokkerAsCheckboxes(flokkCheckboxes.id, [], selectedEierId);
          });
        });
      } else {
        // Just load the flokker for the current user
        loadUserFlokkerAsCheckboxes(flokkCheckboxes.id, selectedFlokkIds);
      }
      
      // Set form values
      form.querySelector('[name="serienummer"]').value = reinsdyr.serienummer;
      form.querySelector('[name="navn"]').value = reinsdyr.navn;
      form.querySelector('[name="fodselsdato"]').value = new Date(reinsdyr.fodselsdato)
        .toISOString().split('T')[0];
    })
    .catch(error => {
      console.error('Error loading reinsdyr data:', error);
      flokkCheckboxes.innerHTML = '<p>Kunne ikke laste flokker</p>';
    });
  }
  
  // Add or remove a flokk from a reinsdyr
  async function modifyFlokkForReinsdyr(reinsdyrId, flokkId, action) {
    try {
      const endpoint = `/api/reinsdyr/${action}-flokk`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reinsdyrId,
          flokkId
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `Kunne ikke ${action === 'add' ? 'legge til' : 'fjerne'} flokk`);
      }
      
      return true;
    } catch (error) {
      console.error('Error modifying flokker:', error);
      alert(error.message);
      return false;
    }
  }
  
  // Load User Reinsdyr with multiple flokker support
  async function loadUserReinsdyrWithMultiFlokk() {
    const reinsdyrList = document.getElementById('reinsdyrList');
    
    if (!reinsdyrList || !isLoggedIn()) {
      console.log('Reinsdyr list not found or user not logged in');
      return;
    }
    
    try {
      const response = await fetch('/api/reinsdyr/my', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', response.status, errorText);
        
        reinsdyrList.innerHTML = `
          <div class="alert alert-danger">
            <p>Feil ved lasting av reinsdyr:</p>
            <p>Status: ${response.status}</p>
            <p>Melding: ${errorText}</p>
          </div>
        `;
        return;
      }
      
      const data = await response.json();
      
      // Extract reinsdyr from the response
      const reinsdyr = data.reinsdyr || [];
      
      if (reinsdyr.length === 0) {
        reinsdyrList.innerHTML = '<p>Du har ingen registrerte reinsdyr.</p>';
        return;
      }
      
      let html = '';
      
      // Use standard for loop instead of forEach
      for (let i = 0; i < reinsdyr.length; i++) {
        const r = reinsdyr[i];
        html += `
          <div class="card">
            <h3 class="card-title">${r.navn} (${r.serienummer})</h3>
            ${renderReinsdyrWithMultipleFlokker(r)}
            <p><strong>Fødselsdato:</strong> ${new Date(r.fodselsdato).toLocaleDateString('no-NO')}</p>
            <div class="button-group">
              <button class="btn btn-secondary edit-reinsdyr-btn" data-id="${r._id}">Rediger</button>
              <button class="btn btn-primary transfer-reinsdyr-btn" data-id="${r._id}">Overfør til annen eier</button>
              <button class="btn btn-danger delete-reinsdyr-btn" data-id="${r._id}">Slett</button>
            </div>
            <div id="edit-reinsdyr-${r._id}" class="edit-form" style="display: none; margin-top: 15px;">
              <!-- Form content will be dynamically created -->
            </div>
            <div id="transfer-reinsdyr-${r._id}" class="edit-form" style="display: none; margin-top: 15px;">
              <!-- Transfer form content will be dynamically created -->
            </div>
          </div>
        `;
      }
      
      reinsdyrList.innerHTML = html;
      
      // Set up edit and transfer forms
      setupReinsdyrEditForms();
    } catch (error) {
      console.error('Error loading reinsdyr:', error);
      reinsdyrList.innerHTML = `
        <div class="alert alert-danger">
          <p>En kritisk feil oppstod:</p>
          <p>${error.message}</p>
        </div>
      `;
    }
  }
  
  // Set up reinsdyr edit forms using the template
  function setupReinsdyrEditForms() {
    // Get the templates
    const editTemplate = document.getElementById('edit-reinsdyr-template');
    const transferTemplate = document.getElementById('transfer-reinsdyr-template');
    
    if (!editTemplate || !transferTemplate) return;
    
    // Set up edit buttons
    document.querySelectorAll('.edit-reinsdyr-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        const editFormContainer = document.getElementById(`edit-reinsdyr-${id}`);
        
        if (editFormContainer) {
          // Clone the template content
          const formHtml = editTemplate.innerHTML;
          editFormContainer.innerHTML = formHtml;
          
          // Set up the form with an ID for the checkboxes container
          const checkboxesContainer = editFormContainer.querySelector('.edit-flokk-checkboxes');
          checkboxesContainer.id = `edit-flokk-checkboxes-${id}`;
          
          // Setup the form
          const form = editFormContainer.querySelector('form');
          form.setAttribute('data-id', id);
          
          // Populate the form
          setupEditFormWithMultipleFlokker(id, form);
          
          // Show the form
          editFormContainer.style.display = 'block';
          this.style.display = 'none';
          
          // Set up form submission
          form.addEventListener('submit', handleEditFormSubmit);
          
          // Set up cancel button
          const cancelBtn = form.querySelector('.cancel-edit-btn');
          if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
              editFormContainer.style.display = 'none';
              btn.style.display = 'inline-block';
            });
          }
        }
      });
    });
    
    // Set up transfer buttons
    document.querySelectorAll('.transfer-reinsdyr-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        const transferFormContainer = document.getElementById(`transfer-reinsdyr-${id}`);
        
        if (transferFormContainer) {
          // Clone the template content
          const formHtml = transferTemplate.innerHTML;
          transferFormContainer.innerHTML = formHtml;
          
          // Set up the form
          const form = transferFormContainer.querySelector('form');
          form.setAttribute('data-id', id);
          
          // Show the form
          transferFormContainer.style.display = 'block';
          this.style.display = 'none';
          
          // Set up form submission
          form.addEventListener('submit', handleTransferFormSubmit);
          
          // Set up cancel button
          const cancelBtn = form.querySelector('.cancel-transfer-btn');
          if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
              transferFormContainer.style.display = 'none';
              btn.style.display = 'inline-block';
            });
          }
        }
      });
    });
    
    // Set up delete buttons
    document.querySelectorAll('.delete-reinsdyr-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        if (!confirm('Er du sikker på at du vil slette dette reinsdyret?')) {
          return;
        }
        
        const id = this.getAttribute('data-id');
        
        fetch(`/api/reinsdyr/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        .then(response => {
          if (!response.ok) {
            return response.json().then(data => {
              throw new Error(data.message || 'Kunne ikke slette reinsdyr');
            });
          }
          return response.json();
        })
        .then(() => {
          // Reload the reinsdyr list
          loadUserReinsdyrWithMultiFlokk();
        })
        .catch(error => {
          console.error('Error deleting reinsdyr:', error);
          alert(error.message);
        });
      });
    });
  }
  
  // Handle edit form submission
  async function handleEditFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const reinsdyrId = form.getAttribute('data-id');
    
    // Get form data
    const serienummer = form.querySelector('[name="serienummer"]').value;
    const navn = form.querySelector('[name="navn"]').value;
    const fodselsdato = form.querySelector('[name="fodselsdato"]').value;
    
    // Get selected flokker
    const flokkCheckboxes = form.querySelector('.edit-flokk-checkboxes');
    const flokkIds = Array.from(flokkCheckboxes.querySelectorAll('.flokk-checkbox:checked'))
    .map(checkbox => checkbox.value);
  
    if (flokkIds.length === 0) {
      alert('Velg minst én flokk');
      return;
    }
    
    // Get selected hovedFlokk
    const hovedFlokkId = form.querySelector('[name="hovedFlokk"]').value;
    
    if (!hovedFlokkId || !flokkIds.includes(hovedFlokkId)) {
      // If no hovedFlokk is selected or it's not in the selected flokker,
      // use the first selected flokk as hovedFlokk
      const hovedFlokkId = flokkIds[0];
    }
    
    // Create formData object
    const formData = {
      serienummer,
      navn,
      flokkIds,
      hovedFlokkId,
      fodselsdato
    };
    
    try {
      const response = await fetch(`/api/reinsdyr/${reinsdyrId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Kunne ikke oppdatere reinsdyr');
      }
      
      // Hide the form and show the edit button
      const editForm = document.getElementById(`edit-reinsdyr-${reinsdyrId}`);
      editForm.style.display = 'none';
      const editBtn = editForm.closest('.card').querySelector('.edit-reinsdyr-btn');
      if (editBtn) editBtn.style.display = 'inline-block';
      
      // Reload the reinsdyr list
      loadUserReinsdyrWithMultiFlokk();
    } catch (error) {
      console.error('Error updating reinsdyr:', error);
      alert(error.message);
    }
  }
  
  // Handle transfer form submission
  async function handleTransferFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const reinsdyrId = form.getAttribute('data-id');
    
    // Get form data
    const toEierEmail = form.querySelector('[name="toEierEmail"]').value;
    const offerText = form.querySelector('[name="offerText"]').value;
    
    try {
      const response = await fetch('/api/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reinsdyrId,
          toEierEmail,
          offerText
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Kunne ikke opprette transaksjon');
      }
      
      // Hide the form and show the transfer button
      const transferForm = document.getElementById(`transfer-reinsdyr-${reinsdyrId}`);
      transferForm.style.display = 'none';
      const transferBtn = transferForm.closest('.card').querySelector('.transfer-reinsdyr-btn');
      if (transferBtn) transferBtn.style.display = 'inline-block';
      
      // Show success message
      alert('Transaksjon opprettet! Du blir nå omdirigert til transaksjoner.');
      
      // Redirect to transactions page
      window.location.href = '/transactions';
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert(error.message);
    }
  }
  
  // Initialize when the DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize multi-flokk functionality
    setupEierFlokkSelection();
    setupReinsdyrFormSubmit();
    
    // Load user's reinsdyr with multi-flokk support instead of the regular function
    const originalLoadUserReinsdyr = window.loadUserReinsdyr;
    window.loadUserReinsdyr = loadUserReinsdyrWithMultiFlokk;
    
    // If reinsdyr list exists, load it now
    if (document.getElementById('reinsdyrList')) {
      loadUserReinsdyrWithMultiFlokk();
    }
  });