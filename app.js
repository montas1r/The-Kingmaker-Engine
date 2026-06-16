let peopleIds = [];
let currentPhase = 1; 
let state = {};
let nodePositions = {};
let isAutoVoting = false;

// Token tracking engine to completely eliminate background thread leaks
let currentExecutionToken = 0;

const canvasSize = 600;
const centerX = canvasSize / 2;
const centerY = canvasSize / 2;
const nodeRadius = 22;
const rowHeight = 46; 

const presets = {
    corporate: {
        size: 7,
        desc: "Hierarchical Cascade: Low ranks funnel power upwards. The peak executive points back to a baseline node, flipping the structure downstream.",
        votes: { 'A':'G', 'B':'A', 'C':'A', 'D':'B', 'E':'B', 'F':'C', 'G':'D' }
    },
    tribal: {
        size: 8,
        desc: "Echo Chambers: Faction 1 (A,B,C) locks a permanent loop. Faction 2 routes all votes into dictator E, whose power shifts completely out.",
        votes: { 'A':'B', 'B':'C', 'C':'A', 'D':'A', 'E':'F', 'F':'G', 'G':'H', 'H':'E' }
    },
    duopoly: {
        size: 6,
        desc: "Bipartisan Duopoly: Members split backing to two primary figures. Those two primary figures vote exclusively for each other.",
        votes: { 'A':'B', 'B':'A', 'C':'A', 'D':'A', 'E':'B', 'F':'B' }
    },
    coalition: {
        size: 7,
        desc: "Outcast Coalition: The unvoted basement tier nodes all pool their raw weights into a single unranked item to stage a phase-2 structural overthrow.",
        votes: { 'A':'B', 'B':'C', 'C':'A', 'D':'G', 'E':'G', 'F':'G', 'G':'A' }
    },
    cascade: {
        size: 6,
        desc: "Linear Cascade Line: Power steps strictly in a sequential chain from A to F, pooling points directly into the terminal sink asset.",
        votes: { 'A':'B', 'B':'C', 'C':'D', 'D':'E', 'E':'F', 'F':'A' }
    }
};

function cancelActiveOperations() {
    currentExecutionToken++; 
    isAutoVoting = false;
}

function setupPopulation(n, presetVotes = null) {
    peopleIds = [];
    state = {};
    
    for (let i = 0; i < n; i++) {
        const id = n <= 26 ? String.fromCharCode(65 + i) : `N${i+1}`;
        peopleIds.push(id);
    }

    peopleIds.forEach((id, index) => {
        let target = peopleIds[(index + 1) % peopleIds.length];
        if (presetVotes && presetVotes[id]) {
            target = presetVotes[id];
        }
        state[id] = { id: id, votesFor: target, p1Score: 0, p2Score: 0, rank: 1 };
    });

    recalculateGeometry(n);
}

function recalculateGeometry(n) {
    nodePositions = {};
    const dynamicRadius = Math.min(220, 130 + (n * 5));
    
    peopleIds.forEach((id, index) => {
        const angle = (index * 2 * Math.PI) / peopleIds.length - Math.PI / 2;
        nodePositions[id] = {
            x: centerX + dynamicRadius * Math.cos(angle),
            y: centerY + dynamicRadius * Math.sin(angle)
        };
    });
}

function initControls() {
    const container = document.getElementById('voteInputsContainer');
    container.innerHTML = '';
    
    peopleIds.forEach(id => {
        const row = document.createElement('div');
        row.className = 'vote-row';
        
        const label = document.createElement('span');
        label.innerText = `Node ${id}`;
        
        const select = document.createElement('select');
        select.id = `select-${id}`;
        
        peopleIds.forEach(targetId => {
            if (id !== targetId) { 
                const opt = document.createElement('option');
                opt.value = targetId;
                opt.innerText = `Node ${targetId}`;
                if (state[id].votesFor === targetId) opt.selected = true;
                select.appendChild(opt);
            }
        });

        select.addEventListener('change', (e) => {
            cancelActiveOperations();
            state[id].votesFor = e.target.value;
            document.getElementById('scenarioSelect').value = 'custom';
            document.getElementById('scenarioDesc').innerText = "Custom user layout configuration.";
            resetControlsState(1);
            calculateSystemState();
            render();
        });

        row.appendChild(label);
        row.appendChild(select);
        container.appendChild(row);
    });
}

