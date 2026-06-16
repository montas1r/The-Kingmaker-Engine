// System Config and State Initialization
let peopleIds = [];
let currentPhase = 1; 
let state = {};
let nodePositions = {};

const width = 600;
const height = 500;
const centerX = width / 2;
const centerY = height / 2;
const radius = 170;
const nodeRadius = 24;

// Preset Scenarios Data Dictionary
const presets = {
    corporate: {
        size: 7,
        desc: "Hierarchical Cascade: Low ranks funnel power upwards. The absolute peak executive points back to a baseline node, flipping the structure.",
        votes: { 'A':'G', 'B':'A', 'C':'A', 'D':'B', 'E':'B', 'F':'C', 'G':'D' }
    },
    tribal: {
        size: 8,
        desc: "Echo Chambers: Faction 1 (A,B,C) locks a permanent balanced loop. Faction 2 routes all votes into dictator E, whose power shifts away.",
        votes: { 'A':'B', 'B':'C', 'C':'A', 'D':'A', 'E':'F', 'F':'G', 'G':'H', 'H':'E' }
    },
    duopoly: {
        size: 6,
        desc: "Bipartisan Duopoly: Members split backing to two primary figures. Those two primary figures vote exclusively for each other, locking out the room.",
        votes: { 'A':'B', 'B':'A', 'C':'A', 'D':'A', 'E':'B', 'F':'B' }
    }
};

function setupPopulation(n, presetVotes = null) {
    peopleIds = [];
    state = {};
    
    for (let i = 0; i < n; i++) {
        const id = n <= 26 ? String.fromCharCode(65 + i) : `P${i+1}`;
        peopleIds.push(id);
    }

    peopleIds.forEach((id, index) => {
        let target = peopleIds[(index + 1) % peopleIds.length];
        if (presetVotes && presetVotes[id]) {
            target = presetVotes[id];
        }
        state[id] = { votesFor: target, p1Score: 0, p2Score: 0, rank: 1 };
    });

    recalculateGeometry();
}

function recalculateGeometry() {
    nodePositions = {};
    peopleIds.forEach((id, index) => {
        const angle = (index * 2 * Math.PI) / peopleIds.length - Math.PI / 2;
        nodePositions[id] = {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        };
    });
}

