// System Config and State Initialization
let peopleIds = [];
let currentPhase = 1; 
let state = {};
let nodePositions = {};

// Canvas geometry variables
const width = 600;
const height = 500;
const centerX = width / 2;
const centerY = height / 2;
const radius = 170;
const nodeRadius = 24;

// Generate identifiers dynamically based on user selection size
function setupPopulation(n) {
    peopleIds = [];
    state = {};
    
    for (let i = 0; i < n; i++) {
        // Fallback to P1, P2 style strings if n goes past English character limits
        const id = n <= 26 ? String.fromCharCode(65 + i) : `P${i+1}`;
        peopleIds.push(id);
    }

    // Default connection loop behavior to prevent broken rendering on initialization
    peopleIds.forEach((id, index) => {
        const nextTarget = peopleIds[(index + 1) % peopleIds.length];
        state[id] = { votesFor: nextTarget, p1Score: 0, p2Score: 0, rank: 1 };
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

// Initialize UI Elements Dropdown Inputs
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
            calculateSystemState();
            render();
        });

        row.appendChild(label);
        row.appendChild(select);
        container.appendChild(row);
    });
}

// Calculation System Core Logic
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

function togglePhase() {
    if (currentPhase === 1) {
        currentPhase = 2;
        document.getElementById('togglePhaseBtn').innerText = 'Back to Phase 1';
        document.getElementById('phaseBadge').innerText = 'Phase 2: Weighted Flow';
        document.getElementById('phaseBadge').className = 'phase-indicator phase-2-badge';
        document.getElementById('helpText').innerText = 'Phase 2 Active. Handles locked paths. Arrow sizes scale matching Phase 1 baseline values.';
        document.getElementById('groupSizeInput').disabled = true;
        document.getElementById('updateSizeBtn').disabled = true;
        
        peopleIds.forEach(id => {
            document.getElementById(`select-${id}`).disabled = true;
        });
    } else {
        currentPhase = 1;
        document.getElementById('togglePhaseBtn').innerText = 'Run Phase 2';
        document.getElementById('phaseBadge').innerText = 'Phase 1: Raw Seeds';
        document.getElementById('phaseBadge').className = 'phase-indicator phase-1-badge';
        document.getElementById('helpText').innerText = 'Phase 1 Active. Configure raw configurations manually.';
        document.getElementById('groupSizeInput').disabled = false;
        document.getElementById('updateSizeBtn').disabled = false;
        
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
    
    setupPopulation(parseInt(document.getElementById('groupSizeInput').value) || 6);
    initControls();
    calculateSystemState();
    render();
}

// Render Graphics Engine
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
        label.setAttribute('font-size', '12px');
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

// Global Event Listeners Setup
window.onload = () => {
    setupPopulation(6);
    initControls();
    calculateSystemState();
    render();

    document.getElementById('togglePhaseBtn').addEventListener('click', togglePhase);
    document.getElementById('resetBtn').addEventListener('click', resetSimulation);
    document.getElementById('updateSizeBtn').addEventListener('click', () => {
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