function calculateSystemState() {
    peopleIds.forEach(id => {
        state[id].p1Score = 0;
        // Do not wipe out p2Score here if we are actively building it up in Phase 2 loops
        if (currentPhase === 1) {
            state[id].p2Score = 0;
        }
    });

    peopleIds.forEach(voterId => {
        const target = state[voterId].votesFor;
        if(state[target]) state[target].p1Score += 1;
    });

    if (currentPhase === 2 && !isAutoVoting) {
        peopleIds.forEach(voterId => {
            const target = state[voterId].votesFor;
            const transferValue = state[voterId].p1Score; 
            if(state[target]) state[target].p2Score += transferValue;
        });
    }
}

function resetControlsState(targetPhase) {
    currentPhase = targetPhase;
    const isP1 = currentPhase === 1;
    
    document.getElementById('togglePhaseBtn').innerText = isP1 ? 'Run Phase 2' : 'Return to Phase 1';
    document.getElementById('togglePhaseBtn').disabled = false;
    document.getElementById('phaseIndicator').innerText = isP1 ? 'Phase 1: Raw Baseline Seeds' : 'Phase 2: Recalculated Matrix Flow';
    
    document.getElementById('groupSizeInput').disabled = false;
    document.getElementById('updateSizeBtn').disabled = false;
    document.getElementById('scenarioSelect').disabled = false;
    
    peopleIds.forEach(id => {
        const el = document.getElementById(`select-${id}`);
        if (el) el.disabled = false;
    });
}

async function runAutoVote() {
    cancelActiveOperations(); 
    isAutoVoting = true;
    
    const myToken = currentExecutionToken; 

    currentPhase = 1;
    document.getElementById('scenarioSelect').value = 'custom';
    document.getElementById('scenarioDesc').innerText = "Processing automated randomized structural allocation...";
    document.getElementById('togglePhaseBtn').innerText = 'Run Phase 2';
    document.getElementById('phaseIndicator').innerText = 'Phase 1: Raw Baseline Seeds';
    
    document.getElementById('togglePhaseBtn').disabled = true;
    document.getElementById('groupSizeInput').disabled = true;
    document.getElementById('updateSizeBtn').disabled = true;
    document.getElementById('scenarioSelect').disabled = true;

    // CRITICAL FIX: Ensure dropdown elements are completely re-enabled before selecting values
    peopleIds.forEach(id => {
        const el = document.getElementById(`select-${id}`);
        if (el) el.disabled = false;
    });

    // Flush all calculation data cleanly before rolling random weights
    peopleIds.forEach(id => {
        state[id].p1Score = 0;
        state[id].p2Score = 0;
    });

    for (let i = 0; i < peopleIds.length; i++) {
        if (currentExecutionToken !== myToken) return; 

        const voterId = peopleIds[i];
        const validTargets = peopleIds.filter(id => id !== voterId);
        const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
        
        state[voterId].votesFor = randomTarget;
        const selectEl = document.getElementById(`select-${voterId}`);
        if (selectEl) selectEl.value = randomTarget;

        calculateSystemState();
        render();
        
        await new Promise(resolve => setTimeout(resolve, 600));
    }

    if (currentExecutionToken !== myToken) return;

    document.getElementById('scenarioDesc').innerText = "Randomized computational auto-allocations completed.";
    isAutoVoting = false;
    resetControlsState(1);
}

function applyPreset(presetKey) {
    cancelActiveOperations();
    if (presetKey === 'custom') return;
    const preset = presets[presetKey];
    
    document.getElementById('groupSizeInput').value = preset.size;
    document.getElementById('scenarioDesc').innerText = preset.desc;
    
    setupPopulation(preset.size, preset.votes);
    initControls();
    resetControlsState(1);
    calculateSystemState();
    render(true); 
}

