// Load beiteområde into a select element
async function loadBeiteomradeSelect(selectElement, flokkId = null) {
  if (!selectElement) {
    return;
  }
  
  try {
    // First get the flokk's current beiteområde if flokkId is provided
    let currentBeiteomradeId = '';
    
    if (flokkId) {
      const flokkResponse = await fetch(`/api/flokk/${flokkId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (flokkResponse.ok) {
        const flokkData = await flokkResponse.json();
        if (flokkData.beiteomrade) {
          currentBeiteomradeId = flokkData.beiteomrade._id;
        }
      }
    }
    
    // Get all beiteområder
    const beiteomradeResponse = await fetch('/api/beiteomrade');
    
    if (!beiteomradeResponse.ok) {
      throw new Error('Kunne ikke laste beiteområder');
    }
    
    const beiteomradeData = await beiteomradeResponse.json();
    
    if (beiteomradeData.length === 0) {
      selectElement.innerHTML = '<option value="">Ingen beiteområder registrert</option>';
      return;
    }
    
    let html = '<option value="">Velg beiteområde</option>';
    
    beiteomradeData.forEach(beiteomrade => {
      html += `<option value="${beiteomrade._id}" ${beiteomrade._id === currentBeiteomradeId ? 'selected' : ''}>${beiteomrade.navn}</option>`;
    });
    
    selectElement.innerHTML = html;
  } catch (error) {
    console.error('Error:', error);
    selectElement.innerHTML = '<option value="">Kunne ikke laste beiteområder</option>';
  }
}

// Load user flokk into a select element
async function loadUserFlokkSelect(selectElement, reinsdyrId = null) {
  if (!selectElement || !isLoggedIn()) {
    return;
  }
  
  try {
    // First get the reinsdyr's current flokk if reinsdyrId is provided
    let currentFlokkId = '';
    
    if (reinsdyrId) {
      const reinsdyrResponse = await fetch(`/api/reinsdyr/${reinsdyrId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (reinsdyrResponse.ok) {
        const reinsdyrData = await reinsdyrResponse.json();
        if (reinsdyrData.flokk) {
          currentFlokkId = reinsdyrData.flokk._id;
        }
      }
    }
    
    // Get all user's flokker
    const flokkResponse = await fetch('/api/flokk/my', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!flokkResponse.ok) {
      throw new Error('Kunne ikke laste flokker');
    }
    
    const flokkData = await flokkResponse.json();
    
    if (flokkData.length === 0) {
      selectElement.innerHTML = '<option value="">Ingen flokker registrert</option>';
      return;
    }
    
    let html = '<option value="">Velg flokk</option>';
    
    flokkData.forEach(flokk => {
      html += `<option value="${flokk._id}" ${flokk._id === currentFlokkId ? 'selected' : ''}>${flokk.navn}</option>`;
    });
    
    selectElement.innerHTML = html;
  } catch (error) {
    console.error('Error:', error);
    selectElement.innerHTML = '<option value="">Kunne ikke laste flokker</option>';
  }
}

// Function to load all eiere into a select element
async function loadAllEiere(selectElement, selectedEierId = null) {
  if (!selectElement) {
    return;
  }
  
  try {
    // Get all eiere (requires admin rights or special permission)
    const response = await fetch('/api/eier/search?q=', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Kunne ikke laste eiere');
    }
    
    const eiere = await response.json();
    
    if (eiere.length === 0) {
      selectElement.innerHTML = '<option value="">Ingen eiere funnet</option>';
      return;
    }
    
    // Current user's eier ID
    const userData = getUserData();
    const currentEierId = userData ? userData.eierId : null;
    
    let html = `<option value="${currentEierId}" selected>Min (Standard)</option>`;
    
    eiere.forEach(eier => {
      // Skip the current user's eier since it's already added as default
      if (eier._id !== currentEierId) {
        html += `<option value="${eier._id}" ${eier._id === selectedEierId ? 'selected' : ''}>${eier.navn} (${eier.epost})</option>`;
      }
    });
    
    selectElement.innerHTML = html;
  } catch (error) {
    console.error('Error loading eiere:', error);
    selectElement.innerHTML = '<option value="">Kunne ikke laste eiere</option>';
  }
}

// Function to load flokker for a specific eier
async function loadFlokksByEier(selectElement, eierId, selectedFlokkId = null) {
  if (!selectElement || !eierId) {
    return;
  }
  
  try {
    const response = await fetch(`/api/flokk?eier=${eierId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Kunne ikke laste flokker');
    }
    
    const flokker = await response.json();
    
    if (flokker.length === 0) {
      selectElement.innerHTML = '<option value="">Ingen flokker funnet for denne eieren</option>';
      return;
    }
    
    let html = '<option value="">Velg flokk</option>';
    
    flokker.forEach(flokk => {
      html += `<option value="${flokk._id}" ${flokk._id === selectedFlokkId ? 'selected' : ''}>${flokk.navn}</option>`;
    });
    
    selectElement.innerHTML = html;
  } catch (error) {
    console.error('Error loading flokker:', error);
    selectElement.innerHTML = '<option value="">Kunne ikke laste flokker</option>';
  }
}

// Setup eier change event listener
function setupEierChangeListener(eierSelect, flokkSelect) {
  if (!eierSelect || !flokkSelect) {
    return;
  }
  
  eierSelect.addEventListener('change', function() {
    const selectedEierId = this.value;
    if (selectedEierId) {
      loadFlokksByEier(flokkSelect, selectedEierId);
    } else {
      flokkSelect.innerHTML = '<option value="">Velg eier først</option>';
    }
  });
}

// Load user's reinsdyr list
async function loadUserReinsdyr() {
  const reinsdyrList = document.getElementById('reinsdyrList');
  
  if (!reinsdyrList || !isLoggedIn()) {
    console.log('Reinsdyr list not found or user not logged in');
    return;
  }
  
  // Add debug logging
  console.log('Token:', localStorage.getItem('token'));
  
  try {
    const response = await fetch('/api/reinsdyr/my', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', response.status, errorText);
      
      // More detailed error display
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
    
    console.log('Raw data:', data);

    // Extract reinsdyr from the response
    const reinsdyr = data.reinsdyr || [];
    
    console.log('Processed reinsdyr:', reinsdyr);
    
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
          <p><strong>Flokk:</strong> ${r.flokk ? r.flokk.navn : 'Ukjent'}</p>
          <p><strong>Fødselsdato:</strong> ${new Date(r.fodselsdato).toLocaleDateString('no-NO')}</p>
          <div class="button-group">
            <button class="btn btn-secondary edit-reinsdyr-btn" data-id="${r._id}">Rediger</button>
            <button class="btn btn-primary transfer-reinsdyr-btn" data-id="${r._id}">Overfør til annen eier</button>
            <button class="btn btn-danger delete-reinsdyr-btn" data-id="${r._id}">Slett</button>
          </div>
          <div id="edit-reinsdyr-${r._id}" class="edit-form" style="display: none; margin-top: 15px;">
            <form class="update-reinsdyr-form" data-id="${r._id}">
              <div class="form-group">
                <label class="form-label">Serienummer</label>
                <input type="text" name="serienummer" class="form-input" value="${r.serienummer}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Navn</label>
                <input type="text" name="navn" class="form-input" value="${r.navn}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Eier</label>
                <select name="eierId" class="form-select eier-select">
                  <option value="">Laster eiere...</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Flokk</label>
                <select name="flokkId" class="form-select user-flokk-select" required>
                  <option value="">Laster flokker...</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Fødselsdato</label>
                <input type="date" name="fodselsdato" class="form-input" value="${r.fodselsdato.split('T')[0]}" required>
              </div>
              <div class="form-group">
                <button type="submit" class="btn btn-primary">Oppdater</button>
                <button type="button" class="btn btn-secondary cancel-edit-btn">Avbryt</button>
              </div>
            </form>
          </div>
          <div id="transfer-reinsdyr-${r._id}" class="edit-form" style="display: none; margin-top: 15px;">
            <form class="transfer-to-owner-form" data-id="${r._id}">
              <div class="form-group">
                <label class="form-label">Handelstilbud</label>
                <textarea name="offerText" class="form-input" rows="3" required 
                  placeholder="Skriv ditt handelstilbud her..."></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Overfør til eier (e-post)</label>
                <input type="email" name="toEierEmail" class="form-input" required>
              </div>
              <div class="form-group">
                <button type="submit" class="btn btn-primary">Start overføring</button>
                <button type="button" class="btn btn-secondary cancel-transfer-btn">Avbryt</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }
    
    reinsdyrList.innerHTML = html;
    
    // Add error catching to button setup
    try {
      setupReinsdyrButtons();
    } catch (buttonError) {
      console.error('Error setting up reinsdyr buttons:', buttonError);
    }
  } catch (error) {
    console.error('Completely unexpected error:', error);
    reinsdyrList.innerHTML = `
      <div class="alert alert-danger">
        <p>En kritisk feil oppstod:</p>
        <p>${error.message}</p>
        <pre>${error.stack}</pre>
      </div>
    `;
  }
}

function setupReinsdyrButtons() {
  // Edit button setup
  document.querySelectorAll('.edit-reinsdyr-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      const editForm = document.getElementById(`edit-reinsdyr-${id}`);
      
      if (editForm) {
        editForm.style.display = 'block';
        this.style.display = 'none';
        
        // Load eiere into select
        const eierSelect = editForm.querySelector('.eier-select');
        if (eierSelect) {
          loadAllEiere(eierSelect);
          
          // When eier changes, load their flokker
          const flokkSelect = editForm.querySelector('.user-flokk-select');
          if (flokkSelect) {
            setupEierChangeListener(eierSelect, flokkSelect);
            
            // Initially load the current user's flokker
            loadFlokksByEier(flokkSelect, getUserData().eierId);
          }
        }
      }
    });
  });
  
  // Transfer button setup
  document.querySelectorAll('.transfer-reinsdyr-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      const transferForm = document.getElementById(`transfer-reinsdyr-${id}`);
      
      if (transferForm) {
        transferForm.style.display = 'block';
        this.style.display = 'none';
      }
    });
  });
  
  // Setup cancel buttons
  document.querySelectorAll('.cancel-edit-btn, .cancel-transfer-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const form = this.closest('.edit-form');
      form.style.display = 'none';
      
      // Find the edit button or transfer button in the previous element and show it
      const parentCard = form.closest('.card');
      if (form.id.includes('edit-reinsdyr')) {
        const editBtn = parentCard.querySelector('.edit-reinsdyr-btn');
        if (editBtn) editBtn.style.display = 'inline-block';
      } else if (form.id.includes('transfer-reinsdyr')) {
        const transferBtn = parentCard.querySelector('.transfer-reinsdyr-btn');
        if (transferBtn) transferBtn.style.display = 'inline-block';
      }
    });
  });
  
  // Delete button setup
  document.querySelectorAll('.delete-reinsdyr-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!confirm('Er du sikker på at du vil slette dette reinsdyret?')) {
        return;
      }
      
      const id = this.getAttribute('data-id');
      
      try {
        const response = await fetch(`/api/reinsdyr/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Kunne ikke slette reinsdyr: ${errorText}`);
        }
        
        // Reload reinsdyr list
        loadUserReinsdyr();
        
      } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Det oppstod en feil under sletting av reinsdyr');
      }
    });
  });
  
  // Setup update reinsdyr forms
  document.querySelectorAll('.update-reinsdyr-form').forEach(form => {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const id = this.getAttribute('data-id');
      const serienummer = this.querySelector('input[name="serienummer"]').value;
      const navn = this.querySelector('input[name="navn"]').value;
      const eierId = this.querySelector('select[name="eierId"]').value;
      const flokkId = this.querySelector('select[name="flokkId"]').value;
      const fodselsdato = this.querySelector('input[name="fodselsdato"]').value;
      
      const formData = {
        serienummer,
        navn,
        flokkId,
        fodselsdato
      };
      
      // Only include eierId if it's selected and different from default
      if (eierId && eierId !== getUserData().eierId) {
        formData.eierId = eierId;
      }
      
      try {
        const response = await fetch(`/api/reinsdyr/${id}`, {
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
        
        alert('Reinsdyr oppdatert!');
        
        // Hide form and show edit button
        const editForm = document.getElementById(`edit-reinsdyr-${id}`);
        if (editForm) {
          editForm.style.display = 'none';
          const editBtn = editForm.closest('.card').querySelector('.edit-reinsdyr-btn');
          if (editBtn) editBtn.style.display = 'inline-block';
        }
        
        // Reload list
        loadUserReinsdyr();
      } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Det oppstod en feil under oppdatering av reinsdyr');
      }
    });
  });
  
  // Setup transfer to owner forms
  document.querySelectorAll('.transfer-to-owner-form').forEach(form => {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const id = this.getAttribute('data-id');
      const toEierEmail = this.querySelector('input[name="toEierEmail"]').value;
      const offerText = this.querySelector('textarea[name="offerText"]').value;
      
      try {
        const response = await fetch('/api/transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            reinsdyrId: id,
            toEierEmail,
            offerText
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          alert(data.message || 'Handelstilbud er sendt!');
          
          // Reset form and hide it
          form.reset();
          const transferForm = document.getElementById(`transfer-reinsdyr-${id}`);
          if (transferForm) {
            transferForm.style.display = 'none';
            const transferBtn = transferForm.closest('.card').querySelector('.transfer-reinsdyr-btn');
            if (transferBtn) transferBtn.style.display = 'inline-block';
          }
          
          // Redirect to transactions page
          window.location.href = '/transactions';
        } else {
          throw new Error(data.message || 'Kunne ikke opprette handelstilbud');
        }
      } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Det oppstod en feil ved opprettelse av handelstilbud');
      }
    });
  });
}

async function loadUserFlokker() {
  const flokkSelect = document.getElementById('flokkId');
  const flokkList = document.getElementById('flokkList');
  
  if (!isLoggedIn()) {
    return;
  }
  
  try {
    const response = await fetch('/api/flokk/my', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Kunne ikke laste flokker');
    }
    
    const data = await response.json();
    
    // Update the dropdown select for flokk registration
    if (flokkSelect) {
      if (data.length === 0) {
        flokkSelect.innerHTML = '<option value="">Ingen flokker registrert</option>';
      } else {
        let html = '<option value="">Velg flokk</option>';
        
        data.forEach(flokk => {
          html += `<option value="${flokk._id}">${flokk.navn}</option>`;
        });
        
        flokkSelect.innerHTML = html;
      }
    }
    
    // Update the flokk list display
    if (flokkList) {
      if (data.length === 0) {
        flokkList.innerHTML = '<p>Du har ingen registrerte flokker.</p>';
      } else {
        let html = '';
        
        data.forEach(flokk => {
          html += `
            <div class="card">
              <h3 class="card-title">${flokk.navn}</h3>
              <p><strong>Serieinndeling:</strong> ${flokk.serieinndeling}</p>
              <p><strong>Buemerke:</strong> ${flokk.buemerke_navn}</p>
              <p><strong>Beiteområde:</strong> ${flokk.beiteomrade ? flokk.beiteomrade.navn : 'Ukjent'}</p>
              ${flokk.buemerke_bilde && flokk.buemerke_bilde !== 'default_buemerke.png' ? 
                `<p><strong>Buemerke bilde:</strong><br>
                 <img src="/${flokk.buemerke_bilde}" alt="Buemerke" style="max-width: 150px; max-height: 150px; margin-top: 10px;">
                 </p>` : ''}
              <div class="button-group">
                <a href="/flokk/${flokk._id}/reinsdyr" class="btn btn-primary">Vis reinsdyr</a>
                <button class="btn btn-secondary edit-flokk-btn" data-id="${flokk._id}" 
                        data-flokk='${JSON.stringify(flokk).replace(/'/g, "&apos;")}'>Rediger</button>
                <button class="btn btn-danger delete-flokk-btn" data-id="${flokk._id}">Slett</button>
              </div>
              <div id="edit-flokk-${flokk._id}" class="edit-form" style="display: none; margin-top: 15px;">
                <form class="update-flokk-form" data-id="${flokk._id}" enctype="multipart/form-data">
                  <div class="form-group">
                    <label class="form-label">Navn</label>
                    <input type="text" name="navn" class="form-input" value="${flokk.navn}" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Serieinndeling</label>
                    <input type="text" name="serieinndeling" class="form-input" value="${flokk.serieinndeling}" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Buemerke (navn)</label>
                    <input type="text" name="buemerke_navn" class="form-input" value="${flokk.buemerke_navn}" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Buemerke (bilde)</label>
                    <input type="file" name="buemerke_bilde" class="form-input" accept="image/*">
                    <small>Velg et nytt bilde for buemerket (valgfritt)</small>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Nåværende bilde</label>
                    <div class="current-image">
                      <img src="/${flokk.buemerke_bilde}" alt="Buemerke" style="max-width: 100px; max-height: 100px;">
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Beiteområde</label>
                    <select name="beiteomradeId" class="form-select beiteomrade-select" required>
                      <option value="">Laster beiteområder...</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <button type="submit" class="btn btn-primary">Oppdater</button>
                    <button type="button" class="btn btn-secondary cancel-edit-btn">Avbryt</button>
                  </div>
                </form>
              </div>
            </div>
          `;
        });
        
        flokkList.innerHTML = html;
        
        // Setup edit buttons
        document.querySelectorAll('.edit-flokk-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            document.getElementById(`edit-flokk-${id}`).style.display = 'block';
            this.style.display = 'none';
            
            // Load beiteområder into select
            const select = document.querySelector(`#edit-flokk-${id} .beiteomrade-select`);
            loadBeiteomradeSelect(select, id);
          });
        });
        
        // Setup cancel buttons
        document.querySelectorAll('.cancel-edit-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const form = this.closest('.edit-form');
            form.style.display = 'none';
            form.previousElementSibling.querySelector('.edit-flokk-btn').style.display = 'inline-block';
          });
        });
        
        // Setup update forms
        document.querySelectorAll('.update-flokk-form').forEach(form => {
          form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const id = this.getAttribute('data-id');
            
            // Create FormData object for file upload
            const formData = new FormData(this);
            
            try {
              const response = await fetch(`/api/flokk/${id}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
              });
              
              if (!response.ok) {
                throw new Error('Kunne ikke oppdatere flokk');
              }
              
              // Reload flokk list
              loadUserFlokker();
              
              // Hide form
              document.getElementById(`edit-flokk-${id}`).style.display = 'none';
              alert('Flokk oppdatert!');
              
            } catch (error) {
              console.error('Error:', error);
              alert('Det oppstod en feil under oppdatering av flokk');
            }
          });
        });
        
        // Setup delete buttons
        document.querySelectorAll('.delete-flokk-btn').forEach(btn => {
          btn.addEventListener('click', async function() {
            if (!confirm('Er du sikker på at du vil slette denne flokken? Alle reinsdyr i flokken må først flyttes eller slettes.')) {
              return;
            }
            
            const id = this.getAttribute('data-id');
            
            try {
              const response = await fetch(`/api/flokk/${id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              });
              
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Kunne ikke slette flokk');
              }
              
              // Reload flokk list
              loadUserFlokker();
              
            } catch (error) {
              console.error('Error:', error);
              alert(error.message || 'Det oppstod en feil under sletting av flokk');
            }
          });
        });
      }
    }
  } catch (error) {
    console.error('Error:', error);
    if (flokkSelect) {
      flokkSelect.innerHTML = '<option value="">Kunne ikke laste flokker</option>';
    }
    if (flokkList) {
      flokkList.innerHTML = '<p class="alert alert-danger">Det oppstod en feil under lasting av flokker. Vennligst prøv igjen.</p>';
    }
  }
}