function initControls() {
    const container = document.getElementById('voteInputsContainer');
    container.innerHTML = '';
    
    peopleIds.forEach(id => {
        const row = document.createElement('div');
        row.className = 'vote-row';
        
        const label = document.createElement('label');
        label.innerText = `Person ${id} votes for:`;
        
        const select = document.createElement('select');
        select.id = `select-${id}`;
        
        peopleIds.forEach(targetId => {
            if (id !== targetId) { 
                const opt = document.createElement('option');
                opt.value = targetId;
                opt.innerText = `Person ${targetId}`;
                if (state[id].votesFor === targetId) opt.selected = true;
                select.appendChild(opt);
            }
        });

        select.addEventListener('change', (e) => {
            state[id].votesFor = e.target.value;
            document.getElementById('scenarioPresetSelect').value = 'custom';
            document.getElementById('scenarioDesc').innerText = "Custom user layout configuration.";
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
        state[id].p2Score = 0;
    });

    peopleIds.forEach(voterId => {
        const target = state[voterId].votesFor;
        if(state[target]) state[target].p1Score += 1;
    });

    const rankedList = [...peopleIds].sort((a, b) => state[b].p1Score - state[a].p1Score);
    rankedList.forEach((id, index) => {
        state[id].rank = index + 1;
    });

    peopleIds.forEach(voterId => {
        const target = state[voterId].votesFor;
        const transferValue = state[voterId].p1Score; 
        if(state[target]) state[target].p2Score += transferValue;
    });
}

function applyPreset(presetKey) {
    if (presetKey === 'custom') return;
    const preset = presets[presetKey];
    
    document.getElementById('groupSizeInput').value = preset.size;
    document.getElementById('scenarioDesc').innerText = preset.desc;
    
    setupPopulation(preset.size, preset.votes);
    initControls();
    calculateSystemState();
    render();
}

function togglePhase() {
    if (currentPhase === 1) {
        currentPhase = 2;
        document.getElementById('togglePhaseBtn').innerText = 'Back to Phase 1';
        document.getElementById('phaseBadge').innerText = 'Phase 2: Weighted Flow';
        document.getElementById('phaseBadge').className = 'phase-indicator phase-2-badge';
        document.getElementById('groupSizeInput').disabled = true;
        document.getElementById('updateSizeBtn').disabled = true;
        document.getElementById('scenarioPresetSelect').disabled = true;
        
        peopleIds.forEach(id => {
            document.getElementById(`select-${id}`).disabled = true;
        });
    } else {
        currentPhase = 1;
        document.getElementById('togglePhaseBtn').innerText = 'Run Phase 2';
        document.getElementById('phaseBadge').innerText = 'Phase 1: Raw Seeds';
        document.getElementById('phaseBadge').className = 'phase-indicator phase-1-badge';
        document.getElementById('groupSizeInput').disabled = false;
        document.getElementById('updateSizeBtn').disabled = false;
        document.getElementById('scenarioPresetSelect').disabled = false;
        
        peopleIds.forEach(id => {
            document.getElementById(`select-${id}`).disabled = false;
        });
    }
    render();
}

function resetSimulation() {
    currentPhase = 1;
    document.getElementById('togglePhaseBtn').innerText = 'Run Phase 2';
    document.getElementById('phaseBadge').innerText = 'Phase 1: Raw Seeds';
    document.getElementById('phaseBadge').className = 'phase-indicator phase-1-badge';
    document.getElementById('groupSizeInput').disabled = false;
    document.getElementById('updateSizeBtn').disabled = false;
    document.getElementById('scenarioPresetSelect').disabled = false;
    
    const currentPreset = document.getElementById('scenarioPresetSelect').value;
    if (currentPreset !== 'custom') {
        applyPreset(currentPreset);
    } else {
        setupPopulation(parseInt(document.getElementById('groupSizeInput').value) || 6);
        initControls();
        calculateSystemState();
        render();
    }
}

function render() {
    const linksGroup = document.getElementById('linksGroup');
    const nodesGroup = document.getElementById('nodesGroup');
    
    linksGroup.innerHTML = '';
    nodesGroup.innerHTML = '';

    peopleIds.forEach(voterId => {
        const targetId = state[voterId].votesFor;
        if (!nodePositions[voterId] || !nodePositions[targetId]) return;
        
        const fromPos = nodePositions[voterId];
        const toPos = nodePositions[targetId];

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromPos.x);
        line.setAttribute('y1', fromPos.y);
        line.setAttribute('x2', toPos.x);
        line.setAttribute('y2', toPos.y);
        
        if (currentPhase === 1) {
            line.setAttribute('stroke', '#38bdf8');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('marker-end', 'url(#arrowhead-p1)');
        } else {
            const weight = state[voterId].p1Score;
            if (weight === 0) {
                line.setAttribute('stroke', '#475569');
                line.setAttribute('stroke-width', '1');
                line.setAttribute('stroke-dasharray', '4,4');
                line.setAttribute('marker-end', 'url(#arrowhead-dead)');
            } else {
                line.setAttribute('stroke', '#fbbf24');
                line.setAttribute('stroke-width', 2 + weight * 1.5);
                line.setAttribute('marker-end', 'url(#arrowhead-p2)');
            }
        }
        line.className.baseVal = 'arrow-line';
        linksGroup.appendChild(line);
    });

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
        
        const maxScore = Math.max(...peopleIds.map(p => currentPhase === 1 ? state[p].p1Score : state[p].p2Score));
        if (activeScore === maxScore && maxScore > 0) {
            circle.classList.add('active-leader');
        }

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', pos.x);
        label.setAttribute('y', pos.y - 3);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('fill', '#ffffff');
        label.setAttribute('font-weight', 'bold');
        label.setAttribute('font-size', '11px');
        label.textContent = id;

        const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        valText.setAttribute('x', pos.x);
        valText.setAttribute('y', pos.y + 11);
        valText.setAttribute('text-anchor', 'middle');
        valText.setAttribute('fill', currentPhase === 1 ? '#38bdf8' : '#fbbf24');
        valText.setAttribute('font-size', '10px');
        valText.setAttribute('font-weight', '600');
        valText.textContent = `S: ${activeScore}`;

        g.appendChild(circle);
        g.appendChild(label);
        g.appendChild(valText);
        nodesGroup.appendChild(g);
    });

    const tbody = document.getElementById('leaderboardBody');
    tbody.innerHTML = '';
    
    const sorted = [...peopleIds].sort((a, b) => {
        const scoreA = currentPhase === 1 ? state[a].p1Score : state[a].p2Score;
        const scoreB = currentPhase === 1 ? state[b].p1Score : state[b].p2Score;
        return scoreB - scoreA;
    });

    sorted.forEach(id => {
        const tr = document.createElement('tr');
        if (currentPhase === 2 && state[id].p2Score === Math.max(...peopleIds.map(p => state[p].p2Score))) {
            tr.style.backgroundColor = 'rgba(251, 191, 36, 0.08)';
        }
        
        tr.innerHTML = `
            <td style="font-weight: bold;">Person ${id}</td>
            <td>➔ Person ${state[id].votesFor}</td>
            <td style="color: var(--accent-p1); font-weight: 600;">${state[id].p1Score}</td>
            <td style="color: var(--accent-p2); font-weight: 600;">${state[id].p2Score}</td>
            <td><span style="background: #475569; padding: 2px 6px; border-radius:4px; font-size:11px;">#${state[id].rank}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

window.onload = () => {
    setupPopulation(6);
    initControls();
    calculateSystemState();
    render();

    document.getElementById('togglePhaseBtn').addEventListener('click', togglePhase);
    document.getElementById('resetBtn').addEventListener('click', resetSimulation);
    document.getElementById('scenarioPresetSelect').addEventListener('change', (e) => applyPreset(e.target.value));
    document.getElementById('updateSizeBtn').addEventListener('click', () => {
        document.getElementById('scenarioPresetSelect').value = 'custom';
        document.getElementById('scenarioDesc').innerText = "Custom user layout configuration.";
        const sizeInput = document.getElementById('groupSizeInput');
        let val = parseInt(sizeInput.value);
        if (isNaN(val) || val < 3) val = 3;
        if (val > 20) val = 20; 
        sizeInput.value = val;
        
        setupPopulation(val);
        initControls();
        calculateSystemState();
        render();
    });
};