async function togglePhase() {
    cancelActiveOperations();
    const myToken = currentExecutionToken;

    if (currentPhase === 1) {
        currentPhase = 2;
        document.getElementById('togglePhaseBtn').innerText = 'Processing Matrix...';
        document.getElementById('togglePhaseBtn').disabled = true;
        document.getElementById('phaseIndicator').innerText = 'Phase 2: Calculating Matrix Flow...';
        
        const elementsToDisable = ['groupSizeInput', 'updateSizeBtn', 'scenarioSelect'];
        elementsToDisable.forEach(id => document.getElementById(id).disabled = true);
        peopleIds.forEach(id => {
            const el = document.getElementById(`select-${id}`);
            if (el) el.disabled = true;
        });

        peopleIds.forEach(id => { state[id].p2Score = 0; });
        render(); 
        await new Promise(resolve => setTimeout(resolve, 400));

        for (let i = 0; i < peopleIds.length; i++) {
            if (currentExecutionToken !== myToken) return; 

            const voterId = peopleIds[i];
            const target = state[voterId].votesFor;
            const transferValue = state[voterId].p1Score; 
            
            if (state[target] && transferValue > 0) {
                state[target].p2Score += transferValue;
                render();
                await new Promise(resolve => setTimeout(resolve, 600));
            }
        }

        if (currentExecutionToken !== myToken) return;
        resetControlsState(2);

    } else {
        resetControlsState(1);
        calculateSystemState();
        render();
    }
}

