// System Config and State Initialization
const peopleIds = ['A', 'B', 'C', 'D', 'E', 'F'];
let currentPhase = 1; // 1 = Raw votes, 2 = Rank-weighted scores

// Initial state default setup to create an interesting pattern automatically
let state = {
    'A': { votesFor: 'B', p1Score: 0, p2Score: 0, rank: 1 },
    'B': { votesFor: 'C', p1Score: 0, p2Score: 0, rank: 1 },
    'C': { votesFor: 'A', p1Score: 0, p2Score: 0, rank: 1 },
    'D': { votesFor: 'A', p1Score: 0, p2Score: 0, rank: 4 },
    'E': { votesFor: 'B', p1Score: 0, p2Score: 0, rank: 4 },
    'F': { votesFor: 'C', p1Score: 0, p2Score: 0, rank: 4 }
};

// Graph geometry coordinates
const width = 600;
const height = 500;
const centerX = width / 2;
const centerY = height / 2;
const radius = 170;
const nodeRadius = 26;

const nodePositions = {};
peopleIds.forEach((id, index) => {
    const angle = (index * 2 * Math.PI) / peopleIds.length - Math.PI / 2;
    nodePositions[id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
    };
});

// Initialize UI Elements
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
            if (id !== targetId) { // Prevent self-voting
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

    document.getElementById('togglePhaseBtn').addEventListener('click', togglePhase);
    document.getElementById('resetBtn').addEventListener('click', resetSimulation);
}

// Calculation System Core Logic
function calculateSystemState() {
    // Reset scores
    peopleIds.forEach(id => {
        state[id].p1Score = 0;
        state[id].p2Score = 0;
    });

    // Calculate Phase 1 Raw Incoming Votes
    peopleIds.forEach(voterId => {
        const target = state[voterId].votesFor;
        if(state[target]) state[target].p1Score += 1;
    });

    // Process rankings dynamically based on Phase 1 scores
    const rankedList = [...peopleIds].sort((a, b) => state[b].p1Score - state[a].p1Score);
    rankedList.forEach((id, index) => {
        state[id].rank = index + 1;
    });

    // Calculate Phase 2 Network Inflow (Locked Tracks Engine)
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
        
        // Lock Inputs
        peopleIds.forEach(id => {
            document.getElementById(`select-${id}`).disabled = true;
        });
    } else {
        currentPhase = 1;
        document.getElementById('togglePhaseBtn').innerText = 'Run Phase 2';
        document.getElementById('phaseBadge').innerText = 'Phase 1: Raw Seeds';
        document.getElementById('phaseBadge').className = 'phase-indicator phase-1-badge';
        document.getElementById('helpText').innerText = 'Phase 1 Active. Configure raw configurations manually.';
        
        // Unlock Inputs
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
    
    peopleIds.forEach(id => {
        document.getElementById(`select-${id}`).disabled = false;
    });
    calculateSystemState();
    render();
}

// Render Graphics Engine (SVG Vector Map updates)
function render() {
    const svg = document.getElementById('networkSvg');
    const linksGroup = document.getElementById('linksGroup');
    const nodesGroup = document.getElementById('nodesGroup');
    
    linksGroup.innerHTML = '';
    nodesGroup.innerHTML = '';

    // 1. Render Path Vectors (Arrows)
    peopleIds.forEach(voterId => {
        const targetId = state[voterId].votesFor;
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

    // 2. Render Node Elements
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
        label.setAttribute('y', pos.y - 4);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('fill', '#ffffff');
        label.setAttribute('font-weight', 'bold');
        label.setAttribute('font-size', '14px');
        label.textContent = id;

        const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        valText.setAttribute('x', pos.x);
        valText.setAttribute('y', pos.y + 14);
        valText.setAttribute('text-anchor', 'middle');
        valText.setAttribute('fill', currentPhase === 1 ? '#38bdf8' : '#fbbf24');
        valText.setAttribute('font-size', '11px');
        valText.setAttribute('font-weight', '600');
        valText.textContent = `S: ${activeScore}`;

        g.appendChild(circle);
        g.appendChild(label);
        g.appendChild(valText);
        nodesGroup.appendChild(g);
    });

    // 3. Render Data Table Rows
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

// Boot system startup
window.onload = () => {
    initControls();
    calculateSystemState();
    render();
};