// Load beiteområder
async function loadBeiteomrader() {
  const beiteomradeSelect = document.getElementById('beiteomradeId');
  
  if (!beiteomradeSelect) {
    return;
  }
  
  try {
    const response = await fetch('/api/beiteomrade');
    
    if (!response.ok) {
      throw new Error('Kunne ikke laste beiteområder');
    }
    
    const data = await response.json();
    
    if (data.length === 0) {
      beiteomradeSelect.innerHTML = '<option value="">Ingen beiteområder registrert</option>';
      return;
    }
    
    let html = '<option value="">Velg beiteområde</option>';
    
    data.forEach(beiteomrade => {
      html += `<option value="${beiteomrade._id}">${beiteomrade.navn}</option>`;
    });
    
    beiteomradeSelect.innerHTML = html;
  } catch (error) {
    console.error('Error:', error);
    beiteomradeSelect.innerHTML = '<option value="">Kunne ikke laste beiteområder</option>';
  }
}

// Setup form submissions
function setupForms() {
  // Login form
  const loginForm = document.getElementById('loginForm');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const messageContainer = document.getElementById('message');
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('userData', JSON.stringify(data.user));
          
          if (messageContainer) {
            messageContainer.innerHTML = '<p class="alert alert-success">Innlogging vellykket! Omdirigerer...</p>';
          }
          
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
        } else {
          if (messageContainer) {
            messageContainer.innerHTML = `<p class="alert alert-danger">${data.message || 'Innlogging mislyktes'}</p>`;
          }
        }
      } catch (error) {
        console.error('Error:', error);
        
        if (messageContainer) {
          messageContainer.innerHTML = '<p class="alert alert-danger">Det oppstod en feil under innlogging. Vennligst prøv igjen.</p>';
        }
      }
    });
  }
  
  // Registration form
  const registerForm = document.getElementById('registerForm');
  
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const navn = document.getElementById('navn').value;
      const epost = document.getElementById('epost').value;
      const telefonnummer = document.getElementById('telefonnummer').value;
      const kontaktsprak = document.getElementById('kontaktsprak').value;
      const messageContainer = document.getElementById('message');
      
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username,
            password,
            navn,
            epost,
            telefonnummer,
            kontaktsprak
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          if (messageContainer) {
            messageContainer.innerHTML = '<p class="alert alert-success">Registrering vellykket! Omdirigerer til innlogging...</p>';
          }
          
          setTimeout(() => {
            window.location.href = '/login';
          }, 1000);
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
  
  // New Flokk form
  const flokkForm = document.getElementById('flokkForm');
  
  if (flokkForm) {
    flokkForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Use FormData for file uploads
      const formData = new FormData(flokkForm);
      const messageContainer = document.getElementById('message');
      
      try {
        const response = await fetch('/api/flokk', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
          if (messageContainer) {
            messageContainer.innerHTML = '<p class="alert alert-success">Flokk registrert!</p>';
          }
          
          flokkForm.reset();
          
          // Reload flokker
          loadUserFlokker();
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
  
  // New Reinsdyr form
  const reinsdyrForm = document.getElementById('reinsdyrForm');
  
  if (reinsdyrForm) {
    reinsdyrForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const serienummer = document.getElementById('serienummer').value;
      const navn = document.getElementById('navn').value;
      const eierId = document.getElementById('eierId')?.value;
      const flokkId = document.getElementById('flokkId').value;
      const fodselsdato = document.getElementById('fodselsdato').value;
      const messageContainer = document.getElementById('message');
      
      const formData = {
        serienummer,
        navn,
        flokkId,
        fodselsdato
      };

      // Add eierId if it's provided and not the current user
      if (eierId && eierId !== getUserData().eierId) {
        formData.eierId = eierId;
      }
      
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
          
          reinsdyrForm.reset();
          
          // Reload reinsdyr
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
}

// Check if user is logged in
function isLoggedIn() {
  return localStorage.getItem('token') !== null;
}

// Get user data
function getUserData() {
  const userData = localStorage.getItem('userData');
  return userData ? JSON.parse(userData) : null;
}

// Update navigation based on auth status
function updateNavigation() {
  const authLinks = document.getElementById('authLinks');
  const userLinks = document.getElementById('userLinks');
  
  if (authLinks && userLinks) {
    if (isLoggedIn()) {
      authLinks.style.display = 'none';
      userLinks.style.display = 'flex';
      
      // Get username
      const userData = getUserData();
      const usernameElement = document.getElementById('username');
      if (usernameElement && userData) {
        usernameElement.textContent = userData.username;
      }
    } else {
      authLinks.style.display = 'flex';
      userLinks.style.display = 'none';
    }
  }
}

// Handle logout
function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userData');
  window.location.href = '/';
}

// Toggle accordion items
function setupAccordion() {
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  
  if (accordionHeaders) {
    accordionHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const content = header.nextElementSibling;
        content.classList.toggle('show');
        
        // Update icon
        const icon = header.querySelector('.accordion-icon');
        if (icon) {
          if (content.classList.contains('show')) {
            icon.textContent = '-';
          } else {
            icon.textContent = '+';
          }
        }
      });
    });
  }
}

