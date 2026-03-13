document.addEventListener('DOMContentLoaded', () => {

    // ------------------------------------------------------------
    // ELEMENT REFERENCES
    // ------------------------------------------------------------

    const brewGrid = document.getElementById('brewGrid');
    const newBrewBtn = document.getElementById('newBrewBtn');

    const modalBackdrop = document.getElementById('modalBackdrop');
    const brewModal = document.getElementById('brewModal');

    const modalPhoto = document.getElementById('modalPhoto');
    const changePhotoBtn = document.getElementById('changePhotoBtn');
    const photoInput = document.getElementById('photoInput');

    const modalTitle = document.getElementById('modalTitle');
    const closeModalBtn = document.getElementById('closeModal');

    const titleInput = document.getElementById('titleInput');
    const skuInput = document.getElementById('skuInput');
    const vesselSelect = document.getElementById('vesselSelect');

    const ingredientList = document.getElementById('ingredientList');
    const addIngredientBtn = document.getElementById('addIngredient');

    const dateStartedInput = document.getElementById('dateStarted');
    const ogInput = document.getElementById('ogInput');
    const notesStartInput = document.getElementById('notesStart');

    const rackingList = document.getElementById('rackingList');
    const addRackingStageBtn = document.getElementById('addRackingStage');

    const bottlingDateInput = document.getElementById('bottlingDate');
    const fgInput = document.getElementById('fgInput');
    const notesFinalInput = document.getElementById('notesFinal');

    const saveBrewBtn = document.getElementById('saveBrew');
    const duplicateBrewBtn = document.getElementById('duplicateBrew');
    const openScaleBtn = document.getElementById('openScale');

    const deleteModal = document.getElementById('deleteModal');
    const deleteMessage = document.getElementById('deleteMessage');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    const confirmDeleteBtn = document.getElementById('confirmDelete');

    const scaleModal = document.getElementById('scaleModal');

    // ------------------------------------------------------------
    // STATE
    // ------------------------------------------------------------

    let brews = [];
    let currentBrewId = null;
    let pendingDeleteId = null;

    // ------------------------------------------------------------
    // UTILITIES
    // ------------------------------------------------------------

    function generateId() {
        return 'brew_' + Math.random().toString(36).slice(2, 10);
    }

    function findBrew(id) {
        return brews.find(b => b.id === id) || null;
    }

    function cloneBrew(brew) {
        return JSON.parse(JSON.stringify(brew));
    }

    function formatDateShort(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function computeABV(og, fg) {
        const ogNum = parseFloat(og);
        const fgNum = parseFloat(fg);
        if (!ogNum || !fgNum) return '';
        const abv = (ogNum - fgNum) * 131.25;
        if (!Number.isFinite(abv)) return '';
        return abv.toFixed(1) + '%';
    }

    function parseQuantity(str) {
        if (!str) return null;
        const trimmed = String(str).trim();
        if (!trimmed) return null;

        const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
        if (mixedMatch) {
            const whole = parseFloat(mixedMatch[1]);
            const num = parseFloat(mixedMatch[2]);
            const den = parseFloat(mixedMatch[3]);
            if (!den) return null;
            return whole + num / den;
        }

        const fracMatch = trimmed.match(/^(\d+)\/(\d+)$/);
        if (fracMatch) {
            const num = parseFloat(fracMatch[1]);
            const den = parseFloat(fracMatch[2]);
            if (!den) return null;
            return num / den;
        }

        const num = parseFloat(trimmed);
        if (Number.isNaN(num)) return null;
        return num;
    }

    function formatQuantity(num) {
        if (num == null || !Number.isFinite(num)) return '';
        if (Math.abs(num - Math.round(num)) < 1e-6) {
            return String(Math.round(num));
        }
        return num.toFixed(2).replace(/\.00$/, '');
    }

    function scaleIngredientsForBrew(brew, factor) {
        if (!brew || !Array.isArray(brew.ingredients)) return;
        brew.ingredients.forEach(ing => {
            if (!ing.quantity) return;
            const parsed = parseQuantity(ing.quantity);
            if (parsed == null) return;
            const scaled = parsed * factor;
            ing.quantity = formatQuantity(scaled);
        });
    }

    // ------------------------------------------------------------
    // IMAGE SAFETY (NO BROKEN ICONS)
    // ------------------------------------------------------------

    function safeSetImage(imgEl, dataUrl) {
        if (!dataUrl) {
            imgEl.removeAttribute('src');
            return;
        }
        imgEl.src = dataUrl;
    }

    function resetFileInput(inputEl) {
        inputEl.value = '';
    }

    // ------------------------------------------------------------
    // GRID RENDERING
    // ------------------------------------------------------------

    function renderGrid() {
        brewGrid.innerHTML = '';

        if (!brews.length) {
            const empty = document.createElement('div');
            empty.textContent = 'No brews yet. Tap + to start a new one.';
            empty.style.color = 'var(--muted)';
            empty.style.fontSize = '13px';
            brewGrid.appendChild(empty);
            return;
        }

        brews.forEach(brew => {
            const card = document.createElement('div');
            card.className = 'brew-card';
            card.dataset.id = brew.id;

            const img = document.createElement('img');
            img.className = 'brew-card-photo';
            if (brew.photo) safeSetImage(img, brew.photo);

            const titleEl = document.createElement('h3');
            titleEl.className = 'brew-title';
            titleEl.textContent = brew.title || 'Untitled brew';

            const subtitleEl = document.createElement('p');
            subtitleEl.className = 'brew-subtitle';

            const dateStr = formatDateShort(brew.dateStarted);
            const abvStr = computeABV(brew.og, brew.fg);
            const bits = [];
            if (dateStr) bits.push(dateStr);
            if (abvStr) bits.push(abvStr);
            subtitleEl.textContent = bits.join(' • ');

            const meta = document.createElement('div');
            meta.className = 'brew-meta';
            if (brew.vessel) {
                const chip = document.createElement('span');
                chip.textContent = brew.vessel;
                meta.appendChild(chip);
            }
            if (brew.sku) {
                const chip = document.createElement('span');
                chip.textContent = `SKU: ${brew.sku}`;
                meta.appendChild(chip);
            }

            const delBtn = document.createElement('button');
            delBtn.className = 'card-delete-btn';
            delBtn.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <path d="M9 10v8m6-8v8M5 7h14M10 4h4a1 1 0 0 1 1 1v2H9V5a1 1 0 0 1 1-1z"
                          fill="none" stroke="currentColor" stroke-width="1.6"
                          stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            `;
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openDeleteConfirm(brew.id);
            });

            card.appendChild(img);
            card.appendChild(titleEl);
            card.appendChild(subtitleEl);
            card.appendChild(meta);
            card.appendChild(delBtn);

            card.addEventListener('click', () => {
                openBrewModal(brew.id);
            });

            brewGrid.appendChild(card);
        });
    }

    // ------------------------------------------------------------
    // MODAL OPEN/CLOSE
    // ------------------------------------------------------------

    function openBackdrop() {
        modalBackdrop.classList.remove('hidden');
        requestAnimationFrame(() => {
            modalBackdrop.classList.add('active');
        });
    }

    function closeBackdrop() {
        modalBackdrop.classList.remove('active');
        setTimeout(() => {
            modalBackdrop.classList.add('hidden');
        }, 200);
    }

    function openBrewModal(id) {
        const brew = id ? findBrew(id) : null;
        if (brew) {
            currentBrewId = brew.id;
            fillModalFromBrew(brew);
        } else {
            currentBrewId = null;
            clearModal();
        }

        brewModal.classList.remove('hidden');
        requestAnimationFrame(() => {
            brewModal.classList.add('open');
        });
        openBackdrop();
    }

    function closeBrewModal() {
        brewModal.classList.remove('open');
        setTimeout(() => {
            brewModal.classList.add('hidden');
        }, 200);
        closeBackdrop();
    }

    // ------------------------------------------------------------
    // MODAL CONTENT MANAGEMENT
    // ------------------------------------------------------------

    function clearModal() {
        modalTitle.textContent = 'New Brew';
        modalPhoto.removeAttribute('src');

        titleInput.value = '';
        skuInput.value = '';
        vesselSelect.value = '';

        ingredientList.innerHTML = '';
        rackingList.innerHTML = '';

        dateStartedInput.value = '';
        ogInput.value = '';
        notesStartInput.value = '';

        bottlingDateInput.value = '';
        fgInput.value = '';
        notesFinalInput.value = '';
    }

    function fillModalFromBrew(brew) {
        modalTitle.textContent = brew.title || 'Untitled brew';

        if (brew.photo) safeSetImage(modalPhoto, brew.photo);
        else modalPhoto.removeAttribute('src');

        titleInput.value = brew.title || '';
        skuInput.value = brew.sku || '';
        vesselSelect.value = brew.vessel || '';

        ingredientList.innerHTML = '';
        (brew.ingredients || []).forEach(ing => addIngredientRow(ing));

        rackingList.innerHTML = '';
        (brew.racking || []).forEach(r => addRackingRow(r));

        dateStartedInput.value = brew.dateStarted || '';
        ogInput.value = brew.og || '';
        notesStartInput.value = brew.notesStart || '';

        bottlingDateInput.value = brew.bottlingDate || '';
        fgInput.value = brew.fg || '';
        notesFinalInput.value = brew.notesFinal || '';
    }

    function collectBrewFromModal() {
        const ingredients = [];
        ingredientList.querySelectorAll('.ingredient-row').forEach(row => {
            const qty = row.querySelector('.ing-qty').value.trim();
            const unit = row.querySelector('.ing-unit').value;
            const name = row.querySelector('.ing-name').value.trim();
            if (!qty && !unit && !name) return;
            ingredients.push({ quantity: qty, unit, name });
        });

        const racking = [];
        rackingList.querySelectorAll('.racking-row').forEach(row => {
            const date = row.querySelector('.rack-date').value.trim();
            const notes = row.querySelector('.rack-notes').value.trim();
            if (!date && !notes) return;
            racking.push({ date, notes });
        });

        return {
            id: currentBrewId || generateId(),
            title: titleInput.value.trim(),
            sku: skuInput.value.trim(),
            vessel: vesselSelect.value,
            photo: modalPhoto.getAttribute('src') || '',
            ingredients,
            dateStarted: dateStartedInput.value,
            og: ogInput.value.trim(),
            notesStart: notesStartInput.value.trim(),
            racking,
            bottlingDate: bottlingDateInput.value,
            fg: fgInput.value.trim(),
            notesFinal: notesFinalInput.value.trim()
        };
    }

    // ------------------------------------------------------------
    // INGREDIENT + RACKING ROWS
    // ------------------------------------------------------------

    function createUnitSelect(value = '') {
        const select = document.createElement('select');
        select.className = 'pill-select ing-unit';
        const units = [
            '', 'g', 'kg', 'mg',
            'ml', 'L',
            'tsp', 'tbsp',
            'oz', 'fl oz',
            'lb', 'gal',
            'cup', 'pint', 'quart'
        ];
        units.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u;
            opt.textContent = u || 'Unit';
            select.appendChild(opt);
        });
        if (value && units.includes(value)) {
            select.value = value;
        }
        return select;
    }

    function addIngredientRow(data = {}) {
        const row = document.createElement('div');
        row.className = 'ingredient-row';

        const qtyInput = document.createElement('input');
        qtyInput.className = 'pill-input ing-qty';
        qtyInput.placeholder = 'Qty';
        qtyInput.value = data.quantity || '';

        const unitSelect = createUnitSelect(data.unit || '');

        const nameInput = document.createElement('input');
        nameInput.className = 'pill-input ing-name';
        nameInput.placeholder = 'Ingredient';
        nameInput.value = data.name || '';

        const delBtn = document.createElement('button');
        delBtn.className = 'row-delete-btn';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', () => {
            row.remove();
        });

        row.appendChild(qtyInput);
        row.appendChild(unitSelect);
        row.appendChild(nameInput);
        row.appendChild(delBtn);

        ingredientList.appendChild(row);
    }

    function addRackingRow(data = {}) {
        const row = document.createElement('div');
        row.className = 'racking-row';

        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.className = 'pill-input rack-date';
        dateInput.value = data.date || '';

        const notesInput = document.createElement('input');
        notesInput.className = 'pill-input rack-notes';
        notesInput.placeholder = 'Notes';
        notesInput.value = data.notes || '';

        const delBtn = document.createElement('button');
        delBtn.className = 'row-delete-btn';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', () => {
            row.remove();
        });

        row.appendChild(dateInput);
        row.appendChild(notesInput);
        row.appendChild(delBtn);

        rackingList.appendChild(row);
    }

    // ------------------------------------------------------------
    // PHOTO HANDLING
    // ------------------------------------------------------------

    changePhotoBtn.addEventListener('click', () => {
        resetFileInput(photoInput);
        photoInput.click();
    });

    photoInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            safeSetImage(modalPhoto, reader.result);
            resetFileInput(photoInput);
        };
        reader.readAsDataURL(file);
    });

    // ------------------------------------------------------------
    // SAVE / DUPLICATE / SCALE / DELETE
    // ------------------------------------------------------------

    function saveCurrentBrew() {
        const brew = collectBrewFromModal();
        const existingIndex = brews.findIndex(b => b.id === brew.id);

        if (existingIndex >= 0) {
            brews[existingIndex] = brew;
        } else {
            brews.push(brew);
        }

        currentBrewId = brew.id;
        modalTitle.textContent = brew.title || 'Untitled brew';
        renderGrid();
        saveToStorage();
    }

    function duplicateCurrentBrew() {
        if (!currentBrewId) return;
        const original = findBrew(currentBrewId);
        if (!original) return;

        const base = collectBrewFromModal();
        const idx = brews.findIndex(b => b.id === original.id);
        if (idx >= 0) brews[idx] = base;

        const copy = cloneBrew(base);
        copy.id = generateId();
        copy.title = (copy.title || 'Untitled brew') + ' (Copy)';
        brews.push(copy);

        renderGrid();
        openBrewModal(copy.id);
        saveToStorage();
    }

    function applyScaleFactor(factor) {
        if (!currentBrewId) return;
        const original = findBrew(currentBrewId);
        if (!original) return;

        const base = collectBrewFromModal();
        const idx = brews.findIndex(b => b.id === original.id);
        if (idx >= 0) brews[idx] = base;

        const scaled = cloneBrew(base);
        scaled.id = generateId();
        scaled.title = (scaled.title || 'Untitled brew') + ' scaled';
        scaleIngredientsForBrew(scaled, factor);

        brews.push(scaled);
        currentBrewId = scaled.id;

        fillModalFromBrew(scaled);
        renderGrid();
        saveToStorage();
    }

    // ------------------------------------------------------------
    // SCALE MODAL
    // ------------------------------------------------------------

    function openScaleModal() {
        scaleModal.classList.remove('hidden');
        requestAnimationFrame(() => {
            scaleModal.classList.add('open');
        });
        openBackdrop();
    }

    function closeScaleModal() {
        scaleModal.classList.remove('open');
        setTimeout(() => {
            scaleModal.classList.add('hidden');
        }, 200);
        closeBackdrop();
    }

    scaleModal.addEventListener('click', (e) => {
        const btn = e.target.closest('.scale-option');
        if (!btn) return;

        const action = btn.dataset.action;
        const factorAttr = btn.dataset.factor;

        if (action === 'cancel') {
            closeScaleModal();
            return;
        }

        if (action === 'custom') {
            const input = prompt('Enter scale factor (e.g. 1.5, 2, 3.5):', '2');
            if (!input) {
                closeScaleModal();
                return;
            }
            const factor = parseFloat(input);
            if (!factor || !Number.isFinite(factor) || factor <= 0) {
                alert('Invalid scale factor.');
                closeScaleModal();
                return;
            }
            applyScaleFactor(factor);
            closeScaleModal();
            return;
        }

        if (factorAttr) {
            const factor = parseFloat(factorAttr);
            if (factor && Number.isFinite(factor)) {
                applyScaleFactor(factor);
            }
            closeScaleModal();
        }
    });

    // ------------------------------------------------------------
    // DELETE CONFIRMATION
    // ------------------------------------------------------------

    function openDeleteConfirm(id) {
        const brew = findBrew(id);
        if (!brew) return;
        pendingDeleteId = id;
        deleteMessage.textContent = `Are you sure you want to delete “${brew.title || 'Untitled brew'}”?`;

        deleteModal.classList.remove('hidden');
        requestAnimationFrame(() => {
            deleteModal.classList.add('open');
        });
        openBackdrop();
    }

    function closeDeleteConfirm() {
        deleteModal.classList.remove('open');
        setTimeout(() => {
            deleteModal.classList.add('hidden');
        }, 200);
        closeBackdrop();
        pendingDeleteId = null;
    }

    function performDelete() {
        if (!pendingDeleteId) {
            closeDeleteConfirm();
            return;
        }

        const id = pendingDeleteId;
        const card = brewGrid.querySelector(`.brew-card[data-id="${id}"]`);
        if (card) {
            card.classList.add('deleting');
        }

        setTimeout(() => {
            brews = brews.filter(b => b.id !== id);

            if (currentBrewId === id) {
                currentBrewId = null;
                clearModal();
                closeBrewModal();
            }

            renderGrid();
            saveToStorage();
        }, 180);

        closeDeleteConfirm();
    }

    // ------------------------------------------------------------
    // EVENT LISTENERS
    // ------------------------------------------------------------

    newBrewBtn.addEventListener('click', () => {
        openBrewModal(null);
    });

    closeModalBtn.addEventListener('click', () => {
        closeBrewModal();
    });

    modalBackdrop.addEventListener('click', () => {
        if (scaleModal.classList.contains('open')) {
            closeScaleModal();
        } else if (deleteModal.classList.contains('open')) {
            closeDeleteConfirm();
        } else if (brewModal.classList.contains('open')) {
            closeBrewModal();
        }
    });

    saveBrewBtn.addEventListener('click', () => {
        saveCurrentBrew();
        closeBrewModal();
    });

    duplicateBrewBtn.addEventListener('click', () => {
        duplicateCurrentBrew();
    });

    openScaleBtn.addEventListener('click', () => {
        openScaleModal();
    });

    addIngredientBtn.addEventListener('click', () => {
        addIngredientRow();
    });

    addRackingStageBtn.addEventListener('click', () => {
        addRackingRow();
    });

    cancelDeleteBtn.addEventListener('click', () => {
        closeDeleteConfirm();
    });

    confirmDeleteBtn.addEventListener('click', () => {
        performDelete();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (scaleModal.classList.contains('open')) {
                closeScaleModal();
            } else if (deleteModal.classList.contains('open')) {
                closeDeleteConfirm();
            } else if (brewModal.classList.contains('open')) {
                closeBrewModal();
            }
        }
    });

    // ------------------------------------------------------------
    // LOCAL STORAGE
    // ------------------------------------------------------------

    function saveToStorage() {
        localStorage.setItem('brews', JSON.stringify(brews));
    }

    function loadFromStorage() {
        const raw = localStorage.getItem('brews');
        if (!raw) return;
        try {
            brews = JSON.parse(raw);
        } catch (e) {
            brews = [];
        }
    }

    // ------------------------------------------------------------
    // INITIAL LOAD + DEMO SEED
    // ------------------------------------------------------------

    loadFromStorage();

    if (!brews.length) {
        brews = [
            {
                id: generateId(),
                title: 'Strawberry Cider',
                sku: 'SC-001',
                vessel: '10L bucket fermenter',
                photo: '',
                ingredients: [
                    { quantity: '2', unit: 'kg', name: 'Strawberries' },
                    { quantity: '1', unit: 'kg', name: 'Sugar' },
                    { quantity: '5', unit: 'g', name: 'Yeast' }
                ],
                dateStarted: '',
                og: '1.050',
                notesStart: '',
                racking: [],
                bottlingDate: '',
                fg: '1.010',
                notesFinal: ''
            }
        ];
        saveToStorage();
    }

    renderGrid();

}); // END DOMContentLoaded