function render(forceRebuildList = false) {
    const linksGroup = document.getElementById('linksGroup');
    const nodesGroup = document.getElementById('nodesGroup');
    
    linksGroup.innerHTML = '';
    nodesGroup.innerHTML = '';

    const maxP1 = Math.max(...peopleIds.map(p => state[p].p1Score));
    const maxP2 = Math.max(...peopleIds.map(p => state[p].p2Score));
    const activeMax = currentPhase === 1 ? maxP1 : maxP2;

    // Canvas Straight Vector Paths with Offset Shift Engine
    peopleIds.forEach(voterId => {
        const targetId = state[voterId].votesFor;
        if (!nodePositions[voterId] || !nodePositions[targetId]) return;
        
        const fromPos = nodePositions[voterId];
        const toPos = nodePositions[targetId];

        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;

        // Unit Direction Vectors
        const ux = dx / distance;
        const uy = dy / distance;

        // Perpendicular Normals for Horizontal/Vertical Lateral Translation
        const nx = -uy;
        const ny = ux;

        // Apply a strict 8px sideways shift if nodes point at each other to avoid clipping
        const isBidirectional = state[targetId] && state[targetId].votesFor === voterId;
        const lateralOffset = isBidirectional ? 8 : 0;

        // Compute offset start/endpoints shifting straight outwards along edge rings
        const x1 = fromPos.x + ux * nodeRadius + nx * lateralOffset;
        const y1 = fromPos.y + uy * nodeRadius + ny * lateralOffset;
        const x2 = toPos.x - ux * (nodeRadius + 4) + nx * lateralOffset; 
        const y2 = toPos.y - uy * (nodeRadius + 4) + ny * lateralOffset;

        // Simple line drawing syntax using standard path lines (M -> L)
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
        path.setAttribute('fill', 'none');
        
        if (currentPhase === 1) {
            path.setAttribute('stroke', '#f8fafc');
            path.setAttribute('stroke-width', '1.5');
            path.setAttribute('marker-end', 'url(#arrow-p1)');
        } else {
            const weight = state[voterId].p1Score;
            if (weight === 0) {
                path.setAttribute('stroke', '#334155');
                path.setAttribute('stroke-width', '1');
                path.setAttribute('stroke-dasharray', '3,3');
                path.setAttribute('marker-end', 'url(#arrow-dead)');
            } else {
                path.setAttribute('stroke', '#3b82f6');
                path.setAttribute('stroke-width', 1.5 + weight * 1.25);
                path.setAttribute('marker-end', 'url(#arrow-p2)');
            }
        }
        path.className.baseVal = 'arrow-line';
        linksGroup.appendChild(path);
    });

    // Canvas Nodes
    peopleIds.forEach(id => {
        const pos = nodePositions[id];
        const item = state[id];
        const activeScore = currentPhase === 1 ? item.p1Score : item.p2Score;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', pos.x);
        circle.setAttribute('cy', pos.y);
        circle.setAttribute('r', nodeRadius);
        circle.className.baseVal = 'node-circle';
        
        if (activeScore === activeMax && activeMax > 0) {
            circle.classList.add('leader-active');
            circle.setAttribute('stroke', currentPhase === 1 ? '#f8fafc' : '#3b82f6');
        }

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', pos.x);
        label.setAttribute('y', pos.y - 2);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('fill', '#f8fafc');
        label.setAttribute('font-weight', '700');
        label.setAttribute('font-size', '11px');
        label.textContent = id;

        const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        valText.setAttribute('x', pos.x);
        valText.setAttribute('y', pos.y + 11);
        valText.setAttribute('text-anchor', 'middle');
        valText.setAttribute('fill', currentPhase === 1 ? '#64748b' : '#3b82f6');
        valText.setAttribute('font-size', '10px');
        valText.setAttribute('font-weight', '600');
        valText.textContent = activeScore;

        g.appendChild(circle);
        g.appendChild(label);
        g.appendChild(valText);
        nodesGroup.appendChild(g);
    });

    // Leaderboard List
    const listContainer = document.getElementById('leaderboardRowsContainer');
    
    const sortedData = [...peopleIds].sort((a, b) => {
        const scoreA = currentPhase === 1 ? state[a].p1Score : state[a].p2Score;
        const scoreB = currentPhase === 1 ? state[b].p1Score : state[b].p2Score;
        return (scoreB - scoreA) || a.localeCompare(b);
    });

    if (listContainer.children.length !== peopleIds.length || forceRebuildList) {
        listContainer.innerHTML = '';
        listContainer.style.height = `${sortedData.length * rowHeight}px`;
        
        sortedData.forEach((id, index) => {
            const row = document.createElement('div');
            row.className = 'leader-row';
            row.id = `lead-row-${id}`;
            row.style.position = 'absolute';
            row.style.width = '100%';
            row.style.transform = `translateY(${index * rowHeight}px)`;
            
            row.innerHTML = `
                <span class="node-name">Node ${id}</span>
                <span class="node-target" style="color: var(--text-muted);">➔ ${state[id].votesFor}</span>
                <span class="p1-val">${state[id].p1Score}</span>
                <span class="p2-val" style="color: var(--text-muted);">${state[id].p2Score}</span>
            `;
            listContainer.appendChild(row);
        });
        return;
    }

    sortedData.forEach((id, index) => {
        const row = document.getElementById(`lead-row-${id}`);
        if (!row) return;

        row.style.transitionDelay = `${index * 40}ms`;
        row.style.transform = `translateY(${index * rowHeight}px)`;
        
        row.querySelector('.node-target').innerText = `➔ ${state[id].votesFor}`;
        row.querySelector('.p1-val').innerText = state[id].p1Score;
        
        const p2Span = row.querySelector('.p2-val');
        p2Span.innerText = state[id].p2Score;
        p2Span.style.color = state[id].p2Score > 0 ? 'var(--color-p2)' : 'var(--text-muted)';

        const activeScore = currentPhase === 1 ? state[id].p1Score : state[id].p2Score;
        if (index === 0 && activeScore === activeMax && activeMax > 0) {
            row.classList.add('rank-king');
        } else {
            row.classList.remove('rank-king');
        }
    });
}
window.onload = () => {
    setupPopulation(6);
    initControls();
    calculateSystemState();
    render(true);

    document.getElementById('togglePhaseBtn').addEventListener('click', togglePhase);
    document.getElementById('autoVoteBtn').addEventListener('click', runAutoVote);
    document.getElementById('scenarioSelect').addEventListener('change', (e) => applyPreset(e.target.value));
    
    document.getElementById('resetBtn').addEventListener('click', () => {
        cancelActiveOperations();
        document.getElementById('scenarioSelect').value = 'custom';
        document.getElementById('scenarioDesc').innerText = "Custom user layout configuration.";
        setupPopulation(parseInt(document.getElementById('groupSizeInput').value) || 6);
        initControls();
        resetControlsState(1);
        calculateSystemState();
        render(true);
    });

    document.getElementById('updateSizeBtn').addEventListener('click', () => {
        cancelActiveOperations();
        document.getElementById('scenarioSelect').value = 'custom';
        document.getElementById('scenarioDesc').innerText = "Custom user layout configuration.";
        const sizeInput = document.getElementById('groupSizeInput');
        let val = parseInt(sizeInput.value);
        if (isNaN(val) || val < 3) val = 3;
        if (val > 20) val = 20; 
        sizeInput.value = val;
        
        setupPopulation(val);
        initControls();
        resetControlsState(1);
        calculateSystemState();
        render(true);
    });
};