// Setup search functionality
function setupSearch() {
  const searchForm = document.getElementById('searchForm');
  const resultsContainer = document.getElementById('resultsContainer');
  
  if (searchForm && resultsContainer) {
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const searchInput = document.getElementById('searchInput');
      const searchTerm = searchInput.value.trim();
      
      if (!searchTerm) {
        return;
      }
      
      try {
        const response = await fetch(`/api/reinsdyr/search?q=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();
        
        displayResults(data);
      } catch (error) {
        console.error('Error:', error);
        resultsContainer.innerHTML = '<p class="alert alert-danger">Det oppstod en feil under søket. Vennligst prøv igjen.</p>';
      }
    });
  }
}

// Display search results
function displayResults(data) {
  const resultsContainer = document.getElementById('resultsContainer');
  
  if (!resultsContainer) {
    return;
  }
  
  if (data.length === 0) {
    resultsContainer.innerHTML = '<p>Ingen resultater funnet.</p>';
    return;
  }
  
  let html = '<h2>Søkeresultater:</h2>';
  
  data.forEach(reinsdyr => {
    const eier = reinsdyr.flokk && reinsdyr.flokk.eier ? reinsdyr.flokk.eier : null;
    const currentUser = getUserData();
    
    html += `
      <div class="result-item">
        <h3 class="result-title">${reinsdyr.navn} (${reinsdyr.serienummer})</h3>
        <p class="result-info"><strong>Flokk:</strong> ${reinsdyr.flokk ? reinsdyr.flokk.navn : 'Ukjent'}</p>
        <p class="result-info"><strong>Eier:</strong> ${eier ? `<a href="/eiere/${eier._id}">${eier.navn}</a>` : 'Ukjent'}</p>
        ${eier ? `<p class="result-info"><strong>Eier kontakt:</strong> ${eier.epost}, ${eier.telefonnummer}</p>` : ''}
        <p class="result-info"><strong>Fødselsdato:</strong> ${new Date(reinsdyr.fodselsdato).toLocaleDateString('no-NO')}</p>
        
        ${// Only show trade button if there's a different owner
          isLoggedIn() && eier && currentUser && eier._id !== currentUser.eierId ? `
          <div class="result-actions">
            <button class="btn btn-primary trade-reinsdyr-btn" 
                    data-id="${reinsdyr._id}" 
                    data-eier-email="${eier.epost}">
              Start handel
            </button>
          </div>` : ''
        }
      </div>
    `;
  });
  
  resultsContainer.innerHTML = html;
  
  // Add event listeners for trade buttons
  document.querySelectorAll('.trade-reinsdyr-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const reinsdyrId = this.getAttribute('data-id');
      const toEierEmail = this.getAttribute('data-eier-email');
      
      // Create a prompt for offer text
      const offerText = prompt('Skriv inn ditt handelstilbud:');
      
      if (offerText && offerText.trim()) {
        fetch('/api/transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            reinsdyrId,
            toEierEmail,
            offerText: offerText.trim()
          })
        })
        .then(response => response.json())
        .then(data => {
          if (data.message) {
            alert('Handelstilbud sendt!');
            window.location.href = '/transactions';
          } else {
            alert('Kunne ikke sende handelstilbud');
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('Det oppstod en feil ved handel');
        });
      } else {
        alert('Vennligst skriv et handelstilbud');
      }
    });
  });
}

// Toggle collapsible sections
function toggleCollapsible(element) {
  const content = element.nextElementSibling;
  const toggleIcon = element.querySelector('.toggle-icon');
  
  // Toggle display
  if (content.style.display === 'block') {
    // If it's currently displayed, hide it
    content.style.display = 'none';
    if (toggleIcon) toggleIcon.textContent = '+';
  } else {
    // If it's currently hidden, show it
    content.style.display = 'block';
    if (toggleIcon) toggleIcon.textContent = '-';
  }
  
  // Log for debugging
  console.log('Toggled element:', content);
  console.log('Current display style:', content.style.display);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  updateNavigation();
  setupAccordion();
  setupSearch();
  setupForms();
  
  // Load data
  const beiteomradeSelect = document.getElementById('beiteomradeId');
  if (beiteomradeSelect) {
    loadBeiteomrader();
  }
  
  // Load eiere for selection in forms
  const eierSelect = document.getElementById('eierId');
  if (eierSelect) {
    loadAllEiere(eierSelect);
    
    // Set up flokk loading when eier changes
    const flokkSelect = document.getElementById('flokkId');
    if (flokkSelect) {
      setupEierChangeListener(eierSelect, flokkSelect);
      
      // Load user's flokker by default
      if (getUserData() && getUserData().eierId) {
        loadFlokksByEier(flokkSelect, getUserData().eierId);
      }
    }
  }
  
  loadUserReinsdyr();
  loadUserFlokker();
  
  // Setup logout button
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
});